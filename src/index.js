#!/usr/bin/env node

/**
 * README-AI CLI — full interactive flow.
 * Auto-launches with ASCII art branding.
 */

import { displayBanner } from './branding.js';
import { pickFile } from './filePicker.js';
import { loadConfig } from './config.js';
import { generateReadme } from './generator.js';
import { updateReadme } from './updater.js';
import { analyseReadme } from './analyser.js';
import { previewReadme } from './preview.js';
import { generateImages } from './imageGen.js';
import { uploadToImgBB } from './uploader.js';
import { scanProject } from './scanner.js';
import { ensureRateLimit } from './rateLimiter.js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

// ── helpers ──────────────────────────────────────────────────────

function mapContext(raw) {
  const pkg = raw.package || {};
  const folderStructure = raw.structure || {};
  return {
    projectName: pkg.name || path.basename(process.cwd()),
    description: pkg.description || '',
    packageJson: pkg,
    folderStructure,
    cwd: process.cwd(),
    files: raw.files || [],
  };
}

async function scanAndBuildContext(cwd) {
  const raw = await scanProject();
  return mapContext(raw);
}

function parseCliFlags() {
  const flags = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--health') return { health: true };
    if (arg === '--version') return { version: true };
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--output' || arg === '-o') { flags.output = process.argv[++i]; continue; }
    if (arg === '--no-banner') { flags.noBanner = true; continue; }
    if (arg === '--cwd') { flags.cwd = process.argv[++i]; continue; }
    if (arg === '--remake') { flags.remake = true; continue; }
    if (arg === '--update') { flags.update = true; continue; }
    if (arg === '--analyse') { flags.analyse = true; continue; }
    if (arg === '--preview') { flags.preview = true; continue; }
    if (!arg.startsWith('-')) flags.targetFile = arg;
  }
  return flags;
}

function printHelp() {
  console.log(chalk.cyan(`
readme-ai — AI-Powered README Generator

Usage:
  readme-ai [options]

Options:
  --health      Show backend health status
  --version     Show version
  --help        Show this help message
  --analyse     Analyse an existing README
  --preview     Show stats for a README file
  --remake      Regenerate README.md in current project
  --update      Chat-update an existing README
  --output <f>  Output file path (default: README.md)
  --no-banner   Skip AI-generated banner
  --cwd <dir>   Project directory (default: current)
  <file>        Target markdown file (interactive picker if omitted)
`));
}

// ── image pipeline ───────────────────────────────────────────────

async function attachImages(readmeText, context, apiUrl) {
  if (readmeText.includes('IMAGE_URL_1') || readmeText.includes('IMAGE_URL_2')) {
    if (!apiUrl) return readmeText; // no backend URL, skip silently
  }
  let updated = readmeText;
  try {
    const spin = ora({ text: '🎨 Generating images...', color: 'cyan' }).start();
    const images = await generateImages(apiUrl, {
      projectName: context.projectName,
      description: context.description,
      keyFeatures: [],
    });
    spin.succeed('Images generated');
    if (images.length === 0) return updated;

    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const s = ora({ text: `☁️ Uploading image ${i + 1}/${images.length}...`, color: 'cyan' }).start();
      const url = await uploadToImgBB(images[i], apiUrl);
      if (url) { s.succeed('Uploaded'); urls.push(url); }
      else { s.fail('Upload failed'); }
    }

    if (urls[0]) updated = updated.replace(/IMAGE_URL_1/g, urls[0]);
    if (urls[1]) updated = updated.replace(/IMAGE_URL_2/g, urls[1]);
  } catch (e) {
    console.warn(chalk.yellow(`⚠️  Image pipeline skipped: ${e.message}`));
  }
  return updated;
}

// ── main ─────────────────────────────────────────────────────────

async function main() {
  displayBanner();

  const config = loadConfig();
  const flags = parseCliFlags();

  if (flags.health) {
    const resp = await fetch(`${BACKEND}/api/health`);
    const data = await resp.json();
    console.log(chalk.green('Backend status:'), data);
    return;
  }
  if (flags.version) {
    const pkg = JSON.parse(await fs.readFile(path.join(import.meta.dirname, '..', 'package.json'), 'utf-8'));
    console.log(chalk.cyan(`readme-ai v${pkg.version}`));
    return;
  }
  if (flags.help) { printHelp(); return; }

  const cwd = flags.cwd || process.cwd();
  const outPath = flags.output ? path.resolve(cwd, flags.output) : path.join(cwd, 'README.md');

  try {
    fs.accessSync(cwd);
  } catch {
    console.error(chalk.red(`Error: directory does not exist: ${cwd}`));
    process.exit(1);
  }

  // ── generate flow ─────────────────────────────────────────────
  if (flags.remake || (!flags.update && !flags.analyse && !flags.preview)) {
    if (!ensureRateLimit()) return;

    const context = await scanAndBuildContext(cwd);

    let result;
    try {
      result = await generateReadme(context, { noBanner: flags.noBanner });
    } catch (e) {
      console.error(chalk.red(`Generation failed: ${e.message}`));
      process.exit(1);
    }

    let readmeText = result.readme;
    // Replace placeholder image URLs with real uploads
    readmeText = await attachImages(readmeText, context, BACKEND);

    try {
      await fs.writeFile(outPath, readmeText, 'utf-8');
      console.log(chalk.green(`✅ README written to ${outPath}`));
      console.log(chalk.gray(`   ${result.duration}s`));
    } catch (e) {
      console.error(chalk.red(`Failed to write README: ${e.message}`));
      process.exit(1);
    }
    return;
  }

  // ── update flow ───────────────────────────────────────────────
  if (flags.update) {
    const target = flags.targetFile || (await pickFile());
    if (!target) { console.log(chalk.yellow('Cancelled.')); return; }

    if (!ensureRateLimit()) return;

    const existing = await fs.readFile(target, 'utf-8').catch(() => '');
    const answer = await (await import('inquirer')).default.prompt([
      { type: 'input', name: 'instruction', message: chalk.cyan('What changes should I make?'), default: 'Improve and enhance' },
    ]);
    if (!ensureRateLimit()) return;

    let result;
    try {
      result = await updateReadme(existing, answer.instruction, [], target);
    } catch (e) {
      console.error(chalk.red(`Update failed: ${e.message}`));
      process.exit(1);
    }

    let updated = result.readme;
    // Replace placeholder image URLs if present
    const ctx = await scanAndBuildContext(cwd);
    updated = await attachImages(updated, ctx, BACKEND);

    await fs.writeFile(target, updated, 'utf-8');
    console.log(chalk.green(`✅ Updated ${target}`));
    console.log(chalk.gray(`   ${result.duration}s`));
    return;
  }

  // ── analyse / preview flow ────────────────────────────────────
  let targetFile = flags.targetFile || (await pickFile());
  if (!targetFile) { console.log(chalk.yellow('Cancelled.')); return; }

  if (flags.preview) {
    const { previewReadme } = await import('./preview.js');
    const stats = await previewReadme(targetFile);
    console.log(chalk.cyan('\n── README Preview ──'));
    console.log(`  ${chalk.bold('Words:')}      ${stats.wordCount}`);
    console.log(`  ${chalk.bold('Read time:')}  ${stats.readTime}`);
    console.log(`  ${chalk.bold('Images:')}     ${stats.imageCount}`);
    console.log(`  ${chalk.bold('Sections:')}`);
    for (const s of stats.sections) console.log(`    • ${s}`);
    console.log();
    return;
  }

  if (flags.analyse) {
    if (!ensureRateLimit()) return;
    const { analyseReadme } = await import('./analyser.js');
    const result = await analyseReadme(targetFile);
    if (result.scores) {
      console.log(chalk.cyan('\n── README Analysis ──'));
      const bar = (v) => chalk.cyan('█'.repeat(Math.round(v / 5)));
      for (const [label, score] of [
        ['Overall', result.scores.overallScore],
        ['Readability', result.scores.readabilityScore],
        ['SEO', result.scores.seoScore],
        ['Completeness', result.scores.completenessScore],
      ]) {
        console.log(`  ${label.padEnd(14)} ${bar(score)} ${score}/100`);
      }
      console.log(`\n  Word count:    ${result.scores.wordCount}`);
      console.log(`  Read time:     ${result.scores.estimatedReadTime}`);
      console.log(`\n  ${chalk.bold('Strengths:')}`);
      for (const s of result.scores.strengths) console.log(`    ✔ ${s}`);
      console.log(`\n  ${chalk.bold('Improvements:')}`);
      for (const s of result.scores.improvements) console.log(`    ✦ ${s}`);
      console.log();
    }
    return;
  }
}

main().catch((e) => {
  console.error(chalk.red(`Fatal error: ${e.message}`));
  process.exit(1);
});
