// Minimal HTTP Basic Auth for the admin area. No extra dependency needed —
// the browser handles the login prompt itself once it gets a 401.

function requireAdmin(req, res, next) {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD;

  if (!pass) {
    // Fail closed: if no password has been set, the admin area is blocked
    // rather than left open with a guessable default.
    return res.status(503).send('Admin area is not configured yet. Set ADMIN_PASSWORD in your .env file.');
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const sepIndex = decoded.indexOf(':');
    const suppliedUser = decoded.slice(0, sepIndex);
    const suppliedPass = decoded.slice(sepIndex + 1);
    if (suppliedUser === user && suppliedPass === pass) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="PX Doors Admin"');
  return res.status(401).send('Authentication required.');
}

module.exports = { requireAdmin };
