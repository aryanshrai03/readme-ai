/**
 * Upload a base64-encoded image via the Vercel backend (ImgBB proxy).
 * Returns the hosted URL of the uploaded image, or null on failure.
 */

import chalk from 'chalk';
import { spinner } from './branding.js';

export async function uploadToImgBB(base64Image, apiUrl) {
 const spin = spinner('☁️ Uploading image to ImgBB...');
 try {
  const resp = await fetch(`${apiUrl}/api/upload-image`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ image: base64Image }),
  });
  if (!resp.ok) throw new Error(`upload-image failed: ${resp.status}`);
  const data = await resp.json();
  const url = data?.url;
  if (!url) throw new Error('No URL in upload response');
  spin.succeed('Image uploaded');
  return url;
 } catch (e) {
  spin.fail('Image upload error');
  console.error(chalk.red(e.message || e));
  return null;
 }
}
