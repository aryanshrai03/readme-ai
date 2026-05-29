/** Generate a markdown file via the Vercel backend.  All AI goes through the backend — no direct API calls from CLI. */

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

export async function generateReadme(context = {}, options = {}) {
  const payload = {
    projectContext: context,
    options,
  };

  const resp = await fetch(`${BACKEND}/api/generate-readme`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Backend error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (data.error) throw new Error(data.error);

  return { readme: data.readme, duration: data.duration ?? '?' };
}
