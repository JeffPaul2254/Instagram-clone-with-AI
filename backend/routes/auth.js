// routes/auth.js
// Defines the URL paths for authentication.
// Routes call the matching controller function — no logic lives here.

const express    = require('express');
const router     = express.Router();
const authMiddleware = require('../middleware/auth');
const { signup, login, getMe } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login',  login);
router.get('/me',      authMiddleware, getMe);

module.exports = router;
