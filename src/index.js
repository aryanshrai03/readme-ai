#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// readme-ai CLI  |  No silent exits. Every error is visible.
// ══════════════════════════════════════════════════════════════════

import { displayBanner }                 from './branding.js';
import { pickFile }                      from './filePicker.js';
import { loadConfig }                    from './config.js';
import { generateReadme }                from './generator.js';
import { updateReadme }                  from './updater.js';
import { analyseReadme }                 from './analyser.js';
import { previewReadme }                 from './preview.js';
import { generateImages }                from './imageGen.js';
import { uploadToImgBB }                 from './uploader.js';
import { scanProject }                   from './scanner.js';
import { ensureRateLimit }               from './rateLimiter.js';
import boxen                             from 'boxen';
import chalk                             from 'chalk';
import fs                                from 'fs-extra';
import path                              from 'path';

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

// ── context building ──────────────────────────────────────────────

function mapContext(raw) {
  const pkg     = raw.package || {};
  const pkgDesc = pkg.description || '';
  const name    = pkg.name      || path.basename(process.cwd());

  return {
    projectName:   name,
    description:   pkgDesc,
    packageJson:   pkg,
    folderStructure: raw.structure || {},
    cwd:           process.cwd(),
    sourceFiles:   raw.files || [],
    readmeContent: raw.readme || '',
  };
}

async function buildContext() {
  const raw = await scanProject();
  return mapContext(raw);
}

// ── CLI flags ─────────────────────────────────────────────────────

function parseCliFlags() {
  const flags = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    switch (a) {
      case '--health':                 return { ...flags, health: true };
      case '--version':                return { ...flags, version: true };
      case '--help': case '-h':       return { ...flags, help: true };
      case '--output': case '-o':     flags.output     = process.argv[++i]; break;
      case '--no-banner':              flags.noBanner   = true;               break;
      case '--cwd':                   flags.cwd         = process.argv[++i]; break;
      case '--remake':                flags.remake     = true;               break;
      case '--update':                flags.update     = true;               break;
      case '--analyse':               flags.analyse    = true;               break;
      case '--preview':               flags.preview    = true;               break;
      default:
        if (!a.startsWith('-')) flags.targetFile = a; // pick it up later if needed
    }
  }
  return flags;
}

function printHelp() {
  console.log(chalk.cyan(`
┌─────────────────────────────────────────────────────────────┐
│  readme-ai — AI-Powered Markdown Generator                 │
└─────────────────────────────────────────────────────────────┘

Usage:
  readme-ai [options]
  readme-ai --update <file>
  readme-ai --analyse <file>
  readme-ai --preview <file>

Options:
  --health      Show backend health
  --version     Show version
  --help        Show this help
  --remake      Regenerate README.md
  --update      Chat-update a file
  --analyse     Analyse a README
  --preview     Show file stats
  --output <f>  Output file path (default: README.md)
  --no-banner   Skip AI banner
  --cwd <dir>   Project directory (default: cwd)
  <file>        Target markdown file
`));
}

// ── image pipeline (called inside each handler's own try/catch) ──

async function attachImages(text, context, apiUrl) {
  if (!apiUrl) return text;
  if (!text.includes('IMAGE_URL_1') && !text.includes('IMAGE_URL_2')) return text;

  try {
    const spin   = ora({ text: '🎨 Generating images...', color: 'cyan' }).start();
    const images = await generateImages(apiUrl, {
      projectName:   context.projectName,
      description:   context.description,
      keyFeatures:   [],
    });

    spin.succeed('Images generated');

    if (images.length > 0) {
      const urls = [];
      for (let i = 0; i < images.length; i++) {
        const s    = ora({ text: `☁️  Uploading ${i + 1}/${images.length}`, color: 'cyan' }).start();
        const url  = await uploadToImgBB(images[i], apiUrl);
        url ? s.succeed('Uploaded') && urls.push(url) : s.warn('No URL');
      }
      if (urls[0]) text = text.replace(/IMAGE_URL_1/g, urls[0]);
      if (urls[1]) text = text.replace(/IMAGE_URL_2/g, urls[1]);
    }
  } catch (e) {
    console.warn(chalk.yellow(`\n⚠️  Image pipeline skipped: ${e.message}`));
  }
  return text;
}

function showSuccessBox(filePath, wordCount, duration) {
  const msg =
    chalk.green('✅ Markdown generated!\n') +
    chalk.white(`📁 ${filePath}\n`) +
    chalk.white(`📊 ${wordCount} words\n`) +
    chalk.white(`⏱️  ${duration}s\n`) +
    chalk.cyan('⭐ github.com/aryanshrai03/readme-ai');

  console.log(boxen(msg, {
    padding: 1,
    borderColor: 'green',
    borderStyle: 'double',
    align: 'center',
  }));
}

// ── action handlers ───────────────────────────────────────────────
// Each handler is fully self-contained: catches its own errors,
// prints a red ✖ line, and returns cleanly so the menu loops back.

async function safeGenerate(flags, cwd, outPath) {
  if (!ensureRateLimit()) {
    console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
    return;
  }

  let context;
  try {
    context = await buildContext();              // ← was outside try, now inside
  } catch (e) {
    console.error(chalk.red(`\n✖ Scan failed: ${e.message}`));
    return;
  }

  let result;
  try {
    result = await generateReadme(context, { noBanner: flags.noBanner });
  } catch (e) {
    console.error(chalk.red(`\n✖ Generation failed: ${e.message}`));
    return;
  }

  let text = result.readme;
  try {
    text = await attachImages(text, context, BACKEND);
  } catch (_) { /* images always optional */ }

  try {
    await fs.writeFile(outPath, text, 'utf-8');
    const wc = text.split(/\s+/).filter(Boolean).length;
    showSuccessBox(outPath, wc, result.duration);
  } catch (e) {
    console.error(chalk.red(`\n✖ Write failed: ${e.message}`));
  }
}

async function safeUpdate(flags, cwd) {
  const target = flags.targetFile || (await pickFile());
  if (!target) { console.log(chalk.yellow('Cancelled.')); return; }

  if (!ensureRateLimit()) {
    console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
    return;
  }

  let existing = '';
  try {
    existing = await fs.readFile(target.filePath || target, 'utf-8');
  } catch (e) {
    console.error(chalk.red(`\n✖ Cannot read file: ${e.message}`));
    return;
  }

  const inquirer = (await import('inquirer')).default;
  const { instruction } = await inquirer.prompt([{
    type:    'input',
    name:    'instruction',
    message: chalk.cyan('What changes should I make?'),
    default: 'Improve and enhance',
  }]);

  if (!instruction.trim()) { console.log(chalk.yellow('Cancelled.')); return; }

  if (!ensureRateLimit()) {
    console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
    return;
  }

  let result;
  try {
    result = await updateReadme(existing, instruction, [], target.filePath || target);
  } catch (e) {
    console.error(chalk.red(`\n✖ Update failed: ${e.message}`));
    return;
  }

  let text = result.readme;
  try {
    const ctx = await buildContext();
    text = await attachImages(text, ctx, BACKEND);
  } catch (_) { /* optional */ }

  try {
    await fs.writeFile(target.filePath || target, text, 'utf-8');
    const wc = text.split(/\s+/).filter(Boolean).length;
    console.log(chalk.green(`\n✅ Updated (${wc} words)`));
  } catch (e) {
    console.error(chalk.red(`\n✖ Write failed: ${e.message}`));
  }
}

async function safeAnalyse() {
  const target = await pickFile();
  if (!target) { console.log(chalk.yellow('Cancelled.')); return; }

  if (!ensureRateLimit()) {
    console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
    return;
  }

  let result;
  try {
    const { analyseReadme } = await import('./analyser.js');
    result = await analyseReadme(target.filePath);
  } catch (e) {
    console.error(chalk.red(`\n✖ Analysis failed: ${e.message}`));
    return;
  }

  if (!result?.scores) { console.log(chalk.yellow('⚠️  No scores returned.')); return; }

  const s = result.scores;
  console.log(chalk.cyan('\n── Analysis Results ──'));
  const bar = v => chalk.cyan('█'.repeat(Math.round(v / 5)));
  for (const [lbl, val] of [
    ['Overall',      s.overallScore],
    ['Readability',  s.readabilityScore],
    ['SEO',          s.seoScore],
    ['Completeness', s.completenessScore],
  ]) console.log(`  ${lbl.padEnd(14)} ${bar(val)} ${val}/100`);

  console.log(`\n  Words: ${s.wordCount}  |  Read time: ${s.estimatedReadTime}`);
  for (const x of s.strengths)   console.log(`    ✔ ${x}`);
  for (const x of s.improvements) console.log(`    ✦ ${x}`);
  console.log();
}

async function safePreview() {
  const target = await pickFile();
  if (!target) { console.log(chalk.yellow('Cancelled.')); return; }

  let stats;
  try {
    const { previewReadme } = await import('./preview.js');
    stats = await previewReadme(target.filePath);
  } catch (e) {
    console.error(chalk.red(`\n✖ Preview failed: ${e.message}`));
    return;
  }

  console.log(chalk.cyan('\n── File Preview ──'));
  console.log(`  Words:     ${stats.wordCount}`);
  console.log(`  Read time: ${stats.readTime}`);
  console.log(`  Images:    ${stats.imageCount}`);
  console.log(`  Sections:`);
  for (const s of stats.sections) console.log(`    • ${s}`);
  console.log();
}

// ── action menu (the loop that NEVER exits on its own) ────────────

async function showActionMenu(cwd, outPath) {
  const inquirer = (await import('inquirer')).default;

  while (true) {
    const { action } = await inquirer.prompt([{
      type:    'list',
      name:    'action',
      message: chalk.cyan('What would you like to do?'),
      choices: [
        { name: '✨  Generate — Create new markdown with AI',     value: 'generate' },
        { name: '✏️   Update   — Chat with AI to improve',        value: 'update'   },
        { name: '🔍  Analyse  — Deep AI analysis and scoring',    value: 'analyse'  },
        { name: '👀  Preview  — Stats and section summary',       value: 'preview'  },
        { name: '❌  Cancel',                                     value: 'cancel'   },
      ],
      pageSize: 6,
    }]);

    // ── every call wrapped in try/catch — menu never crashes ────
    try {
      switch (action) {
        case 'generate': await safeGenerate({}, cwd, outPath); break;
        case 'update':   await safeUpdate({}, cwd);             break;
        case 'analyse':  await safeAnalyse();                   break;
        case 'preview':  await safePreview();                   break;
        default:
          console.log(chalk.yellow('Goodbye!'));
          return;
      }
    } catch (e) {
      // Final safety net — always visible, always loops back
      console.error(chalk.red(`\n✖ Unexpected error: ${e.message}`));
      console.error(chalk.gray(e.stack || ''));
    }

    // ── loop prompt ──────────────────────────────────────────────
    const { again } = await inquirer.prompt([{
      type:    'confirm',
      name:    'again',
      message: chalk.cyan('Would you like to do something else?'),
      default: true,
    }]);

    if (!again) { console.log(chalk.cyan('Goodbye!')); return; }
    console.log();
  }
}

// ── main ──────────────────────────────────────────────────────────

async function main() {
  await displayBanner();

  const config = loadConfig();
  const flags  = parseCliFlags();

  // ── one-shot flag mode ─────────────────────────────────────────

  if (flags.health) {
    try {
      const r = await fetch(`${BACKEND}/api/health`);
      const d = await r.json();
      console.log(chalk.green('Backend:'), d);
    } catch (e) {
      console.error(chalk.red(`Health check failed: ${e.message}`));
    }
    return;
  }

  if (flags.version) {
    const pkg = JSON.parse(await fs.readFile(path.join(import.meta.dirname, '..', 'package.json'), 'utf-8'));
    console.log(chalk.cyan(`readme-ai v${pkg.version}`));
    return;
  }

  if (flags.help) { printHelp(); return; }

  const cwd     = flags.cwd || process.cwd();
  const outPath = flags.output ? path.resolve(cwd, flags.output) : path.join(cwd, 'README.md');

  try { fs.accessSync(cwd); }
  catch (_) { console.error(chalk.red(`\n✖ Directory not found: ${cwd}`)); return; }

  if (flags.remake)  { await safeGenerate({ ...flags, noBanner: flags.noBanner }, cwd, outPath); return; }
  if (flags.update)  { await safeUpdate(flags, cwd); return; }
  if (flags.analyse) { await safeAnalyse(); return; }
  if (flags.preview) { await safePreview(); return; }

  // ── interactive action menu (loops forever until Cancel) ──────
  await showActionMenu(cwd, outPath);
}

main().catch((e) => {
  // Last-resort safety net — always prints, never silent
  console.error(chalk.red(`\n✖ Fatal error: ${e.message}`));
  if (e.stack) console.error(chalk.gray(e.stack));
  process.exit(1);
});
