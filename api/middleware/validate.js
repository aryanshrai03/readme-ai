/**
 * Request validation middleware – self-contained CJS module.
 */
function validate(requiredFields) {
  return (req, res, next) => {
    if (req.headers['content-type'] !== 'application/json') {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
    const size = parseInt(req.headers['content-length'] || '0', 10);
    if (size > 100 * 1024) {
      return res.status(400).json({ error: 'Request body too large (max 100KB)' });
    }
    const missing = [];
    for (const field of requiredFields) {
      if (!(field in req.body)) missing.push(field);
    }
    if (missing.length) {
      return res.status(400).json({ error: 'Missing required fields', missing });
    }
    next();
  };
}

module.exports = { validate };
module.exports = validate;
