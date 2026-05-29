/**
 * API route: analyse a README document via NVIDIA NIM (GPT-OSS-120B).
 * Returns structured quality/SEO/completeness scores plus actionable suggestions.
 * Self-contained ESM — zero imports from /src.
 */

import { OpenAI } from 'openai';

const NIM_BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL || 'stepfun-ai/step-3.7-flash';
const NIM_KEY = process.env.NVIDIA_API_KEY || '';

const ANALYSIS_SYSTEM_PROMPT = `You are a senior technical documentation analyst.

Given the README below, return ONLY valid JSON (no markdown, no commentary) with this exact shape:

{
  "overallScore": number,
  "readabilityScore": number,
  "seoScore": number,
  "completenessScore": number,
  "wordCount": number,
  "estimatedReadTime": string,
  "sections": string[],
  "missingCriticalSections": string[],
  "strengths": string[],
  "improvements": string[],
  "suggestions": string[]
}

Scoring rules:
- overallScore, readabilityScore, seoScore, completenessScore MUST be integers from 0-100.
- wordCount MUST be an integer matching the README body word count.
- estimatedReadTime MUST be a human-readable string (e.g., "2 min read").
- sections MUST list every H1/H2 heading found in the README.
- missingCriticalSections MUST include only from: title,badges,description,installation,usage,configuration,contributing,license,banner.
- strengths, improvements, suggestions MUST be arrays of 3-8 concise strings each.
- Output must be parseable JSON. No markdown fences, no extra text.`;

export default async function handler(req, res) {
  try {
    if (!NIM_KEY) {
      return res.status(500).json({ error: 'NVIDIA_API_KEY is not set. Add it to api/.env.' });
    }

    const { content } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Missing required field: content (string)' });
    }

    const client = new OpenAI({ apiKey: NIM_KEY, baseURL: NIM_BASE });

    const completion = await client.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      max_tokens: 3000,
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Model returned non-JSON response', raw });
    }

    const result = {
      overallScore: Number(parsed.overallScore) ?? 0,
      readabilityScore: Number(parsed.readabilityScore) ?? 0,
      seoScore: Number(parsed.seoScore) ?? 0,
      completenessScore: Number(parsed.completenessScore) ?? 0,
      wordCount: Number(parsed.wordCount) ?? 0,
      estimatedReadTime: String(parsed.estimatedReadTime ?? ''),
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      missingCriticalSections: Array.isArray(parsed.missingCriticalSections) ? parsed.missingCriticalSections : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('analyse-readme error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
}
