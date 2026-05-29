/**
 * File picker — inquirer list prompt over all .md files in cwd.
 * Returns { filePath, isNew } or null if cancelled.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { glob } from 'glob';

export async function pickFile() {
  const files = await glob('**/*.md', {
    cwd: process.cwd(),
    nodir: true,
    ignore: ['node_modules/**', '.git/**'],
    absolute: true,
  });

  const fileMap = new Map();
  const choices = [];

  for (const abs of files.sort()) {
    const rel = path.relative(process.cwd(), abs);
    const stats = await fs.stat(abs).catch(() => null);
    const size = stats ? ` (${(stats.size / 1024).toFixed(1)}KB)` : '';
    fileMap.set(rel, abs);
    choices.push({ name: `📄 ${rel}${size}`, value: rel });
  }

  choices.push({ name: '✨ Create new .md file', value: '__new__' });
  choices.push({ name: '❌ Cancel', value: '__cancel__' });

  const inquirer = (await import('inquirer')).default;
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: 'Which markdown file would you like to work on?',
      choices,
      pageSize: 12,
    },
  ]);

  const sel = answer.selection;
  if (sel === '__cancel__' || sel === '__new__') {
    if (sel === '__new__') {
      const { newName } = await inquirer.prompt([
        { type: 'input', name: 'newName', message: chalk.cyan('Enter filename (e.g. TODO.md):'), default: 'NEW.md' },
      ]);
      const fp = path.join(process.cwd(), newName.endsWith('.md') ? newName : newName + '.md');
      return { filePath: fp, isNew: true };
    }
    return null;
  }

  return { filePath: fileMap.get(sel) || path.join(process.cwd(), sel), isNew: false };
}
