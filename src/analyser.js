/**
 * Analyse a README via NVIDIA NIM and return structured scores/suggestions.
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

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

Rules:
- overallScore, readabilityScore, seoScore, completenessScore MUST be integers from 0-100.
- wordCount MUST be an integer.
- estimatedReadTime MUST be a human-readable string (e.g., "2 min read").
- sections MUST list every H1/H2 heading found.
- missingCriticalSections from: title,badges,description,installation,usage,configuration,contributing,license,banner.
- strengths, improvements, suggestions MUST be arrays of 3-8 concise strings.
- Output must be parseable JSON. No markdown fences, no extra text.`;

export async function analyseReadme(filePath) {
  const fs = await import('fs-extra');
  const content = await fs.readFile(filePath, 'utf-8').catch(() => '');

  const spin = ora({ text: '🔍 Analysing README...', color: 'cyan' }).start();
  try {
    const resp = await fetch(`${BACKEND}/api/analyse-readme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!resp.ok) throw new Error(`Backend returned ${resp.status}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    spin.stop();
    return formatAnalysis(data);
  } catch (e) {
    spin.fail('Analysis failed');
    throw e;
  }
}

function formatAnalysis(data) {
  const scoreColor = data.overallScore >= 70 ? 'green' : data.overallScore >= 40 ? 'yellow' : 'red';
  const output =
    `📊 Overall Score: ${chalk[scoreColor](data.overallScore + '/100')}\n` +
    `📖 Readability:   ${data.readabilityScore}/100\n` +
    `🔍 SEO:          ${data.seoScore}/100\n` +
    `✅ Completeness:  ${data.completenessScore}/100\n` +
    `📝 Words:         ${data.wordCount}\n` +
    `⏱️  Read time:     ${data.estimatedReadTime}\n` +
    `\n📂 Sections: ${data.sections?.length > 0 ? data.sections.join(', ') : 'none'}\n` +
    `${data.missingCriticalSections?.length ? '⚠️  Missing: ' + data.missingCriticalSections.join(', ') : ''}\n` +
    `\n💪 Strengths:\n${(data.strengths || []).map(s => '  • ' + s).join('\n') || '  (none)'}\n` +
    `\n🔧 Improvements:\n${(data.improvements || []).map(s => '  • ' + s).join('\n') || '  (none)'}\n` +
    `\n💡 Suggestions:\n${(data.suggestions || []).map(s => '  • ' + s).join('\n') || '  (none)'}`;

  console.log(
    chalk.cyan(
      boxen(output, { padding: 1, borderColor: 'cyan', borderStyle: 'round' })
    )
  );
  return data;
}
