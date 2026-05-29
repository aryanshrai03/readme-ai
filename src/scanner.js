/** Project & file scanner.  Called by index.js to gather project context. */

import { promises as fs } from 'fs';
import path from 'path';

export async function scanProject(targetFile) {
  const cwd     = process.cwd();
  const maxFiles = 20;
  const maxLines = 200;
  const context  = { cwd, package: null, readme: null, files: [], structure: {} };

  // ── package.json ──────────────────────────────────────────────
  try {
    context.package = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'));
  } catch (_) { /* no package.json is fine */ }

  // ── README / existing target file ─────────────────────────────
  try {
    context.readme = await fs.readFile(path.join(cwd, targetFile || 'README.md'), 'utf-8');
  } catch (_) { /* nothing on disk yet — fine */ }

  // ── up to 20 source files, first `maxLines` lines each ────────
  const extMap  = { js: 0, ts: 0, py: 0, go: 0, rs: 0 };
  const skipped = new Set(['node_modules', '.git']);

  async function walk(dir, depth = 0) {
    if (context.files.length >= maxFiles) return;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch (_) { return; }

    for (const entry of entries) {
      if (context.files.length >= maxFiles) break;
      if (entry.name.startsWith('.') || skipped.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (ext in extMap) {
          try {
            const lines = (await fs.readFile(full, 'utf-8')).split('\n').slice(0, maxLines).join('\n');
            context.files.push({ path: path.relative(cwd, full), content: lines });
          } catch (_) { /* skip unreadable */ }
        }
      }
    }
  }

  await walk(cwd);

  // ── folder tree (2 levels deep) ───────────────────────────────
  try {
    context.structure = await getFolderTree(cwd, 2);
  } catch (_) { /* non-critical */ }

  return context;
}

async function getFolderTree(dir, depth, current = 0) {
  if (current >= depth) return {};
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const result  = {};
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) result[entry.name] = await getFolderTree(full, depth, current + 1);
      else                      result[entry.name] = null;
    }
    return result;
  } catch (_) { return {}; }
}
