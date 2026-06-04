/**
 * config/db.js
 *
 * CHANGES:
 *  • setIO() / emitToUser() for real-time socket pushes (unchanged)
 *  • After all CREATE TABLE statements, runs safe ALTER TABLE migrations
 *    to add any columns that may be missing from already-existing tables.
 *    WHY: CREATE TABLE IF NOT EXISTS never modifies an existing table, so
 *    new columns added after the initial deploy are silently absent —
 *    causing "Unknown column" 500 errors (e.g. comments.likes_count).
 *  • reel_likes and reel_comments now have FK on reel_id (cascade delete)
 *  • UPLOAD_DIR exported so multer.js and server.js share one source of truth
 */

const mysql = require('mysql2/promise');
const path  = require('path');
const fs    = require('fs');

let db;
let _emitToUser = () => {};

/** Called once from server.js after Socket.io is initialised */
function setIO(emitFn) {
  _emitToUser = emitFn;
}

/** Push a socket event to a specific user (all their open tabs) */
function emitToUser(userId, event, payload) {
  _emitToUser(userId, event, payload);
}

/**
 * Persistent upload directory.
 *
 * Railway provides a persistent Volume at /data (or wherever you mount it).
 * Set UPLOAD_DIR=/data/uploads in Railway environment variables.
 * Falls back to ./uploads for local development.
 *
 * IMPORTANT — Railway Volume setup (one-time):
 *   1. Railway dashboard → your backend service → Volumes tab
 *   2. Add Volume: mount path = /data
 *   3. Add env var: UPLOAD_DIR=/data/uploads
 *   Files written to /data survive deploys and restarts.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads');

// Ensure all subdirectories exist at startup
['', 'posts', 'avatars', 'reels', 'stories'].forEach(sub => {
  const dir = sub ? path.join(UPLOAD_DIR, sub) : UPLOAD_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function connectDB() {
  db = await mysql.createPool({
    host:               process.env.MYSQLHOST,
    port:               parseInt(process.env.MYSQLPORT) || 3306,
    user:               process.env.MYSQLUSER,
    password:           process.env.MYSQLPASSWORD,
    database:           process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit:    10,
    ssl:                { rejectUnauthorized: false },
    // ssl required by Aiven — all connections are encrypted
  });

  // ── CREATE tables ───────────────────────────────────────────
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100), bio TEXT, avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    image_url VARCHAR(255), caption TEXT,
    location VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);

  // comments table — includes likes_count for new installs
  await db.execute(`CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL,
    text TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS follows (
    id INT AUTO_INCREMENT PRIMARY KEY, follower_id INT NOT NULL, following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY, recipient_id INT NOT NULL, sender_id INT NOT NULL,
    type ENUM('like','comment','follow') NOT NULL,
    post_id INT DEFAULT NULL, message TEXT, is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)    REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY, sender_id INT NOT NULL, recipient_id INT NOT NULL,
    text TEXT NOT NULL, is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS reels (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    video_url VARCHAR(255) NOT NULL, caption TEXT,
    audio_name VARCHAR(255) DEFAULT 'Original audio',
    views_count INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  // reel_likes — added missing FK on reel_id
  await db.execute(`CREATE TABLE IF NOT EXISTS reel_likes (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reel_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reel_like (user_id, reel_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (reel_id)  REFERENCES reels(id)  ON DELETE CASCADE)`);

  // reel_comments — added missing FK on reel_id
  await db.execute(`CREATE TABLE IF NOT EXISTS reel_comments (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reel_id INT NOT NULL,
    text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (reel_id)  REFERENCES reels(id)  ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS comment_likes (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, comment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_comment_like (user_id, comment_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS stories (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL, caption VARCHAR(200) DEFAULT '',
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS story_views (
    id INT AUTO_INCREMENT PRIMARY KEY, story_id INT NOT NULL, user_id INT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_story_view (story_id, user_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS saved_posts (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_save (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);

  // ── Safe migrations for existing deployments ────────────────
  // These ALTER TABLE statements add columns that may be missing from tables
  // created before the column was introduced. IF NOT EXISTS prevents errors
  // on fresh installs where the column already exists from the CREATE above.
  await db.execute(`
    ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0
  `).catch(() => {
    // Fallback for MySQL versions < 8.0 that don't support IF NOT EXISTS on ALTER
    return db.execute(`
      SELECT COUNT(*) as cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'comments'
        AND COLUMN_NAME  = 'likes_count'
    `).then(([rows]) => {
      if (rows[0].cnt === 0) {
        return db.execute(`ALTER TABLE comments ADD COLUMN likes_count INT DEFAULT 0`);
      }
    });
  });

  console.log('✅ Database tables ready');
}

function getDB() {
  if (!db) throw new Error('Database not initialised — call connectDB() first.');
  return db;
}

module.exports = { connectDB, getDB, setIO, emitToUser, UPLOAD_DIR };