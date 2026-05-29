/**
 * Overwrite the project's README.md with new content.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { spinner } from './branding.js';

export async function updateReadme(newContent) {
  const spin = spinner('🛠️ Updating README.md...');
  try {
    const outPath = path.join(process.cwd(), 'README.md');
    await fs.writeFile(outPath, newContent, 'utf-8');
    spin.succeed('README.md updated');
    console.log(chalk.green(`✅ Updated ${outPath}`));
    return outPath;
  } catch (e) {
    spin.fail('Failed to update README.md');
    console.error(chalk.red(e));
    throw e;
  }
}
