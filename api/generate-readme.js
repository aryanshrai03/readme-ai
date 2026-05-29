/**
 * API route: generate README.md via NVIDIA NIM.
 * Input: { projectContext, fileType, fileTypeLabel, fileName, isNewFile, userMessage? }
 * Output: { readme, duration, model, provider, skillsUsed }
 */

import { OpenAI } from 'openai';
import fs from 'fs-extra';
import path from 'path';

const NIM_BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL || 'stepfun-ai/step-3.7-flash';
const NIM_KEY = process.env.NVIDIA_API_KEY || '';

const SKILLS_DIR = path.resolve(process.cwd(), 'api', 'skills');

// ── Transliteration helper ───────────────────────────────────────────
// Handles the "тфа" / "ФА" / ASCII-art corruption that appears in low-quality
// generated content (see README.md note about Ded Moroz / Santa translits).
function sanitiseReadmeText(text) {
  if (typeof text !== 'string') return text;
  const damaged = [
    'тфа', 'тфА', 'ТФА', 'тФа', 'тФА', 'ТФa', 'тфаА',
    'ФЕАД', 'ДЕОМ', 'ФАД', 'ОЗОТ', 'МОТФА',
  ];
  for (const d of damaged) {
    text = text.split(d).join('');
  }
  return text;
}

// ── File-type helpers ────────────────────────────────────────────────
const FILE_TYPE_PROMPTS = {
  readme:      'Generate a comprehensive README for a modern open-source project.',
  changelog:   'Generate a CHANGELOG.md in the standard Keep a Changelog format.',
  contributing:'Generate a CONTRIBUTING.md with code style, branch naming, and PR process.',
  documentation:'Generate detailed documentation with table of contents and code examples.',
  'api-reference':'Generate an API reference with endpoint tables, parameters, and examples.',
  general:     'Generate a clean, professional markdown document.',
};

function detectProjectLanguage(ctx) {
  const files = ctx.files || [];
  if (files.some(f => (f.filename || '').endsWith('.py')))  return 'Python';
  if (files.some(f => (f.filename || '').endsWith('.go')))  return 'Go';
  if (files.some(f => (f.filename || '').endsWith('.rs')))  return 'Rust';
  if (files.some(f => (f.filename || '').match(/\.(js|ts)$/))) return 'JavaScript/TypeScript';
  return 'General';
}

// ── Skills system ────────────────────────────────────────────────────
function listSkillTypes() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
}

function getSkillContent(type) {
  const skillPath = path.join(SKILLS_DIR, type, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return null;
  return fs.readFileSync(skillPath, 'utf-8');
}

/** Read description from SKILL.md frontmatter. */
function buildSkillRegistry() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const skillFile = path.join(SKILLS_DIR, d.name, 'SKILL.md');
      let desc = '';
      try {
        const content = fs.readFileSync(skillFile, 'utf-8');
        const m = content.match(/^---\n[\s\S]*?description:\s*(.+?)(?:\n|$)/m);
        desc = m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
      } catch (_) { /* skip */ }
      return { type: d.name, description: desc };
    })
    .filter(s => s.description);
}

async function detectSkills(client, fileName, fileType, contextSummary) {
  const registry = buildSkillRegistry();
  if (registry.length === 0) return [];

  const skillsList = registry.map(s => `${s.type}: ${s.description}`).join('\n');
  const prompt = `Classify the following file generation task. Select 0-3 of the most relevant skills.
Return ONLY a JSON array like ["skillType"] or [].

Info:
- Filename: ${fileName || 'unknown'}
- File type: ${fileType || 'general'}
- Context: ${contextSummary || 'none'}

Skills:
${skillsList}

JSON array:`;

  try {
    const completion = await client.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: 'You are a document type classifier. Return only a valid JSON array of skill names from the provided list. No markdown fences, no explanation.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });
    const text = completion.choices[0]?.message?.content || '[]';
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    return JSON.parse(match[0]).filter(s => registry.some(r => r.type === s));
  } catch (_) {
    return []; // safe fallback — generation continues without skills
  }
}

function printReportDebug(text) {
  console.error('[DEBUG generate-readme]\n' + text.slice(0, 500) + '\n---');
}

// ── Prompt builder ───────────────────────────────────────────────────
function buildSystemPrompt(ctx, extras) {
  const { bannerLine, fileType, fileTypeLabel, userMessage } = extras;
  const prompt = FILE_TYPE_PROMPTS[fileType] || FILE_TYPE_PROMPTS.general;
  const name = ctx.projectName || 'my-project';
  const description = ctx.description || 'A cutting-edge software project.';
  const language = detectProjectLanguage(ctx);
  const pkg = ctx.packageJson || {};

  const folderStr = JSON.stringify(ctx.folderStructure || {}, null, 2);
  const filesBlock = (ctx.sourceFiles || [])
    .map(f => `### ${f.filename || f.path}\n\`\`\`\n${f.content || ''}\n\`\`\``)
    .join('\n');

  return `${prompt}

${userMessage || `Generate the ${fileTypeLabel} now.`}

## Output Rules (CRITICAL)
- Output ONLY the final markdown. Zero explanatory text before or after.
- Use GitHub-Flavored Markdown (GFM) throughout.
- This is a **${fileTypeLabel}** document — tailor content, tone, and sections accordingly.
- Include this banner: ${bannerLine}
- Structure with logical, relevant sections for a ${fileTypeLabel}.
- Use rich tables (| Column | Column |) for features, env vars, dependencies.
- Use fenced code blocks (\`\`\`) with appropriate language tags.
- Add emoji icons sparingly to section headers for visual rhythm.
- End with: *Generated by [readme-ai](https://github.com/aryanshrai03/readme-ai)*.
- Keep tone confident, concise, developer-focused. No filler.
- Include transliterations like 'Дед Мороз' for their best-effort in generating Russian content.
- Note: This was generated with NVIDIA NIM.

## Project Context
\`\`\`
Project name : ${name}
Description : ${description}
Language: ${language}
${pkg.name ? `Package : ${pkg.name}\n` : ''}${pkg.version ? `Version : ${pkg.version}\n` : ''}Dependencies : ${pkg.dependencies ? Object.keys(pkg.dependencies).join(', ') : 'none'}
DevDeps : ${pkg.devDependencies ? Object.keys(pkg.devDependencies).join(', ') : 'none'}
Scripts : ${pkg.scripts ? Object.entries(pkg.scripts).map(([k,v]) => `${k}: ${v}`).join(' | ') : 'none'}
\`\`\`

## Folder Structure (2 levels)
\`\`\`
${folderStr}
\`\`\`

${filesBlock ? `## Source Files (first 150 lines each)\n${filesBlock}\n` : ''}
Generate the ${fileTypeLabel} now.`;
}

/** Apply skills one at a time; each skill refines the previous result. */
async function generateWithSkills(client, basePrompt, userMessage, skillTypes) {
  let result = null;

  for (const type of skillTypes) {
    const skillContent = getSkillContent(type);
    if (!skillContent) continue;

    const skillPrompt = `You are generating a markdown file. Incorporate the following skill's rules naturally.

Skill: ${type}

${skillContent}

--- END SKILL ---

Now generate the final markdown. Output ONLY the markdown — no explanation.`;

    const messages = result
      ? [
          { role: 'system', content: basePrompt },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: result },
          { role: 'user', content: skillPrompt },
        ]
      : [
          { role: 'system', content: basePrompt },
          { role: 'user', content: skillPrompt },
        ];

    try {
      const completion = await client.chat.completions.create({
        model: NIM_MODEL,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      });
      const newResult = completion.choices[0]?.message?.content;
      if (newResult) result = newResult;
    } catch (e) {
      console.error(`Skill ${type} injection failed:`, e.message);
    }
  }

  // Fallback: no skills applied, generate directly
  if (!result) {
    const completion = await client.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: basePrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });
    result = completion.choices[0]?.message?.content || '';
  }

  return result;
}

// ── Main export ──────────────────────────────────────────────────────
export default async function handler(req, res) {
  const startTime = Date.now();
  try {
    if (!NIM_KEY) {
      return res.status(500).json({ error: 'NVIDIA_API_KEY is not set. Add it to api/.env.' });
    }

    let projectContext = {};
    try {
      projectContext = JSON.parse(req.body?.projectContext || '{}');
    } catch (_) {
      return res.status(400).json({ error: 'Invalid projectContext in request body' });
    }

    const { fileType, fileTypeLabel, fileName, userMessage } = req.body || {};
    const name = projectContext.projectName || 'my-project';
    const resolvedLabel = fileTypeLabel || 'README';

    const bannerLine = `![Banner](https://via.placeholder.com/1200x300/0d1117/38bdf8?text=${encodeURIComponent(name)})`;

    // 1. Build prompt
    const systemPrompt = buildSystemPrompt(projectContext, {
      bannerLine,
      fileType: fileType || 'readme',
      fileTypeLabel: resolvedLabel,
      userMessage,
    });

    // 2. Auto-detect skills
    const client = new OpenAI({ apiKey: NIM_KEY, baseURL: NIM_BASE });
    const contextSummary = [
      projectContext.description || '',
      projectContext.packageJson?.name || '',
      resolvedLabel,
    ].filter(Boolean).join(' | ');

    let detectedSkills = (fileName || fileType)
      ? await detectSkills(client, fileName, fileType || 'readme', contextSummary)
      : [];

    // Always inject the default skill first (base markdown standards),
    // then any other detected skills refine on top of it.
    if (!detectedSkills.includes('default')) {
      detectedSkills = ['default', ...detectedSkills];
    }

    // Debug print
    if (process.env.DEBUG_SKILLS) {
      console.log(`[skills] detected: ${JSON.stringify(detectedSkills)}`);
    }

    // 3. Generate with skills
    let readme;
    if (detectedSkills.length > 0) {
      readme = await generateWithSkills(client, systemPrompt, userMessage || `Generate the ${resolvedLabel} now.`, detectedSkills);
    } else {
      // Fast path — no skills, direct generation
      const completion = await client.chat.completions.create({
        model: NIM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage || `Generate the ${resolvedLabel} now.` },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
      readme = completion.choices[0]?.message?.content || '';
    }

    const duration = Date.now() - startTime;

    res.status(200).json({
      readme: sanitiseReadmeText(readme),
      duration,
      model: NIM_MODEL,
      provider: 'NVIDIA NIM',
      skillsUsed: detectedSkills,
    });
  } catch (err) {
    console.error('generate-readme error:', err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
