/**
 * API route: update an existing README via chat-style instructions.
 * Uses NVIDIA NIM (GPT-OSS-120B) via the OpenAI SDK.
 * Self-contained ESM — zero imports from /src.
 */

import { OpenAI } from 'openai';

const NIM_BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL || 'openai/gpt-oss-120b';
const NIM_KEY = process.env.NVIDIA_API_KEY || '';

function buildUpdateSystemPrompt(currentContent, instructions, conversationHistory) {
  const historyBlock =
    Array.isArray(conversationHistory) && conversationHistory.length
      ? conversationHistory
          .map(
            m =>
              `- ${m.role === 'user' ? 'User' : 'Assistant'}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
          )
          .join('\n')
      : '(none)';

  return `You are an expert technical writer and README maintainer.

Your task is to produce an UPDATED version of the current README based on the user's instructions, while preserving the quality, structure, and tone of the original.

Guidelines:
- Apply only the requested changes; do not rewrite unrelated sections unless necessary for consistency.
- Keep the same section ordering and heading hierarchy unless explicitly asked to change it.
- Output ONLY the full updated markdown. Zero explanatory text before or after.

## Current README
\`\`\`markdown
${currentContent}
\`\`\`

## Conversation History
${historyBlock}

## Latest Instruction
${instructions}

## Active File
${'activeFile'}

Generate the updated README now.`;
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

    const systemPrompt = buildUpdateSystemPrompt(currentContent, instructions, conversationHistory);

    const client = new OpenAI({ apiKey: NIM_KEY, baseURL: NIM_BASE });

    const completion = await client.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Apply the requested changes and return the updated README.' },
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
