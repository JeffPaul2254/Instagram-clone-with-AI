// controllers/postController.js
// Handles all post logic: create, feed, explore, like, comment, edit, delete.

const { getDB } = require('../config/db');

// POST /api/posts
async function createPost(req, res) {
  try {
    const db = getDB();
    const { caption } = req.body;
    const image_url = req.file ? '/uploads/posts/' + req.file.filename : null;
    if (!image_url && !caption?.trim())
      return res.status(400).json({ error: 'Post must have an image or caption' });

    const [result] = await db.execute(
      'INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)',
      [req.user.id, image_url, caption?.trim() || '']
    );
    const [rows] = await db.execute(
      `SELECT p.*, u.username, u.avatar, 0 as likes_count, 0 as comments_count, 0 as user_liked
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [result.insertId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/posts/feed
async function getFeed(req, res) {
  try {
    const db = getDB();
    const [posts] = await db.execute(
      `SELECT p.*, u.username, u.avatar, u.full_name,
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)              as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id)              as comments_count,
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) as user_liked
       FROM posts p JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(posts);
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/posts/explore
async function getExplore(req, res) {
  try {
    const db = getDB();
    const [posts] = await db.execute(
      `SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)              as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id)              as comments_count,
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) as user_liked
       FROM posts p JOIN users u ON p.user_id = u.id
       ORDER BY likes_count DESC, p.created_at DESC LIMIT 60`,
      [req.user.id]
    );
    res.json(posts);
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/posts/:id/like
async function toggleLike(req, res) {
  try {
    const db     = getDB();
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID' });

    const [existing] = await db.execute(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
      [req.user.id, postId]
    );
    if (existing.length) {
      await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
      return res.json({ liked: false });
    }
    await db.execute('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
    // Notify the post owner (not yourself)
    const [post] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (post.length && post[0].user_id !== req.user.id) {
      await db.execute(
        'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?,?,?,?,?)',
        [post[0].user_id, req.user.id, 'like', postId, 'liked your post']
      );
    }
    res.json({ liked: true });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/posts/:id/comments
async function getComments(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT c.*, u.username, u.avatar FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/posts/:id/comments
async function addComment(req, res) {
  try {
    const db = getDB();
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

    const [result] = await db.execute(
      'INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)',
      [req.user.id, req.params.id, text.trim().slice(0, 2200)]
    );
    const [rows] = await db.execute(
      `SELECT c.*, u.username, u.avatar FROM comments c
       JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [result.insertId]
    );
    // Notify the post owner
    const [post] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (post.length && post[0].user_id !== req.user.id) {
      await db.execute(
        'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?,?,?,?,?)',
        [post[0].user_id, req.user.id, 'comment', req.params.id, 'commented on your post']
      );
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/posts/:id
async function deletePost(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM posts WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });
    await db.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/posts/:id/caption
async function editCaption(req, res) {
  try {
    const db = getDB();
    const { caption } = req.body;
    const [rows] = await db.execute(
      'SELECT * FROM posts WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });
    await db.execute('UPDATE posts SET caption = ? WHERE id = ?', [caption?.trim() || '', req.params.id]);
    res.json({ ok: true, caption });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createPost, getFeed, getExplore, toggleLike, getComments, addComment, deletePost, editCaption };
