/**
 * Generate two images via the Vercel backend (Flux Klein).
 * Each call hits the local backend which proxies to NVIDIA.
 * Returns an array of base64 image strings (empty on failure).
 */

import chalk from 'chalk';
import { spinner } from './branding.js';

function craftImagePrompts(projectInfo) {
 const { projectName, description, keyFeatures } = projectInfo;
 return [
  `Ultra high quality hero banner for a software project called "${projectName}". ${description || 'A modern developer tool.'} Stunning, cinematic, futuristic blue and purple gradient. Professional SaaS dashboard aesthetic, glowing particle effects, cinematic lighting, 4K quality.`,
  `Feature showcase illustration for "${projectName}" highlighting: ${(keyFeatures || ['Fast', 'Simple', 'Powerful']).join(', ')}. Modern flat design icon collage, vibrant gradient colours, clean professional illustration style, suitable for a SaaS product landing page.`,
 ];
}

export async function generateImages(apiUrl, projectInfo) {
 const spin = spinner('🎨 Generating images with Flux Klein...');
 try {
  const prompts = craftImagePrompts(projectInfo);
  const results = [];
  for (let i = 0; i < prompts.length; i++) {
   spin.text = `🎨 Generating image ${i + 1}/${prompts.length}...`;
   const resp = await fetch(`${apiUrl}/api/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompts[i], width: 1024, height: 1024 }),
   });
   if (!resp.ok) throw new Error(`generate-image failed: ${resp.status}`);
   const data = await resp.json();
   if (!data.base64) throw new Error('No image data in response');
   results.push(data.base64);
  }
  spin.succeed('Images generated');
  return results;
 } catch (e) {
  spin.fail('Image generation error');
  console.error(chalk.red(e.message || e));
  return [];
 }
}
