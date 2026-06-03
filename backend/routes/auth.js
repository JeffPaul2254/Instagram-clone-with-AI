/**
 * routes/auth.js
 *
 * CHANGES from v3 (Facebook OAuth):
 *  • POST /forgot-password  → forgotPassword  (step 1: find account, send email)
 *  • POST /reset-password   → resetPassword   (step 3: set new password via token)
 *
 * Both routes have NO authMiddleware — the user is not logged in during
 * a password reset flow by definition.
 *
 * Rate limiting: server.js already applies authLimiter to /api/auth/login
 * and /api/auth/signup. The two new routes fall under apiLimiter (300 req/min)
 * which is appropriate — an attacker can't usefully brute-force a 64-char
 * random token at that rate. For production, a tighter per-IP limiter on
 * /forgot-password would be advisable.
 */

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  signup,
  login,
  getMe,
  facebookRedirect,
  facebookCallback,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/signup',             signup);
router.post('/login',              login);
router.get('/me',                  authMiddleware, getMe);

// ── Facebook OAuth (no authMiddleware — user is not yet authenticated) ──
router.get('/facebook',            facebookRedirect);
router.get('/facebook/callback',   facebookCallback);

// ── Password reset (no authMiddleware — user cannot log in) ────────────
router.post('/forgot-password',    forgotPassword);
router.post('/reset-password',     resetPassword);

module.exports = router;
