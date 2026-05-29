import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(os.homedir(), '.readme-ai');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (_) {
    // No config file – return empty config (no API keys needed)
    return {};
  }
}

export async function saveConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// For compatibility – no interactive setup required in free mode
export async function firstTimeSetup() {
  console.log('No setup required for free mode.');
  return {};
}

export async function resetConfig() {
  try {
    await fs.unlink(CONFIG_PATH);
    console.log('Config reset.');
  } catch (_) {}
  return {};
}
