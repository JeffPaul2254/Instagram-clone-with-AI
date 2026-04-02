// controllers/userController.js
// Handles user-related logic: search, suggestions, follow/unfollow, profile, posts grid.

const { getDB, emitToUser } = require('../config/db');

// GET /api/users/search?q=
async function searchUsers(req, res) {
  try {
    const db = getDB();
    const q  = `%${(req.query.q || '').trim()}%`;
    const [rows] = await db.execute(
      'SELECT id, username, full_name, avatar FROM users WHERE (username LIKE ? OR full_name LIKE ?) AND id != ? LIMIT 20',
      [q, q, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/users/all
async function getAllUsers(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT id, username, full_name, avatar FROM users ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/users/suggestions
async function getSuggestions(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT id, username, full_name, avatar,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = users.id) as is_following,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count
       FROM users WHERE id != ?
       ORDER BY created_at DESC LIMIT 10`,
      [req.user.id, req.user.id]
    );
    // Show unfollowed users first, then already-followed ones so sidebar is never empty
    const unfollowed = rows.filter(r => !r.is_following);
    const followed   = rows.filter(r =>  r.is_following);
    const sorted = [...unfollowed.sort(() => Math.random() - 0.5), ...followed].slice(0, 5);
    res.json(sorted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/users/:id/follow
async function toggleFollow(req, res) {
  try {
    const db         = getDB();
    const followingId = parseInt(req.params.id);
    if (followingId === req.user.id)
      return res.status(400).json({ error: 'Cannot follow yourself' });

    const [existing] = await db.execute(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, followingId]
    );
    if (existing.length) {
      await db.execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, followingId]);
      return res.json({ following: false });
    }
    await db.execute('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, followingId]);
    const [notifResult] = await db.execute(
      'INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?,?,?,?)',
      [followingId, req.user.id, 'follow', 'started following you']
    );
    // Push real-time notification to the followed user
    const [notifRows] = await db.execute(
      `SELECT n.*, u.username, u.avatar FROM notifications n
       JOIN users u ON n.sender_id = u.id WHERE n.id = ?`,
      [notifResult.insertId]
    );
    emitToUser(followingId, 'notification:new', notifRows[0]);
    const [countRows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0',
      [followingId]
    );
    emitToUser(followingId, 'notification:count', { count: countRows[0].count });
    res.json({ following: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/users/profile
async function updateProfile(req, res) {
  try {
    const db = getDB();
    const { full_name, bio } = req.body;
    const avatar = req.file ? '/uploads/avatars/' + req.file.filename : undefined;

    const updates = [];
    const vals    = [];
    if (full_name !== undefined) { updates.push('full_name = ?'); vals.push(full_name.trim().slice(0, 100)); }
    if (bio       !== undefined) { updates.push('bio = ?');       vals.push(bio.trim().slice(0, 500)); }
    if (avatar)                  { updates.push('avatar = ?');    vals.push(avatar); }

    if (updates.length) {
      vals.push(req.user.id);
      await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, vals);
    }
    const [rows] = await db.execute(
      'SELECT id, username, email, full_name, bio, avatar FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/users/:username/profile
async function getProfile(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.full_name, u.bio, u.avatar, u.created_at,
        (SELECT COUNT(*) FROM posts   WHERE user_id    = u.id)        as posts_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id)      as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id  = u.id)      as following_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following,
        (u.id = ?) as is_own
       FROM users u WHERE u.username = ?`,
      [req.user.id, req.user.id, req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/users/:username/posts
async function getUserPosts(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id)              as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id)              as comments_count,
        (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND user_id = ?) as user_liked
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE u.username = ? ORDER BY p.created_at DESC`,
      [req.user.id, req.params.username]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/users/:id/followers
async function getFollowers(req, res) {
  try {
    const db     = getDB();
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.full_name, u.avatar,
         (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/users/:id/following
async function getFollowing(req, res) {
  try {
    const db     = getDB();
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.full_name, u.avatar,
         (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { searchUsers, getAllUsers, getSuggestions, toggleFollow, updateProfile, getProfile, getUserPosts, getFollowers, getFollowing };
