const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'instagram_clone_secret_2024';

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads', { recursive: true });
if (!fs.existsSync('./uploads/posts')) fs.mkdirSync('./uploads/posts', { recursive: true });
if (!fs.existsSync('./uploads/avatars')) fs.mkdirSync('./uploads/avatars', { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.path.includes('avatar') ? './uploads/avatars' : './uploads/posts';
    cb(null, folder);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

let db;
async function initDB() {
  db = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'paulj1887',
    database: 'instagram_clone',
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
    recipient_id INT NOT NULL,
    sender_id INT NOT NULL,
    type ENUM('like','comment','follow') NOT NULL,
    post_id INT DEFAULT NULL,
    message TEXT,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE)`);

  console.log('✅ Database tables ready');
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ── AUTH ─────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
      [username, email, hashed, full_name || username]);
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.insertId, username, email, full_name: full_name || username } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
    if (!rows.length) return res.status(400).json({ error: 'No account found with that username or email' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Wrong password. Please try again.' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, avatar: user.avatar, bio: user.bio } });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const [rows] = await db.execute('SELECT id, username, email, full_name, bio, avatar FROM users WHERE id = ?', [req.user.id]);
  res.json(rows[0]);
});

// ── POSTS ─────────────────────────────────────────────────────
app.post('/api/posts', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;
    const image_url = req.file ? `/uploads/posts/${req.file.filename}` : null;
    if (!image_url && !caption) return res.status(400).json({ error: 'Post must have image or caption' });
    const [result] = await db.execute(
      'INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)',
      [req.user.id, image_url, caption || '']);
    const [post] = await db.execute(`
      SELECT p.*, u.username, u.avatar, u.full_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [result.insertId]);
    res.json(post[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/posts/feed', authMiddleware, async (req, res) => {
  try {
    const [posts] = await db.execute(`
      SELECT p.*, u.username, u.avatar, u.full_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT 50`, [req.user.id]);
    res.json(posts);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── LIKES ─────────────────────────────────────────────────────
app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const [existing] = await db.execute('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
    if (existing.length) {
      await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
      res.json({ liked: false });
    } else {
      await db.execute('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
      // Notify post owner
      const [postRows] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (postRows.length && postRows[0].user_id !== req.user.id) {
        await db.execute(
          'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?, ?, "like", ?, "liked your post")',
          [postRows[0].user_id, req.user.id, postId]);
      }
      res.json({ liked: true });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── COMMENTS ──────────────────────────────────────────────────
app.get('/api/posts/:id/comments', authMiddleware, async (req, res) => {
  const [comments] = await db.execute(`
    SELECT c.*, u.username, u.avatar FROM comments c
    JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC`, [req.params.id]);
  res.json(comments);
});

app.post('/api/posts/:id/comments', authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment cannot be empty' });
  await db.execute('INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)', [req.user.id, req.params.id, text]);
  // Notify post owner
  const [postRows] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
  if (postRows.length && postRows[0].user_id !== req.user.id) {
    await db.execute(
      'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?, ?, "comment", ?, "commented on your post")',
      [postRows[0].user_id, req.user.id, req.params.id]);
  }
  const [rows] = await db.execute(`
    SELECT c.*, u.username, u.avatar FROM comments c
    JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at DESC LIMIT 1`, [req.params.id]);
  res.json(rows[0]);
});

// ── NOTIFICATIONS ─────────────────────────────────────────────
app.get('/api/notifications', authMiddleware, async (req, res) => {
  const [rows] = await db.execute(`
    SELECT n.*, u.username, u.avatar, u.full_name,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = n.sender_id) as is_following
    FROM notifications n
    JOIN users u ON n.sender_id = u.id
    WHERE n.recipient_id = ?
    ORDER BY n.created_at DESC LIMIT 50`, [req.user.id, req.user.id]);
  res.json(rows);
});

app.put('/api/notifications/read', authMiddleware, async (req, res) => {
  await db.execute('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?', [req.user.id]);
  res.json({ ok: true });
});

app.get('/api/notifications/count', authMiddleware, async (req, res) => {
  const [rows] = await db.execute('SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0', [req.user.id]);
  res.json({ count: rows[0].count });
});

// ── USERS ─────────────────────────────────────────────────────
app.get("/api/users/search", authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) return res.json([]);
  const search = "%" + q.trim() + "%";
  const [users] = await db.execute(
    "SELECT id, username, full_name, avatar, (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count FROM users u WHERE (u.username LIKE ? OR u.full_name LIKE ?) AND u.id != ? ORDER BY u.username ASC LIMIT 20",
    [search, search, req.user.id]
  );
  res.json(users);
});

app.get('/api/users/all', authMiddleware, async (req, res) => {
  const [users] = await db.execute(
    'SELECT id, username, full_name, avatar FROM users WHERE id != ? ORDER BY created_at DESC', [req.user.id]);
  res.json(users);
});

app.get('/api/users/suggestions', authMiddleware, async (req, res) => {
  const [users] = await db.execute(`
    SELECT id, username, full_name, avatar,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
    FROM users u WHERE u.id != ? ORDER BY RAND() LIMIT 5`, [req.user.id]);
  res.json(users);
});

app.post('/api/users/:id/follow', authMiddleware, async (req, res) => {
  const followingId = req.params.id;
  const [existing] = await db.execute('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, followingId]);
  if (existing.length) {
    await db.execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, followingId]);
    res.json({ following: false });
  } else {
    await db.execute('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, followingId]);
    await db.execute(
      'INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?, ?, "follow", "started following you")',
      [followingId, req.user.id]);
    res.json({ following: true });
  }
});

app.put('/api/users/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
  const { full_name, bio } = req.body;
  const avatar = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;
  const updates = []; const values = [];
  if (full_name) { updates.push('full_name = ?'); values.push(full_name); }
  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  if (avatar) { updates.push('avatar = ?'); values.push(avatar); }
  if (updates.length) { values.push(req.user.id); await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values); }
  const [rows] = await db.execute('SELECT id, username, email, full_name, bio, avatar FROM users WHERE id = ?', [req.user.id]);
  res.json(rows[0]);
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}).catch(err => { console.error('❌ DB init failed:', err.message); process.exit(1); });
