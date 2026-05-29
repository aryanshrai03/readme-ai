/** Chat-update a markdown file via the Vercel backend.  All AI goes through /api/update-readme. */

const BACKEND = 'https://readme-ai-74865994a872918.vercel.app';

export async function updateReadme(newContent, instructions, conversationHistory = [], activeFile) {
  const spin = ora({ text: '🤖 Sending update request...', color: 'cyan' }).start();
  try {
    const resp = await fetch(`${BACKEND}/api/update-readme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentContent:     newContent,
        instructions,
        conversationHistory,
        activeFile: activeFile ?? 'unknown.md',
      }),
    });

    if (!resp.ok) throw new Error(`Backend error ${resp.status}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    spin.succeed('Update complete');
    return { readme: data.readme, duration: data.duration ?? '?' };
  } catch (e) {
    spin.fail('Update failed');
    throw e;
  }
}
