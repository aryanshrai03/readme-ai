/**
 * Simple rate limiter for CLI usage (not Vercel). Allows one operation per minute.
 */

let lastTime = 0;

export function ensureRateLimit() {
  const now = Date.now();
  if (now - lastTime < 60 * 1000) {
    const wait = Math.ceil((60 * 1000 - (now - lastTime)) / 1000);
    console.log(`Please wait ${wait}s before generating another README.`);
    return false;
  }
  lastTime = now;
  return true;
}
