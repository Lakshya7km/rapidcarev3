const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });
    try {
      const payload = jwt.verify(token, getJwtSecret());
      req.user = payload;
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    } catch (err) {
      console.error('Auth Error:', err.message, 'Token:', token);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

function optionalAuth() {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    try {
      const payload = jwt.verify(token, getJwtSecret());
      req.user = payload;
    } catch (err) {
      // Ignore invalid tokens for optional auth
    }
    next();
  };
}

module.exports = { auth, optionalAuth, getJwtSecret };





