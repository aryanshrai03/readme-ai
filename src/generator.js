/**
 * Generate a premium README.md via the Vercel backend only.
 * No direct NVIDIA NIM calls from the CLI — all AI goes through the backend.
 */

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

export async function generateReadme(context = {}, options = {}) {
  // Build the payload the backend expects
  const payload = {
    projectContext: context || {
      projectName: 'my-project',
      description: '',
      packageJson: {},
      folderStructure: {},
      sourceFiles: [],
      readmeContent: '',
    },
    options: {
      noBanner: options.noBanner || false,
    },
  };

  const resp = await fetch(`${BACKEND}/api/generate-readme`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Backend error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  if (data.error) throw new Error(data.error);

  return {
    readme: data.readme,
    duration: data.duration || '?',
  };
}
