/**
 * GET /api/skills
 *
 * List mode:  /api/skills?list=true    → { skills: ["architecture","mindmap","vega","graphviz","cloud","tsconfig"] }
 * Fetch mode: /api/skills?type=vega    → { skill: "...raw SKILL.md content...", type: "vega" }
 * Missing mode:/api/skills?type=bogus   → { skill: null, type: "bogus", available: [...] }
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const SKILLS_DIR = path.resolve(process.cwd(), 'api', 'skills');

function getAvailableTypes() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  // Always include 'default' as the first skill
  return ['default', ...dirs.filter(d => d !== 'default').sort()];
}

function getSkillContent(type) {
  const skillPath = path.join(SKILLS_DIR, type, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return null;
  return fs.readFileSync(skillPath, 'utf-8');
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 's-maxage=3600, max-age=300');

  try {
    const { list, type } = req.query;

    if (list === 'true') {
      return res.status(200).json({ skills: getAvailableTypes() });
    }

    if (!type) {
      const available = getAvailableTypes();
      return res.status(200).json({ skill: null, available });
    }

    const skill = getSkillContent(type);
    const available = getAvailableTypes();

    if (!skill) {
      return res.status(200).json({ skill: null, type, available });
    }

    return res.status(200).json({ skill, type, available });
  } catch (err) {
    console.error('skills.js error:', err);
    res.status(500).json({ error: 'Failed to load skills' });
  }
}
