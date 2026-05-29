/** Generate two banner/feature images via the Vercel backend (Flux Klein).  Returns array of base64 strings (empty on failure). */

import chalk from 'chalk';
import ora from 'ora';

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

function craftPrompts(projectInfo) {
  const { projectName, description, keyFeatures } = projectInfo;
  const name       = projectName || 'My Project';
  const desc       = description  || 'A modern software project';
  const features   = (keyFeatures && keyFeatures.length) ? keyFeatures.join(', ') : 'simple, fast, elegant';

  return [
    `Ultra high quality hero banner for a software project called "${name}". ${desc}. \
Stunning, cinematic, futuristic blue and purple gradient. Professional SaaS dashboard aesthetic, \
glowing particle effects, cinematic lighting, 4K quality.`,
    `Feature showcase illustration for "${name}" highlighting: ${features}. \
Modern flat design icon collage, vibrant gradient colours, clean professional illustration style.`,
  ];
}

export async function generateImages(apiUrl, projectInfo) {
  const spin = ora({ text: '🎨 Generating images with Flux Klein...', color: 'cyan' }).start();
  try {
    const prompts = craftPrompts(projectInfo);
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
    spin.fail('Image generation failed');
    console.warn(chalk.yellow(e.message));
    return [];
  }
}
