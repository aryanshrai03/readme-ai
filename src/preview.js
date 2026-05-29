/** Preview a markdown file — word count, read time, image and section count. */

import fs from 'fs-extra';
import path from 'path';

export async function previewReadme(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  let content = '';
  try {
    content = await fs.readFile(absPath, 'utf-8');
  } catch {
    content = '';
  }

  const words    = content.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200)) + ' min read';
  const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const sections = [];
  for (const line of content.split('\n')) {
    if (/^#{1,2}\s+/.test(line.trim())) {
      sections.push(line.trim().replace(/^#+\s*/, ''));
    }
  }

  return { path: absPath, wordCount: words, readTime, imageCount, sections };
}
