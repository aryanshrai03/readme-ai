/**
 * API route: generate an image via NVIDIA FLUX.2-Klein-4B.
 * Self-contained ESM.
 */

const NIM_KEY = process.env.NVIDIA_API_KEY || '';
const IMG_URL = process.env.NVIDIA_IMAGE_URL || 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b';

export default async function handler(req, res) {
  try {
    if (!NIM_KEY) return res.status(500).json({ error: 'NVIDIA_API_KEY is not set in api/.env' });
    const { prompt, width = 1024, height = 1024, steps = 4, seed } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing required field: prompt' });

    const payload = {
      prompt,
      width: Number(width),
      height: Number(height),
      steps: Number(steps),
      seed: seed ?? Math.floor(Math.random() * 1_000_000),
      cfg_scale: 7.5,
    };

    const resp = await fetch(IMG_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NIM_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: `NVIDIA image API error ${resp.status}`, details: text });
    }

    const data = await resp.json();
    const image = data?.image || data?.artifacts?.[0]?.base64 || data?.output?.image || null;
    if (!image) return res.status(500).json({ error: 'No image data returned', raw: data });

    res.status(200).json({ image, model: 'black-forest-labs/flux.2-klein-4b' });
  } catch (err) {
    console.error('generate-image error:', err);
    res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
