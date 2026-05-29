/**
 * CLI branding: 3D-style ASCII art + version + clickable link.
 *
 * Display order:
 *   1. displayBanner()                     — called once at startup
 *   2. showSuccessBox(filePath, words, dur) — shown after generation
 */

import boxen from 'boxen';
import chalk from 'chalk';
import figlet from 'figlet';

// ── start-up banner ──────────────────────────────────────────────

export function displayBanner() {
  // ── "legendary 3D style logo" using figlet "Doom" (blocky, 3-D feel) ──
  const ascii = figlet.textSync('Markdown-AI', {
    font: 'Doom',
    horizontalLayout: 'default',
  });

  // ── upper gradient for visual punch ──
  const logoLines = ascii.split('\n');
  const upper = logoLines.slice(0, Math.ceil(logoLines.length / 2));
  const lower = logoLines.slice(Math.ceil(logoLines.length / 2));

  console.log(chalk.hex('#a855f7')(upper.join('\n')));   // purple-ish
  console.log(chalk.hex('#3b82f6')(lower.join('\n')));   // blue-ish

  // ── info block — clickable name, version, link ──
  const pkgLine = chalk.bold('v1.0.0');
  const nameLine = chalk.cyan.underline('readme-ai');
  const linkLine = chalk.gray('https://github.com/aryanshrai03/readme-ai');

  const info = boxen(
    [pkgLine, nameLine, linkLine].join('\n'),
    {
      padding:    { top: 0, bottom: 0, left: 2, right: 2 },
      borderColor: 'magenta',
      borderStyle: 'double',
      align:       'center',
    },
  );

  console.log(chalk.magenta(info));
  console.log();
}

// ── post-generation success box ──────────────────────────────────

export function showSuccessBox(filePath, wordCount, duration) {
  const msg =
    chalk.green('  ✅ Markdown generated!\n') +
    chalk.white(`  📁 Saved to : ${filePath}\n`) +
    chalk.white(`  📊 Words    : ${wordCount}\n`) +
    chalk.white(`  ⏱ Managed   : ${duration}s\n`) +
    chalk.hex('#3b82f6')("  ⭐ readme-ai : github.com/aryanshrai03/readme-ai");

  console.log(boxen(msg, {
    padding: 1,
    borderColor: 'green',
    borderStyle: 'double',   /* matching double-line border */
    align: 'center',
  }));
  console.log();
}

// ── ora spinner helper (kept for internal use) ───────────────────
// eslint-disable-next-line import/no-extraneous-dependencies
import ora from 'ora';

export function startSpinner(message, opts = {}) {
  return ora({ text: message, color: 'cyan', ...opts }).start();
}
