/**
 * config/db.js
 *
 * CHANGES from v1:
 *  • Added setIO() / emitToUser() so controllers can push Socket.io events
 *    without importing the io instance or the server file.
 *
 *    Usage in a controller:
 *      const { emitToUser } = require('../config/db');
 *      emitToUser(recipientId, 'notification:new', notificationRow);
 */

const mysql = require('mysql2/promise');

let db;
let _emitToUser = () => {};   // no-op until server.js calls setIO()

/** Called once from server.js after Socket.io is initialised */
function setIO(emitFn) {
  _emitToUser = emitFn;
}

/** Push a socket event to a specific user (all their open tabs) */
function emitToUser(userId, event, payload) {
  _emitToUser(userId, event, payload);
}

async function connectDB() {
  db = await mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME     || 'instagram_clone',
    waitForConnections: true,
    connectionLimit:    10,
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS reel_comments (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reel_id INT NOT NULL,
    text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  console.log('✅ Database tables ready');
}

function getDB() {
  if (!db) throw new Error('Database not initialised — call connectDB() first.');
  return db;
}

module.exports = { connectDB, getDB, setIO, emitToUser };
