/**
 * config/db.js
 *
 * CHANGES from v2:
 *  • Safe ALTER TABLE migrations for Facebook OAuth columns:
 *      - users.facebook_id   VARCHAR(100) NULL UNIQUE  — FB user ID
 *      - users.password      → made nullable (FB users have no password)
 *      - users.email         → made nullable (FB users may deny email)
 *    WHY: CREATE TABLE IF NOT EXISTS never modifies existing tables.
 *    The ALTER statements use IF NOT EXISTS (MySQL 8+) with a
 *    fallback information_schema check for older MySQL versions,
 *    identical to the existing likes_count migration pattern.
 *
 * Everything else is unchanged from v2.
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
 * Railway Volume: set UPLOAD_DIR=/data/uploads in Railway env vars.
 * Falls back to ./uploads for local development.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads');

['', 'posts', 'avatars', 'reels', 'stories'].forEach(sub => {
  const dir = sub ? path.join(UPLOAD_DIR, sub) : UPLOAD_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function connectDB() {
  db = await mysql.createPool({
    host:               process.env.MYSQLHOST,
    user:               process.env.MYSQLUSER,
    password:           process.env.MYSQLPASSWORD,
    database:           process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit:    10,
  });

  // ── CREATE tables (unchanged from v2) ───────────────────────
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE, password VARCHAR(255),
    full_name VARCHAR(100), bio TEXT, avatar VARCHAR(255),
    facebook_id VARCHAR(100) UNIQUE DEFAULT NULL,
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

  await db.execute(`CREATE TABLE IF NOT EXISTS reel_likes (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reel_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reel_like (user_id, reel_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (reel_id)  REFERENCES reels(id)  ON DELETE CASCADE)`);

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

  // ── Safe migration: likes_count (existing from v2) ──────────
  await db.execute(`
    ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0
  `).catch(() => {
    return db.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'comments'
        AND COLUMN_NAME  = 'likes_count'
    `).then(([rows]) => {
      if (rows[0].cnt === 0)
        return db.execute(`ALTER TABLE comments ADD COLUMN likes_count INT DEFAULT 0`);
    });
  });

  // ── Safe migration: facebook_id column ──────────────────────
  // Adds facebook_id to the users table on existing deployments.
  await db.execute(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(100) NULL UNIQUE
  `).catch(() => {
    return db.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'users'
        AND COLUMN_NAME  = 'facebook_id'
    `).then(([rows]) => {
      if (rows[0].cnt === 0)
        return db.execute(`ALTER TABLE users ADD COLUMN facebook_id VARCHAR(100) NULL`).then(() =>
          // Add UNIQUE index separately so it doesn't fail if column was just added
          db.execute(`ALTER TABLE users ADD UNIQUE INDEX idx_facebook_id (facebook_id)`)
            .catch(() => {}) // ignore if index already exists
        );
    });
  });

  // ── Safe migration: make email nullable (FB users may not share it) ──
  // MySQL silently ignores this if the column definition is already correct.
  // We check the IS_NULLABLE flag to avoid a redundant ALTER.
  await db.execute(`
    SELECT IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'email'
  `).then(([rows]) => {
    if (rows.length && rows[0].IS_NULLABLE === 'NO') {
      return db.execute(`ALTER TABLE users MODIFY email VARCHAR(100) NULL`);
    }
  }).catch(() => {});

  // ── Safe migration: make password nullable (FB users have no password) ──
  await db.execute(`
    SELECT IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'password'
  `).then(([rows]) => {
    if (rows.length && rows[0].IS_NULLABLE === 'NO') {
      return db.execute(`ALTER TABLE users MODIFY password VARCHAR(255) NULL`);
    }
  }).catch(() => {});

  console.log('✅ Database tables ready');
}

function getDB() {
  if (!db) throw new Error('Database not initialised — call connectDB() first.');
  return db;
}

module.exports = { connectDB, getDB, setIO, emitToUser, UPLOAD_DIR };