/** Analyse a markdown file via NVIDIA NIM. Uses /api/analyse-readme backend endpoint. */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

export async function analyseReadme(filePath) {
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (_) {
    content = '';
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200)) + ' min read';

  if (!content.trim()) {
    return { scores: null };
  }

  const spin = ora({ text: '🔍 Analysing markdown with Step-3.7...', color: 'cyan' }).start();
  try {
    const resp = await fetch(`${BACKEND}/api/analyse-readme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!resp.ok) throw new Error(`Backend error ${resp.status}`);
    const data = await resp.json();

    if (data.scores) {
      data.scores.wordCount = data.scores.wordCount ?? wordCount;
      data.scores.estimatedReadTime = data.scores.estimatedReadTime ?? readTime;
    }

    spin.succeed('Analysis complete');
    return data;
  } catch (e) {
    spin.fail('Analysis failed');
    throw e;
  }
}
