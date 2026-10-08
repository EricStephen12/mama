const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mama-secret-change-in-production';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '90d' });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signToken, requireAuth };
