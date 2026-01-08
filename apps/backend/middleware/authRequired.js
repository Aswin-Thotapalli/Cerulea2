const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
module.exports = function authRequired(req, res, next) {
  try {
    const token = req.cookies?.cerulea_jwt;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = String(payload.sub);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid session' });
  }
};
