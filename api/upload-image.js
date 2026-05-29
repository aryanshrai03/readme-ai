/**
 * API route: upload a base64 image to ImgBB.
 * Self-contained ESM.
 */

export default async function handler(req, res) {
  try {
    const imgbbKey = process.env.IMGBB_API_KEY;
    if (!imgbbKey) return res.status(500).json({ error: 'IMGBB_API_KEY not set in api/.env' });

    const { image, name = 'readme-banner' } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Missing required field: image (base64 string)' });

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('key', imgbbKey);
    form.append('image', image);
    form.append('name', name);

    const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    const result = await response.json();

    if (!response.ok) return res.status(502).json({ error: 'ImgBB upload failed', details: result });

    const url = result?.data?.url;
    if (!url) return res.status(500).json({ error: 'ImgBB response missing URL', raw: result });

    res.status(200).json({ url, deleteUrl: result?.data?.delete_url });
  } catch (err) {
    console.error('upload-image error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
