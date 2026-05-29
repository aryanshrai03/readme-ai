/** Generate a markdown file via the Vercel backend. All AI goes through the backend — no direct API calls from CLI. */

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

const FILE_TYPE_NAMES = {
  readme: 'README',
  changelog: 'CHANGELOG',
  contributing: 'CONTRIBUTING',
  documentation: 'documentation',
  'api-reference': 'API reference',
  general: 'markdown',
};

export function detectFileType(filePath) {
  const name = filePath?.split(/[/\\]/).pop()?.toLowerCase() || '';
  const ext = name.split('.').pop() || '';
  if (ext !== 'md') return 'general';
  const base = name.replace(/\.md$/, '');
  switch (base) {
    case 'readme': return 'readme';
    case 'changelog': return 'changelog';
    case 'contributing': return 'contributing';
    case 'docs': return 'documentation';
    case 'api': return 'api-reference';
    default: return 'general';
  }
}

export async function generateReadme(context = {}, options = {}) {
  const fileTypeLabel = FILE_TYPE_NAMES[context.fileType] || 'markdown';
  const payload = {
    projectContext: context,
    options,
    fileType: context.fileType,
    fileTypeLabel,
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
