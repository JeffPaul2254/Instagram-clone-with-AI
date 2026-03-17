// controllers/authController.js
// Handles all authentication logic: signup, login, and fetching the current user.

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getDB } = require('../config/db');

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db   = getDB();
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
      [username.toLowerCase().trim(), email.toLowerCase().trim(), hash, full_name || '']
    );
    const token = jwt.sign(
      { id: result.insertId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: result.insertId, username, email, full_name: full_name || '' } });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email.toLowerCase().trim(), email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password: _, ...user } = rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT id, username, email, full_name, bio, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { signup, login, getMe };
