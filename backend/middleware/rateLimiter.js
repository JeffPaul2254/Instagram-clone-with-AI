// middleware/rateLimiter.js
// Prevents brute-force attacks by limiting how many requests a client can make.
// authLimiter: strict — only 20 login/signup attempts per 15 minutes.
// apiLimiter: lenient — 300 general API requests per minute.

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  validate: { xForwardedForHeader: false },
});

module.exports = { authLimiter, apiLimiter };
