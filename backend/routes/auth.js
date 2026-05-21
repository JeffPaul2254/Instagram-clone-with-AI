/**
 * routes/auth.js
 *
 * CHANGES from v2:
 *  • GET /facebook          → facebookRedirect   (starts the OAuth flow)
 *  • GET /facebook/callback → facebookCallback   (handles the FB redirect)
 *
 * NOTE: /facebook/callback must NOT have authMiddleware — the user is
 * not yet logged in when Facebook redirects back to this endpoint.
 * The CSRF protection is handled inside facebookCallback via JWT state.
 *
 * NOTE: No rate limiter is added to /facebook routes because server.js
 * already applies authLimiter to /api/auth/login and /api/auth/signup
 * by exact path, and apiLimiter to all /api/ routes in general.
 * The Facebook endpoints inherit apiLimiter (300 req/min), which is
 * appropriate — brute-forcing OAuth codes is not feasible in practice.
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
} = require('../controllers/authController');

router.post('/signup',             signup);
router.post('/login',              login);
router.get('/me',                  authMiddleware, getMe);

// ── Facebook OAuth (no authMiddleware — user is not yet authenticated) ──
router.get('/facebook',            facebookRedirect);
router.get('/facebook/callback',   facebookCallback);

module.exports = router;