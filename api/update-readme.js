/**
 * API route: update an existing README via chat-style instructions.
 * Uses NVIDIA NIM (Step-3.7) via the OpenAI SDK.
 * Self-contained ESM — zero imports from /src.
 */

import { OpenAI } from 'openai';

const NIM_BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL || 'stepfun-ai/step-3.7-flash';
const NIM_KEY = process.env.NVIDIA_API_KEY || '';

const FILE_TYPE_HINTS = {
  readme: 'This is a README.md — maintain the standard structure (Title, Badges, Banner, Description, Features, Installation, Usage, Configuration, Contributing, License).',
  changelog: 'This is a CHANGELOG.md — use date-versioned entries with categories: Added, Changed, Fixed, Breaking.',
  contributing: 'This is a CONTRIBUTING.md — include dev environment setup, running tests, PR process, and code style guidelines.',
  documentation: 'This is a documentation file — structure with clear navigation, detailed code examples, and explanations.',
  'api-reference': 'This is an API reference — organize by endpoint with request/response examples, parameters, and status codes.',
  general: 'This is a general markdown file.',
};

function buildUpdateSystemPrompt(currentContent, instructions, conversationHistory, activeFile) {
  const historyBlock =
    Array.isArray(conversationHistory) && conversationHistory.length
      ? conversationHistory
          .map(m => `- ${m.role === 'user' ? 'User' : 'Assistant'}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
          .join('\n')
      : '(none)';

  const fileName = activeFile || 'unknown.md';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const base = ext === 'md' ? fileName.replace(/\.md$/, '').toLowerCase() : 'general';
  const fileTypeHint = FILE_TYPE_HINTS[base] || FILE_TYPE_HINTS.general;

  return `You are an expert technical writer and markdown editor.${fileTypeHint}

Your task is to produce an UPDATED version of the current markdown based on the user's instructions, while preserving the quality, structure, and tone of the original.

Guidelines:
- Apply only the requested changes; do not rewrite unrelated sections unless necessary for consistency.
- Keep the same section ordering and heading hierarchy unless explicitly asked to change it.
- Output ONLY the full updated markdown. Zero explanatory text before or after.

## Current Markdown
\`\`\`markdown
${currentContent}
\`\`\`

## Conversation History
${historyBlock}

## Latest Instruction
${instructions}

## Active File
${fileName}

Generate the updated markdown now.`;
}

export default async function handler(req, res) {
  try {
    if (!NIM_KEY) {
      return res.status(500).json({ error: 'NVIDIA_API_KEY is not set. Add it to api/.env.' });
    }

    const { currentContent, instructions, conversationHistory = [], activeFile } = req.body || {};
    if (!currentContent || !instructions) {
      return res.status(400).json({ error: 'Missing required fields: currentContent, instructions' });
    }

    const systemPrompt = buildUpdateSystemPrompt(currentContent, instructions, conversationHistory, activeFile);

    const client = new OpenAI({ apiKey: NIM_KEY, baseURL: NIM_BASE });

    const completion = await client.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Apply the requested changes and return the updated markdown.' },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const updatedReadme = completion.choices[0].message.content;
    res.status(200).json({ readme: updatedReadme });
  } catch (err) {
    console.error('update-readme error:', err);
    res.status(500).json({ error: err.message || 'Update failed' });
  }
}
