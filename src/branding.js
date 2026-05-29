/**
 * CLI branding: ASCII art + boxen info block.
 * Call displayBanner() once at startup.
 */

import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import chalk from 'chalk';

export function displayBanner() {
  const ascii = figlet.textSync('README-AI', {
    horizontalLayout: 'default',
    verticalLayout: 'default',
    font: 'Big',
  });
  console.log(gradient.rainbow(ascii));
  const info = boxen(
    [
      '✨ AI-Powered README Generator',
      'by github.com/aryanshrai03',
      
    ].join('\n'),
    {
      padding: 1,
      borderColor: 'cyan',
      borderStyle: 'round',
      marginTop: 1,
    }
  );
  console.log(chalk.cyan(info));
}

export function spinner(message) {
  const ora = require('ora').default || require('ora');
  return ora({ text: message, color: 'cyan' }).start();
}
