/** Upload a base64 image via the Vercel backend (ImgBB proxy).  Returns hosted URL or null. */

import chalk from 'chalk';
import ora from 'ora';

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

export async function uploadToImgBB(base64Image, apiUrl) {
  const spin = ora({ text: '☁️  Uploading image to ImgBB...', color: 'cyan' }).start();
  try {
    const resp = await fetch(`${apiUrl}/api/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!resp.ok) throw new Error(`upload-image failed: ${resp.status}`);
    const data = await resp.json();
    const url  = data?.url;

    if (!url) {
      spin.warn('No URL returned');
      return null;
    }

    spin.succeed('Image uploaded');
    return url;
  } catch (e) {
    spin.fail('Image upload error');
    console.warn(chalk.yellow(e.message));
    return null;
  }
}
