require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── UPLOADS ───────────────────────────────────────────────────
['./uploads', './uploads/posts', './uploads/avatars', './uploads/reels'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path.includes('avatar') || req.path.includes('profile')) return cb(null, './uploads/avatars');
    if (req.path.includes('reels')) return cb(null, './uploads/reels');
    cb(null, './uploads/posts');
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const fileFilter = (req, file, cb) => {
  const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } });

// ── RATE LIMITING ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  validate: { xForwardedForHeader: false },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/', apiLimiter);

// ── DATABASE ──────────────────────────────────────────────────
let db;
async function initDB() {
  db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'instagram_clone',
    waitForConnections: true,
    connectionLimit: 10,
  });

  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100), bio TEXT, avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    image_url VARCHAR(255), caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL,
    text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS follows (
    id INT AUTO_INCREMENT PRIMARY KEY, follower_id INT NOT NULL, following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL, sender_id INT NOT NULL,
    type ENUM('like','comment','follow') NOT NULL,
    post_id INT DEFAULT NULL, message TEXT, is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL, recipient_id INT NOT NULL,
    text TEXT NOT NULL, is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE)`);

  // Separate reel_likes table to avoid ID collision with posts
  await db.execute(`CREATE TABLE IF NOT EXISTS reel_likes (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reel_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reel_like (user_id, reel_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS reel_comments (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reel_id INT NOT NULL,
    text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS reels (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    video_url VARCHAR(255) NOT NULL, caption TEXT,
    audio_name VARCHAR(255) DEFAULT 'Original audio',
    views_count INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  console.log('✅ Database tables ready');
}

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

// ── AUTH ──────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
      [username.toLowerCase().trim(), email.toLowerCase().trim(), hash, full_name || '']
    );
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.insertId, username, email, full_name: full_name || '' } });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required' });
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email.toLowerCase().trim(), email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const { password: _, ...user } = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, username, email, full_name, bio, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── POSTS ─────────────────────────────────────────────────────
app.post('/api/posts', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;
    const image_url = req.file ? '/uploads/posts/' + req.file.filename : null;
    if (!image_url && !caption?.trim()) return res.status(400).json({ error: 'Post must have image or caption' });
    const [result] = await db.execute(
      'INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)',
      [req.user.id, image_url, caption?.trim() || '']
    );
    const [rows] = await db.execute(`
      SELECT p.*, u.username, u.avatar, 0 as likes_count, 0 as comments_count, 0 as user_liked
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [result.insertId]);
    res.json(rows[0]);
  } catch (err) { console.error('Create post error:', err); res.status(500).json({ error: 'Server error' }); }
});

// Feed: all posts ordered by newest
app.get('/api/posts/feed', authMiddleware, async (req, res) => {
  try {
    const [posts] = await db.execute(`
      SELECT p.*, u.username, u.avatar, u.full_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50`,
      [req.user.id]);
    res.json(posts);
  } catch (err) { console.error('Feed error:', err); res.status(500).json({ error: 'Server error' }); }
});

// Explore: all posts sorted by engagement (not from feed)
app.get('/api/posts/explore', authMiddleware, async (req, res) => {
  try {
    const [posts] = await db.execute(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY likes_count DESC, p.created_at DESC
      LIMIT 60`, [req.user.id]);
    res.json(posts);
  } catch (err) { console.error('Explore error:', err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID' });
    const [existing] = await db.execute('SELECT id FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
    if (existing.length) {
      await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
      res.json({ liked: false });
    } else {
      await db.execute('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
      // Notify post owner (not yourself)
      const [post] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (post.length && post[0].user_id !== req.user.id) {
        await db.execute(
          'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?,?,?,?,?)',
          [post[0].user_id, req.user.id, 'like', postId, 'liked your post']
        );
      }
      res.json({ liked: true });
    }
  } catch (err) { console.error('Like error:', err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT c.*, u.username, u.avatar FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? ORDER BY c.created_at ASC`, [req.params.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
    const [result] = await db.execute(
      'INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)',
      [req.user.id, req.params.id, text.trim().slice(0, 2200)]
    );
    const [rows] = await db.execute(
      'SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [result.insertId]
    );
    // Notify post owner
    const [post] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (post.length && post[0].user_id !== req.user.id) {
      await db.execute(
        'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?,?,?,?,?)',
        [post[0].user_id, req.user.id, 'comment', req.params.id, 'commented on your post']
      );
    }
    res.json(rows[0]);
  } catch (err) { console.error('Comment error:', err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM posts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });
    await db.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/posts/:id/caption', authMiddleware, async (req, res) => {
  try {
    const { caption } = req.body;
    const [rows] = await db.execute('SELECT * FROM posts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });
    await db.execute('UPDATE posts SET caption = ? WHERE id = ?', [caption?.trim() || '', req.params.id]);
    res.json({ ok: true, caption });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT n.*, u.username, u.avatar FROM notifications n
      JOIN users u ON n.sender_id = u.id
      WHERE n.recipient_id = ? ORDER BY n.created_at DESC LIMIT 50`, [req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/notifications/read', authMiddleware, async (req, res) => {
  try {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/notifications/count', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0', [req.user.id]);
    res.json({ count: rows[0].count });
  } catch { res.json({ count: 0 }); }
});

// ── USERS ─────────────────────────────────────────────────────
app.get('/api/users/search', authMiddleware, async (req, res) => {
  try {
    const q = `%${(req.query.q || '').trim()}%`;
    const [rows] = await db.execute(
      'SELECT id, username, full_name, avatar FROM users WHERE (username LIKE ? OR full_name LIKE ?) AND id != ? LIMIT 20',
      [q, q, req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users/all', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, username, full_name, avatar FROM users ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Suggestions: users not yet followed, random sample using offset trick (no RAND() table scan)
app.get('/api/users/suggestions', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, username, full_name, avatar,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = users.id) as is_following,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count
      FROM users
      WHERE id != ?
      ORDER BY created_at DESC
      LIMIT 10`, [req.user.id, req.user.id]);
    // Prioritise unfollowed users first, then shuffle
    const unfollowed = rows.filter(r => !r.is_following);
    const followed = rows.filter(r => r.is_following);
    const sorted = [...unfollowed.sort(() => Math.random() - 0.5), ...followed].slice(0, 5);
    res.json(sorted);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/users/:id/follow', authMiddleware, async (req, res) => {
  try {
    const followingId = parseInt(req.params.id);
    if (followingId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
    const [existing] = await db.execute('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, followingId]);
    if (existing.length) {
      await db.execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, followingId]);
      res.json({ following: false });
    } else {
      await db.execute('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, followingId]);
      await db.execute(
        'INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?,?,?,?)',
        [followingId, req.user.id, 'follow', 'started following you']
      );
      res.json({ following: true });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/users/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { full_name, bio } = req.body;
    const avatar = req.file ? '/uploads/avatars/' + req.file.filename : undefined;
    const updates = [];
    const vals = [];
    if (full_name !== undefined) { updates.push('full_name = ?'); vals.push(full_name.trim().slice(0, 100)); }
    if (bio !== undefined) { updates.push('bio = ?'); vals.push(bio.trim().slice(0, 500)); }
    if (avatar) { updates.push('avatar = ?'); vals.push(avatar); }
    if (updates.length) {
      vals.push(req.user.id);
      await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, vals);
    }
    const [rows] = await db.execute('SELECT id, username, email, full_name, bio, avatar FROM users WHERE id = ?', [req.user.id]);
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users/:username/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.username, u.full_name, u.bio, u.avatar, u.created_at,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following,
        (u.id = ?) as is_own
      FROM users u WHERE u.username = ?`, [req.user.id, req.user.id, req.params.username]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users/:username/posts', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE u.username = ? ORDER BY p.created_at DESC`, [req.user.id, req.params.username]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── MESSAGES ──────────────────────────────────────────────────
app.get('/api/messages/conversations', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.username, u.full_name, u.avatar,
        m.text as last_message, m.created_at as last_message_at, m.sender_id as last_sender_id,
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND recipient_id = ? AND is_read = 0) as unread_count
      FROM users u
      JOIN messages m ON (
        (m.sender_id = u.id AND m.recipient_id = ?) OR
        (m.sender_id = ? AND m.recipient_id = u.id)
      )
      WHERE u.id != ?
        AND m.id = (
          SELECT id FROM messages m2
          WHERE (m2.sender_id = u.id AND m2.recipient_id = ?)
             OR (m2.sender_id = ? AND m2.recipient_id = u.id)
          ORDER BY m2.created_at DESC LIMIT 1
        )
      ORDER BY m.created_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) { console.error('Conversations error:', err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/messages/unread/count', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = 0', [req.user.id]);
    res.json({ count: rows[0].count });
  } catch { res.json({ count: 0 }); }
});

app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const otherId = parseInt(req.params.userId);
    if (isNaN(otherId)) return res.status(400).json({ error: 'Invalid user ID' });
    const [rows] = await db.execute(`
      SELECT m.*, u.username, u.avatar FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
      ORDER BY m.created_at ASC LIMIT 200`,
      [req.user.id, otherId, otherId, req.user.id]);
    await db.execute('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND recipient_id = ? AND is_read = 0', [otherId, req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
    const recipientId = parseInt(req.params.userId);
    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, recipient_id, text) VALUES (?, ?, ?)',
      [req.user.id, recipientId, text.trim().slice(0, 2000)]
    );
    const [rows] = await db.execute(
      'SELECT m.*, u.username, u.avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
      [result.insertId]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    await db.execute('DELETE FROM messages WHERE id = ? AND sender_id = ?', [req.params.messageId, req.user.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── REELS ─────────────────────────────────────────────────────
app.post('/api/reels', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Video is required' });
    if (!ALLOWED_VIDEO_TYPES.includes(req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Only video files are allowed' });
    }
    const { caption, audio_name } = req.body;
    const video_url = '/uploads/reels/' + req.file.filename;
    const [result] = await db.execute(
      'INSERT INTO reels (user_id, video_url, caption, audio_name) VALUES (?, ?, ?, ?)',
      [req.user.id, video_url, caption?.trim() || '', audio_name?.trim() || 'Original audio']
    );
    const [rows] = await db.execute(`
      SELECT r.*, u.username, u.avatar, u.full_name, 0 as likes_count, 0 as comments_count, 0 as user_liked
      FROM reels r JOIN users u ON r.user_id = u.id WHERE r.id = ?`, [result.insertId]);
    res.json(rows[0]);
  } catch (err) { console.error('Reel upload error:', err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/reels', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.*, u.username, u.avatar, u.full_name,
        (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as likes_count,
        (SELECT COUNT(*) FROM reel_comments WHERE reel_id = r.id) as comments_count,
        (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) as user_liked
      FROM reels r JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC LIMIT 50`, [req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/reels/:id/like', authMiddleware, async (req, res) => {
  try {
    const reelId = parseInt(req.params.id);
    const [existing] = await db.execute('SELECT id FROM reel_likes WHERE user_id = ? AND reel_id = ?', [req.user.id, reelId]);
    if (existing.length) {
      await db.execute('DELETE FROM reel_likes WHERE user_id = ? AND reel_id = ?', [req.user.id, reelId]);
      res.json({ liked: false });
    } else {
      await db.execute('INSERT INTO reel_likes (user_id, reel_id) VALUES (?, ?)', [req.user.id, reelId]);
      res.json({ liked: true });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/reels/:id/comments', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT rc.*, u.username, u.avatar FROM reel_comments rc
      JOIN users u ON rc.user_id = u.id
      WHERE rc.reel_id = ? ORDER BY rc.created_at ASC`, [req.params.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/reels/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
    const [result] = await db.execute(
      'INSERT INTO reel_comments (user_id, reel_id, text) VALUES (?, ?, ?)',
      [req.user.id, req.params.id, text.trim().slice(0, 2200)]
    );
    const [rows] = await db.execute(
      'SELECT rc.*, u.username, u.avatar FROM reel_comments rc JOIN users u ON rc.user_id = u.id WHERE rc.id = ?',
      [result.insertId]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/reels/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM reels WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });
    await db.execute('DELETE FROM reels WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/reels/:id/view', authMiddleware, async (req, res) => {
  try {
    await db.execute('UPDATE reels SET views_count = views_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

// ── START ─────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
