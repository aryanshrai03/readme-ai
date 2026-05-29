#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// readme-ai CLI  |  Polish build — live spinners, chat loop,
//                   file-type detection, rich dashboard, tips
// ══════════════════════════════════════════════════════════════════

import { displayBanner }                 from './branding.js';
import { pickFile }                      from './filePicker.js';
import { loadConfig }                    from './config.js';
import { generateReadme, detectFileType } from './generator.js';
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
import readline                          from 'readline';

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

// ── tips ─────────────────────────────────────────────────────────

const TIPS = [
  '💡 Run --update to chat with AI and improve your file',
  '💡 Run --analyse to get a quality score',
  '💡 Try generating CHANGELOG.md or CONTRIBUTING.md too',
  '💡 Use "add image from assets/banner.png" in chat mode',
  '💡 Star readme-ai if this helped!',
  '💡 Share your generated README on Twitter/X!',
  '💡 Run in any project folder — it detects the stack automatically',
  '💡 Use --preview for quick file stats without generating',
];

function randomTip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

// ── context & file type ───────────────────────────────────────────

function detectType(filePath) {
  const name = path.basename(filePath || '').toLowerCase();
  if (name === 'readme.md')                          return 'readme';
  if (name === 'changelog.md')                       return 'changelog';
  if (name === 'contributing.md')                    return 'contributing';
  if (name === 'docs.md' || filePath?.includes('/docs/'))  return 'documentation';
  if (name === 'api.md')                             return 'api-reference';
  return 'general';
}

function mapContext(raw, fileType = 'readme') {
  const pkg     = raw.package || {};
  const pkgDesc = pkg.description || '';
  const name    = pkg.name || path.basename(process.cwd());

  return {
    projectName:    name,
    description:    pkgDesc,
    packageJson:    pkg,
    folderStructure: raw.structure || {},
    cwd:            process.cwd(),
    sourceFiles:    raw.files || [],
    readmeContent:  raw.readme || '',
    fileType,                                // ← NEW
  };
}

async function buildContext(targetFile) {
  const raw   = await scanProject(targetFile);
  const fType = detectType(targetFile);
  return mapContext(raw, fType);
}

// ── CLI flags ─────────────────────────────────────────────────────

function parseCliFlags() {
  const flags = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    switch (a) {
      case '--health':                return { ...flags, health: true };
      case '--version':               return { ...flags, version: true };
      case '--help': case '-h':      return { ...flags, help: true };
      case '--output': case '-o':    flags.output   = process.argv[++i]; break;
      case '--no-banner':             flags.noBanner = true;               break;
      case '--cwd':                  flags.cwd       = process.argv[++i]; break;
      case '--remake':               flags.remake    = true;               break;
      case '--update':               flags.update    = true;               break;
      case '--analyse':              flags.analyse   = true;               break;
      case '--preview':              flags.preview   = true;               break;
      default:
        if (!a.startsWith('-')) flags.targetFile = a;
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

// ── image pipeline ────────────────────────────────────────────────

async function attachImages(text, context, apiUrl) {
  if (!apiUrl) return text;
  if (!text.includes('IMAGE_URL_1') && !text.includes('IMAGE_URL_2')) return text;

  try {
    const spin   = ora({ text: '🎨 Generating images with Flux Klein...', color: 'cyan' }).start();
    const images = await generateImages(apiUrl, {
      projectName: context.projectName,
      description: context.description,
      keyFeatures: [],
    });

    spin.succeed('Images generated');

    if (images.length > 0) {
      const urls = [];
      for (let i = 0; i < images.length; i++) {
        const s    = ora({ text: `☁️ Uploading ${i + 1}/${images.length}`, color: 'cyan' }).start();
        try {
          const url = await uploadToImgBB(images[i], apiUrl);
          url ? (s.succeed('Uploaded'), urls.push(url)) : s.warn('No URL');
        } catch (_) { s.warn('Upload skipped'); }
      }
      if (urls[0]) text = text.replace(/IMAGE_URL_1/g, urls[0]);
      if (urls[1]) text = text.replace(/IMAGE_URL_2/g, urls[1]);
    }
  } catch (e) {
    console.warn(chalk.yellow(`\n⚠️ Image pipeline skipped: ${e.message}`));
  }
  return text;
}

// ── success box ──────────────────────────────────────────────────

function showSuccessBox(filePath, wordCount, durationSec, imageCount) {
  const absPath = path.resolve(filePath);
  const dur     = (durationSec < 0.1) ? '< 0.1s' : `${durationSec.toFixed(1)}s`;
  const imgLabel = imageCount > 0 ? `${imageCount} (AI generated)` : '0';

  const msg =
    chalk.green('✅ Markdown Generated!\n\n') +
    chalk.white(` 📄 File   : ${path.basename(filePath)}\n`) +
    chalk.white(` 📊 Words  : ${wordCount}\n`) +
    chalk.white(` 🖼️ Images : ${imgLabel}\n`) +
    chalk.white(` ⏱️ Time   : ${dur}\n`) +
    chalk.white(` 📁 Path   : ${absPath}\n\n`) +
    chalk.yellow(` 💡 Tip    : ${randomTip()}\n`) +
    chalk.cyan(' ⭐ Star   : readme-ai');

  console.log(boxen(msg, {
    padding: 1,
    borderColor: 'green',
    borderStyle: 'double',
    align: 'left',
  }));
  console.log();
}

// ── chat readline helper ──────────────────────────────────────────

function chatPrompt(question) {
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
    terminal: true,
  });
  return new Promise(resolve => {
    rl.question(question, ans => { rl.close(); resolve(ans); });
  });
}

// ── action handlers ───────────────────────────────────────────────

async function safeGenerate(flags, cwd, outPath) {
  if (!ensureRateLimit()) {
    console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
    return;
  }

  // ── Step 1: scan ──────────────────────────────────────────────
  const scanSpin = ora({ text: '🧠 Scanning your project files...', color: 'cyan' }).start();
  let context;
  try {
    context = await buildContext(outPath);
  } catch (e) {
    scanSpin.fail('Scan failed');
    console.error(chalk.red(`\n✖ Scan failed: ${e.message}`));
    return;
  }
  scanSpin.succeed('Project scanned');

  // ── Step 2: generate ──────────────────────────────────────────
  const genSpin = ora({ text: `✨ Generating ${context.fileType} with Step-3.7...`, color: 'cyan' }).start();
  let result;
  try {
    result = await generateReadme(context, { noBanner: flags.noBanner });
  } catch (e) {
    genSpin.fail('Generation failed');
    console.error(chalk.red(`\n✖ Generation failed: ${e.message}`));
    return;
  }
  genSpin.succeed('Markdown generated');

  // ── Step 3: attach images ─────────────────────────────────────
  let text = result.readme;
  try {
    text = await attachImages(text, context, BACKEND);
  } catch (_) { /* optional */ }

  // ── Step 4: write file ────────────────────────────────────────
  const writeSpin = ora({ text: '💾 Saving file...', color: 'cyan' }).start();
  try {
    await fs.writeFile(outPath, text, 'utf-8');
    writeSpin.succeed('File saved');
  } catch (e) {
    writeSpin.fail('Write failed');
    console.error(chalk.red(`\n✖ Write failed: ${e.message}`));
    return;
  }

  // ── success box (fix BUG 2: backend sends ms, convert to sec) ─
  const durationSec = (result.duration ?? 0) / 1000;
  const imageCount  = (text.match(/IMAGE_URL_/g) || []).filter((_, i, a) => {
    // count unique replacements done in attachImages
    return true;
  }).length > 0 ? 2 : 0;

  showSuccessBox(outPath, text.split(/\s+/).filter(Boolean).length, durationSec, imageCount);
  console.log(chalk.cyan(` 💡 ${randomTip()}`));
}

async function safeUpdate(flags, cwd) {
  const target = flags.targetFile || (await pickFile());
  if (!target) { console.log(chalk.yellow('Cancelled.')); return; }

  const targetPath = target.filePath || target;

  if (!ensureRateLimit()) {
    console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
    return;
  }

  let existing = '';
  try {
    existing = await fs.readFile(targetPath, 'utf-8');
  } catch (e) {
    console.error(chalk.red(`\n✖ Cannot read file: ${e.message}`));
    return;
  }

  // ── multi-turn chat loop ──────────────────────────────────────
  console.log(chalk.cyan('\n🤖 AI Assistant — type changes, "done" to save, "exit" to cancel'));
  console.log(chalk.gray('💡 Try: "add more emojis", "make it more professional", "add installation section"\n'));

  let conversationHistory = [];
  let currentContent      = existing;
  const fileType          = detectType(targetPath);

  while (true) {
    const input = await chatPrompt(chalk.cyan('You: '));

    const trimmed = input.trim().toLowerCase();
    if (trimmed === 'done') {
      // save
      try {
        await fs.writeFile(targetPath, currentContent, 'utf-8');
        console.log(chalk.green(`\n✅ Saved to ${targetPath}`));
      } catch (e) {
        console.error(chalk.red(`\n✖ Write failed: ${e.message}`));
      }
      break;
    }
    if (trimmed === 'exit') {
      console.log(chalk.yellow('Discarded changes.'));
      break;
    }
    if (trimmed === 'preview') {
      const stats = await previewReadme(targetPath);
      console.log(chalk.cyan('\n── Current Preview ──'));
      console.log(` Words: ${stats.wordCount} | Read time: ${stats.readTime}`);
      console.log(` Sections:`); for (const s of stats.sections) console.log(`   • ${s}`);
      console.log();
      continue;
    }
    if (trimmed === 'diff') {
      const origLines = existing.split('\n');
      const newLines  = currentContent.split('\n');
      console.log(chalk.yellow(`\n── Changes: +${Math.max(0, newLines.length - origLines.length)} lines`));
      continue;
    }
    if (!trimmed) continue;

    if (!ensureRateLimit()) {
      console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
      continue;
    }

    const spin = ora({ text: '🤖 AI is thinking...', color: 'cyan' }).start();
    try {
      const result = await updateReadme(
        currentContent,
        input,
        conversationHistory,
        targetPath
      );
      spin.succeed('Update ready');
      currentContent = result.readme;
      conversationHistory.push(
        { role: 'user',      content: input },
        { role: 'assistant', content: result.readme }
      );
      console.log(chalk.gray('── AI updated the file ──'));
      console.log(chalk.cyan(` 💡 ${randomTip()}`));
    } catch (e) {
      spin.fail('Update failed');
      console.error(chalk.red(`\n✖ Update failed: ${e.message}`));
    }
    console.log();
  }
}

async function safeAnalyse() {
  const target = await pickFile();
  if (!target) { console.log(chalk.yellow('Cancelled.')); return; }

  if (!ensureRateLimit()) {
    console.log(chalk.yellow('⏳ Rate limited — wait a moment.'));
    return;
  }

  const spin = ora({ text: '🔍 Analysing markdown...', color: 'cyan' }).start();
  let result;
  try {
    result = await analyseReadme(target.filePath);
  } catch (e) {
    spin.fail('Analysis failed');
    console.error(chalk.red(`\n✖ Analysis failed: ${e.message}`));
    return;
  }
  spin.succeed('Analysis complete');

  if (!result?.scores) { console.log(chalk.yellow('⚠️  No scores returned.')); return; }

  const s = result.scores;

  // ── beautiful dashboard ───────────────────────────────────────
  function scoreBar(val) {
    const filled  = Math.round(val / 5);
    const empty   = 20 - filled;
    const colorFn = val > 75 ? chalk.green : val > 50 ? chalk.yellow : chalk.red;
    return colorFn('█'.repeat(filled) + '░'.repeat(empty));
  }

  function scoreIcon(val) { return val > 75 ? chalk.green('✅') : val > 50 ? chalk.yellow('⚠️') : chalk.red('❌'); }

  console.log(chalk.cyan('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║        📊  README Analysis Dashboard        ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════╝\n'));

  const rows = [
    ['Overall',      s.overallScore,      s.strengths?.length   ? chalk.green('Strong overall quality') : chalk.yellow('Needs improvement')],
    ['Readability',  s.readabilityScore,  s.readabilityScore > 70 ? chalk.green('Easy to read') : chalk.yellow('Could be clearer')],
    ['SEO',          s.seoScore,          s.seoScore > 60 ? chalk.green('Good discoverability') : chalk.yellow('SEO gaps detected')],
    ['Completeness', s.completenessScore, s.completenessScore > 70 ? chalk.green('Well structured') : chalk.yellow('Missing sections')],
  ];

  for (const [label, val, desc] of rows) {
    console.log(`  ${scoreIcon(val)} ${label.padEnd(14)} ${scoreBar(val)} ${String(val).padStart(3)}/100  ${desc}`);
  }

  console.log(chalk.white(`\n  📝 Words: ${s.wordCount}  |  ⏱ ${s.estimatedReadTime}`));

  if (s.missingCriticalSections?.length) {
    console.log(chalk.red(`\n  ❌ Missing sections: ${s.missingCriticalSections.join(', ')}`));
  }
  if (s.strengths?.length) {
    console.log(chalk.green(`\n  ✅ Strengths:`));
    for (const x of s.strengths)   console.log(`     • ${x}`);
  }
  if (s.improvements?.length) {
    console.log(chalk.yellow(`\n  ⚠️  Improvements:`));
    for (const x of s.improvements) console.log(`     • ${x}`);
  }
  if (s.suggestions?.length) {
    console.log(chalk.blue(`\n  💡 Suggestions:`));
    for (const x of s.suggestions) console.log(`     • ${x}`);
  }

  console.log(chalk.cyan(`\n 💡 Tip: ${randomTip()}\n`));
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
  console.log(` Words:     ${stats.wordCount}`);
  console.log(` Read time: ${stats.readTime}`);
  console.log(` Images:    ${stats.imageCount}`);
  console.log(` Sections:`);
  for (const s of stats.sections) console.log(`   • ${s}`);
  console.log(chalk.gray(` 💡 ${randomTip()}\n`));
}

// ── action menu (never exits on its own) ──────────────────────────

async function showActionMenu(cwd, outPath) {
  const inquirer = (await import('inquirer')).default;

  while (true) {
    const { action } = await inquirer.prompt([{
      type:    'list',
      name:    'action',
      message: chalk.cyan('What would you like to do?'),
      choices: [
        { name: '✨  Generate — Create new markdown with AI',    value: 'generate' },
        { name: '✏️   Update   — Chat with AI to improve',       value: 'update'   },
        { name: '🔍  Analyse  — Deep AI analysis & scoring',     value: 'analyse'  },
        { name: '👀  Preview  — Quick stats & summary',          value: 'preview'  },
        { name: '❌  Cancel',                                     value: 'cancel'   },
      ],
      pageSize: 6,
    }]);

    // every call wrapped so menu never crashes
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
      console.error(chalk.red(`\n✖ Unexpected error: ${e.message}`));
      console.error(chalk.gray(e.stack || ''));
    }

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

  // ── one-shot flags ─────────────────────────────────────────────
  if (flags.health) {
    try {
      const r = await fetch(`${BACKEND}/api/health`);
      console.log(chalk.green('Backend:'), await r.json());
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
  if (flags.update)  { await safeUpdate(flags, cwd);                                          return; }
  if (flags.analyse) { await safeAnalyse();                                                    return; }
  if (flags.preview) { await safePreview();                                                    return; }

  await showActionMenu(cwd, outPath);
}

main().catch((e) => {
  console.error(chalk.red(`\n✖ Fatal error: ${e.message}`));
  if (e.stack) console.error(chalk.gray(e.stack));
  process.exit(1);
});
