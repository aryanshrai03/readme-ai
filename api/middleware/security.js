/**
 * Security headers middleware – self-contained CJS module.
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'self';");
  next();
}

module.exports = { securityHeaders };
module.exports = securityHeaders;
