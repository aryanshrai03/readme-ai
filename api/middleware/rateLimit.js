/**
 * Rate-limit middleware – self-contained CJS module.
 * In-memory stores: map of IP → timestamps, and banned IPs.
 */
const ipMap = new Map();
const banned = new Map();

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

function rateLimit(req, res) {
  const ip = getIp(req);
  const now = Date.now();

  // check ban
  const banExpiry = banned.get(ip);
  if (banExpiry && banExpiry > now) {
    res.setHeader('Retry-After', Math.ceil((banExpiry - now) / 1000));
    res.status(403).json({ error: 'IP banned due to abuse', retryAfter: Math.ceil((banExpiry - now) / 1000) });
    return true;
  } else if (banExpiry) {
    banned.delete(ip);
  }

  const timestamps = ipMap.get(ip) || [];
  const windowMs = 5 * 60 * 1000;
  const recent = timestamps.filter(t => now - t < windowMs);
  recent.push(now);
  ipMap.set(ip, recent);

  if (recent.length > 20) {
    const oldest = recent[0];
    const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({ error: 'Rate limit exceeded. Max 20 requests per 5 minutes.', retryAfter });
    return true;
  }

  // abuse detection: >30 req in 10 min -> 24h ban
  const abuseWindow = 10 * 60 * 1000;
  const abuseRecent = timestamps.filter(t => now - t < abuseWindow);
  if (abuseRecent.length >= 30) {
    const banUntil = now + 24 * 60 * 60 * 1000;
    banned.set(ip, banUntil);
    console.warn(`IP ${ip} banned for abuse until ${new Date(banUntil).toISOString()}`);
    res.setHeader('Retry-After', Math.ceil(24 * 60 * 60));
    res.status(403).json({ error: 'IP banned for abuse', retryAfter: 86400 });
    return true;
  }

  return false;
}

module.exports = { rateLimit };
