/** File picker — inquirer prompt over .md files in cwd.  Returns { filePath, isNew } or null if cancelled. */

import fs from 'fs-extra';
import path from 'path';
import { displayBanner } from './branding.js';

function walkMd(dir, out = [], depth = 0) {
  if (depth > 8) return out; // safety cap
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (_) { return out; }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMd(full, out, depth + 1);
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

export async function pickFile() {
  const allFiles = walkMd(process.cwd()).sort();

  // Filter away files inside node_modules or .git
  const clean = allFiles.filter(f => !f.includes('/node_modules/') && !f.includes('\\.git\\'));

  const choices = [];
  const fileMap = new Map();

  for (const abs of clean) {
    const rel = path.relative(process.cwd(), abs);
    const size = (fs.statSync(abs).size / 1024).toFixed(1);
    fileMap.set(rel, abs);
    choices.push({ name: `  📄 ${rel}  (${size}KB)`, value: rel });
  }

  choices.push({ name: '  ✨  Create new markdown file',  value: '__new__' });
  choices.push({ name: '  ❌  Cancel',                    value: '__cancel__' });

  const inquirer = (await import('inquirer')).default;
  const { selection } = await inquirer.prompt([{
    type:    'list',
    name:    'selection',
    message: 'Which markdown file would you like to work on?',
    choices,
    pageSize: 16,
  }]);

  if (selection === '__cancel__') return null;

  if (selection === '__new__') {
    const { newName } = await inquirer.prompt([{
      type:    'input',
      name:    'newName',
      message: 'Enter filename (eg. CHANGELOG.md, DOCS.md, README.md):',
      default: 'NEW.md',
    }]);
    return {
      filePath: path.join(process.cwd(), newName.endsWith('.md') ? newName : newName + '.md'),
      isNew: true,
    };
  }

  return { filePath: fileMap.get(selection) || path.join(process.cwd(), selection), isNew: false };
}
