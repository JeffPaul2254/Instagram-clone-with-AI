/**
 * controllers/postController.js
 *
 * CHANGES from v1:
 *  • toggleLike and addComment now call emitToUser() after inserting a
 *    notification row, pushing both the notification itself and an updated
 *    unread count to the post owner in real time.
 *    This replaces the 10-second notification polling in Navbar.js.
 */

const { getDB, emitToUser } = require('../config/db');

// POST /api/posts
async function createPost(req, res) {
  try {
    const db = getDB();
    const { caption, location } = req.body;
    const image_url = req.file ? '/uploads/posts/' + req.file.filename : null;
    if (!image_url && !caption?.trim())
    return res.status(400).json({ error: 'Post must have an image or caption' });

    const [result] = await db.execute(
    'INSERT INTO posts (user_id, image_url, caption, location) VALUES (?, ?, ?, ?)',
    [req.user.id, image_url, caption?.trim() || '', location?.trim().slice(0, 100) || null]
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
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) as user_liked,
        (SELECT COUNT(*) FROM saved_posts WHERE post_id = p.id AND user_id = ?) as user_saved
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?
          OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY p.created_at DESC LIMIT 50`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
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
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) as user_liked,
        (SELECT COUNT(*) FROM saved_posts WHERE post_id = p.id AND user_id = ?) as user_saved
       FROM posts p JOIN users u ON p.user_id = u.id
       ORDER BY likes_count DESC, p.created_at DESC LIMIT 60`,
      [req.user.id, req.user.id]
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
      const [notifResult] = await db.execute(
        'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?,?,?,?,?)',
        [post[0].user_id, req.user.id, 'like', postId, 'liked your post']
      );
      // Fetch the full notification row to push via socket
      const [notifRows] = await db.execute(
        `SELECT n.*, u.username, u.avatar FROM notifications n
         JOIN users u ON n.sender_id = u.id WHERE n.id = ?`,
        [notifResult.insertId]
      );
      emitToUser(post[0].user_id, 'notification:new', notifRows[0]);

      // Push updated unread count
      const [countRows] = await db.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0',
        [post[0].user_id]
      );
      emitToUser(post[0].user_id, 'notification:count', { count: countRows[0].count });
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
      `SELECT c.*, u.username, u.avatar,
         COALESCE(c.likes_count, 0) as likes_count,
         EXISTS(
           SELECT 1 FROM comment_likes cl
           WHERE cl.comment_id = c.id AND cl.user_id = ?
         ) AS user_liked
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.user.id, req.params.id]
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
    res.json(rows[0]);

    // Notify the post owner
    const [post] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (post.length && post[0].user_id !== req.user.id) {
      const [notifResult] = await db.execute(
        'INSERT INTO notifications (recipient_id, sender_id, type, post_id, message) VALUES (?,?,?,?,?)',
        [post[0].user_id, req.user.id, 'comment', req.params.id, 'commented on your post']
      );
      const [notifRows] = await db.execute(
        `SELECT n.*, u.username, u.avatar FROM notifications n
         JOIN users u ON n.sender_id = u.id WHERE n.id = ?`,
        [notifResult.insertId]
      );
      emitToUser(post[0].user_id, 'notification:new', notifRows[0]);

      const [countRows] = await db.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0',
        [post[0].user_id]
      );
      emitToUser(post[0].user_id, 'notification:count', { count: countRows[0].count });
    }
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

// GET /api/posts/:id/likes
async function getLikes(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.full_name, u.avatar,
         (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
       FROM likes l
       JOIN users u ON l.user_id = u.id
       WHERE l.post_id = ?
       ORDER BY l.created_at DESC`,
      [req.user.id, req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getLikes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/posts/:id  — fetch a single post by id (used by PostDetailPage)
async function getPost(req, res) {
  try {
    const db     = getDB();
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID' });

    const [rows] = await db.execute(
      `SELECT p.*, u.username, u.avatar, u.full_name,
         (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)                 as likes_count,
         (SELECT COUNT(*) FROM comments WHERE post_id = p.id)                 as comments_count,
         (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) as user_liked,
         (SELECT COUNT(*) FROM saved_posts WHERE post_id = p.id AND user_id = ?) as user_saved
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [req.user.id, req.user.id, postId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getPost error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/posts/:id/save  — toggle save/unsave (idempotent)
async function toggleSave(req, res) {
  try {
    const db     = getDB();
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID' });

    const [existing] = await db.execute(
      'SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ?',
      [req.user.id, postId]
    );
    if (existing.length) {
      await db.execute('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
      return res.json({ saved: false });
    }
    await db.execute('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
    res.json({ saved: true });
  } catch (err) {
    console.error('toggleSave error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/posts/saved  — get all posts saved by the current user
async function getSaved(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT p.*, u.username, u.avatar, u.full_name,
         (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)                 as likes_count,
         (SELECT COUNT(*) FROM comments WHERE post_id = p.id)                 as comments_count,
         (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) as user_liked,
         1 as user_saved,
         sp.created_at as saved_at
       FROM saved_posts sp
       JOIN posts p ON sp.post_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE sp.user_id = ?
       ORDER BY sp.created_at DESC`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getSaved error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/posts/comments/:commentId/like
async function toggleCommentLike(req, res) {
  try {
    const db        = getDB();
    const commentId = parseInt(req.params.commentId);
    if (isNaN(commentId)) return res.status(400).json({ error: 'Invalid comment ID' });

    const [existing] = await db.execute(
      'SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?',
      [req.user.id, commentId]
    );

    if (existing.length) {
      // Already liked — remove the like and decrement counter
      await db.execute(
        'DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?',
        [req.user.id, commentId]
      );
      await db.execute(
        'UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?',
        [commentId]
      );
      return res.json({ liked: false });
    }

    // Not liked yet — insert and increment counter
    await db.execute(
      'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)',
      [req.user.id, commentId]
    );
    await db.execute(
      'UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?',
      [commentId]
    );
    res.json({ liked: true });
  } catch (err) {
    console.error('toggleCommentLike error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createPost, getFeed, getExplore, toggleLike, getComments, addComment, deletePost, editCaption, getLikes, getPost, toggleSave, getSaved, toggleCommentLike };