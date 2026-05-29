/**
 * API route: generate README.md via NVIDIA NIM (GPT-OSS-120B + FLUX.2).
 * Fully self-contained ESM — uses projectContext sent by the CLI client.
 * No filesystem scanning — the client scans and sends all data.
 */

import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

const NIM_BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL || 'openai/gpt-oss-120b';
const IMG_URL = process.env.NVIDIA_IMAGE_URL || 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b';
const NIM_KEY = process.env.NVIDIA_API_KEY || '';

// banner generation (optional)
async function generateBanner(projectName) {
  if (!process.env.IMGBB_API_KEY || !NIM_KEY) return null;
  try {
    const resp = await fetch(IMG_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${NIM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Modern tech banner for "${projectName}". Minimalist dark theme, geometric background.`,
        cfg_scale: 7.5,
        seed: 42,
        steps: 20,
        width: 1200,
        height: 300,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.image || data?.output?.image || null;
  } catch {
    return null;
  }
}

// build prompt from client-provided projectContext
function buildSystemPrompt(ctx, extras) {
  const { bannerUrl } = extras;
  const name = ctx.projectName || 'my-project';
  const description = ctx.description || 'A cutting-edge software project.';
  const pkg = ctx.packageJson || {};

  const bannerLine = bannerUrl
    ? `![Banner](${bannerUrl})`
    : `![Banner](https://via.placeholder.com/1200x300/0d1117/38bdf8?text=${encodeURIComponent(name)})`;

  const folderStr = JSON.stringify(ctx.folderStructure || {}, null, 2);
  const filesBlock = (ctx.sourceFiles || [])
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n');

  return `You are a senior technical writer. Generate a world-class, visually stunning README.md for the project described below.

## Output Rules (CRITICAL)
- Output ONLY the final markdown. Zero explanatory text before or after.
- Use GitHub-Flavored Markdown (GFM) throughout.
- Start with a high-impact hero section: large project name (H1), concise one-liner tagline, and a row of relevant shields/badges.
- Include this banner: ${bannerLine}
- Structure the README with these ordered sections: Title + Badges → Banner → Description → Features → Installation → Usage → Configuration → Contributing → License.
- Use rich tables (| Column | Column |) with proper alignment for features, env vars, or dependency listings.
- Use fenced code blocks (\`\`\`) with the appropriate language tag for every code example.
- Include a "Quick Start" code snippet (one-liner install + run).
- Add emoji icons sparingly to section headers for visual rhythm.
- End with a prominent footer: **Built with ❤️ by [aryanshrai03](https://github.com/aryanshrai03)**
- Keep tone confident, concise, developer-focused. No filler.
- Note: This README was generated with NVIDIA NIM.

## Project Context
\`\`\`
Project name : ${name}
Description  : ${description}
${pkg.name ? `Package     : ${pkg.name}\n` : ''}${pkg.version ? `Version     : ${pkg.version}\n` : ''}${pkg.main ? `Main entry  : ${pkg.main}\n` : ''}Dependencies : ${pkg.dependencies ? Object.keys(pkg.dependencies).join(', ') : 'none'}
DevDeps      : ${pkg.devDependencies ? Object.keys(pkg.devDependencies).join(', ') : 'none'}
Scripts      : ${pkg.scripts ? Object.entries(pkg.scripts).map(([k, v]) => `${k}: ${v}`).join(' | ') : 'none'}
\`\`\`

## Folder Structure (2 levels)
\`\`\`
${folderStr}
\`\`\`

${
  filesBlock
    ? `## Source Files (first 150 lines each)\n${filesBlock}\n`
    : ''
}
Generate the README now.`;
}

// ── main export ────────────────────────────────────────────────────
export default async function handler(req, res) {
  const startTime = Date.now();
  try {
    if (!NIM_KEY) {
      return res.status(500).json({ error: 'NVIDIA_API_KEY is not set. Add it to api/.env.' });
    }

    // Parse the projectContext string sent by the CLI client
    let projectContext = {};
    try {
      projectContext = JSON.parse(req.body?.projectContext || '{}');
    } catch (_) {
      return res.status(400).json({ error: 'Invalid projectContext in request body' });
    }

    const name = projectContext.projectName || 'my-project';
    const bannerUrl = await generateBanner(name);
    const systemPrompt = buildSystemPrompt(projectContext, { bannerUrl });

    const client = new OpenAI({ apiKey: NIM_KEY, baseURL: NIM_BASE });

    const completion = await client.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the README.md file now.' },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const readme = completion.choices[0].message.content;
    const duration = Date.now() - startTime;

    res.status(200).json({ readme, duration, model: NIM_MODEL, provider: 'NVIDIA NIM' });
  } catch (err) {
    console.error('generate-readme error:', err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
