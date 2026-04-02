// controllers/reelController.js
// Handles all reel logic: upload, feed, like, comment, delete, view tracking.

const fs = require('fs');
const { getDB } = require('../config/db');
const { ALLOWED_VIDEO_MIMES } = require('../config/multer');

// POST /api/reels
async function uploadReel(req, res) {
  try {
    const db = getDB();
    if (!req.file) return res.status(400).json({ error: 'Video is required' });
    if (!ALLOWED_VIDEO_MIMES.has(req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Only video files are allowed' });
    }
    const { caption, audio_name } = req.body;
    const video_url = '/uploads/reels/' + req.file.filename;

    const [result] = await db.execute(
      'INSERT INTO reels (user_id, video_url, caption, audio_name) VALUES (?, ?, ?, ?)',
      [req.user.id, video_url, caption?.trim() || '', audio_name?.trim() || 'Original audio']
    );
    const [rows] = await db.execute(
      `SELECT r.*, u.username, u.avatar, u.full_name,
         0 as likes_count, 0 as comments_count, 0 as user_liked
       FROM reels r JOIN users u ON r.user_id = u.id WHERE r.id = ?`,
      [result.insertId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Reel upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/reels
async function getReels(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT r.*, u.username, u.avatar, u.full_name,
         (SELECT COUNT(*) FROM reel_likes    WHERE reel_id = r.id)              as likes_count,
         (SELECT COUNT(*) FROM reel_comments WHERE reel_id = r.id)              as comments_count,
         (SELECT COUNT(*) FROM reel_likes    WHERE reel_id = r.id AND user_id = ?) as user_liked
       FROM reels r JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/reels/:id/like
async function toggleLike(req, res) {
  try {
    const db     = getDB();
    const reelId = parseInt(req.params.id);
    const [existing] = await db.execute(
      'SELECT id FROM reel_likes WHERE user_id = ? AND reel_id = ?',
      [req.user.id, reelId]
    );
    if (existing.length) {
      await db.execute('DELETE FROM reel_likes WHERE user_id = ? AND reel_id = ?', [req.user.id, reelId]);
      return res.json({ liked: false });
    }
    await db.execute('INSERT INTO reel_likes (user_id, reel_id) VALUES (?, ?)', [req.user.id, reelId]);
    res.json({ liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/reels/:id/comments
async function getComments(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT rc.*, u.username, u.avatar FROM reel_comments rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.reel_id = ? ORDER BY rc.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/reels/:id/comments
async function addComment(req, res) {
  try {
    const db = getDB();
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

    const [result] = await db.execute(
      'INSERT INTO reel_comments (user_id, reel_id, text) VALUES (?, ?, ?)',
      [req.user.id, req.params.id, text.trim().slice(0, 2200)]
    );
    const [rows] = await db.execute(
      `SELECT rc.*, u.username, u.avatar FROM reel_comments rc
       JOIN users u ON rc.user_id = u.id WHERE rc.id = ?`,
      [result.insertId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/reels/:id
async function deleteReel(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM reels WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });
    await db.execute('DELETE FROM reels WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/reels/:id/view
async function trackView(req, res) {
  try {
    const db = getDB();
    await db.execute('UPDATE reels SET views_count = views_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
}

module.exports = { uploadReel, getReels, toggleLike, getComments, addComment, deleteReel, trackView };
