/**
 * Logger middleware – self-contained CJS module.
 */
function logger(req, res, startTime) {
  const now = new Date().toISOString();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
             req.socket?.remoteAddress || '';
  const endpoint = req.url;
  const duration = Date.now() - startTime;
  console.log(`[${now}] ${ip} → ${endpoint} (${duration}ms)`);
}

module.exports = { logger };
module.exports = logger;
