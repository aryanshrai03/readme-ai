import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { glob } from 'glob';
import chalk from 'chalk';

export async function scanProject() {
  const cwd = process.cwd();
  const context = { cwd, package: null, readme: null, files: [] };
  // package.json
  try {
    const pkgPath = path.join(cwd, 'package.json');
    const pkgContent = await fs.readFile(pkgPath, 'utf-8');
    context.package = JSON.parse(pkgContent);
  } catch (_) {
    // ignore
  }
  // README.md
  try {
    const readmePath = path.join(cwd, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    context.readme = readmeContent;
  } catch (_) {}

  // find source files (limit 20 files, each max 200 lines)
  const patterns = ['**/*.js', '**/*.ts', '**/*.py', '**/*.go', '**/*.rs', '**/*.java'];
  const filesFound = [];
  for (const pat of patterns) {
    const matches = await new Promise((res, rej) => {
      glob(pat, { cwd, nodir: true, ignore: ['node_modules/**', '.git/**'], absolute: true }, (err, matches) => {
        if (err) rej(err);
        else res(matches);
      });
    });
    filesFound.push(...matches);
    if (filesFound.length >= 20) break;
  }
  const limited = filesFound.slice(0, 20);
  for (const file of limited) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n').slice(0, 200).join('\n');
      context.files.push({ path: path.relative(cwd, file), content: lines });
    } catch (e) {
      // ignore unreadable
    }
  }
  // folder structure two levels deep
  try {
    const tree = await getFolderTree(cwd, 2);
    context.structure = tree;
  } catch (_) {}
  return context;
}

async function getFolderTree(dir, depth, current = 0) {
  if (current >= depth) return {};
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = {};
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result[entry.name] = await getFolderTree(full, depth, current + 1);
    } else {
      result[entry.name] = 'file';
    }
  }
  return result;
}
