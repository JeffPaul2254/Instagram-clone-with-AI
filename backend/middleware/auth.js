// middleware/auth.js
// Protects routes by verifying the JWT token sent with every request.
// If the token is valid, req.user is populated and the request continues.
// If invalid or missing, the request is rejected with a 401 error.

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next(); // Token valid — move on to the route handler
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
