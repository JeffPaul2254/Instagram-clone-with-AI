/**
 * controllers/storyController.js
 *
 * Stories expire after 24 hours. Every query filters by
 * created_at > NOW() - INTERVAL 24 HOUR so expired rows are
 * invisible without needing a cron job.
 *
 * Endpoints:
 *   GET  /api/stories          – stories from followed users + own
 *   POST /api/stories          – upload a new story (image)
 *   POST /api/stories/:id/view – mark a story viewed (idempotent)
 *   GET  /api/stories/:id/views – list of viewers (own stories only)
 *   DELETE /api/stories/:id    – delete own story
 */

const fs = require('fs');
const { getDB } = require('../config/db');

// GET /api/stories
// Returns one row per user who has active stories, with the stories
// array nested. The client uses this to build the avatar ring row.
async function getStories(req, res) {
  try {
    const db = getDB();

    // Fetch all active story rows for followed users + self
    const [rows] = await db.execute(
      `SELECT
         s.id, s.user_id, s.image_url, s.caption, s.views_count, s.created_at,
         u.username, u.avatar, u.full_name,
         EXISTS(
           SELECT 1 FROM story_views sv
           WHERE sv.story_id = s.id AND sv.user_id = ?
         ) AS viewed
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.created_at > NOW() - INTERVAL 24 HOUR
         AND (
           s.user_id = ?
           OR s.user_id IN (
             SELECT following_id FROM follows WHERE follower_id = ?
           )
         )
       ORDER BY s.user_id = ? DESC, s.created_at ASC`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );

    // Group by user so the bar shows one circle per person
    const usersMap = new Map();
    for (const row of rows) {
      if (!usersMap.has(row.user_id)) {
        usersMap.set(row.user_id, {
          user_id:   row.user_id,
          username:  row.username,
          avatar:    row.avatar,
          full_name: row.full_name,
          // all_viewed becomes false if any single story is unseen
          all_viewed: true,
          stories:   [],
        });
      }
      const u = usersMap.get(row.user_id);
      if (!row.viewed) u.all_viewed = false;
      u.stories.push({
        id:           row.id,
        image_url:    row.image_url,
        caption:      row.caption,
        views_count:  row.views_count,
        created_at:   row.created_at,
        viewed:       !!row.viewed,
      });
    }

    res.json([...usersMap.values()]);
  } catch (err) {
    console.error('getStories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/stories
async function uploadStory(req, res) {
  try {
    const db = getDB();
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    const image_url = '/uploads/stories/' + req.file.filename;
    const caption   = req.body.caption?.trim().slice(0, 200) || '';

    const [result] = await db.execute(
      'INSERT INTO stories (user_id, image_url, caption) VALUES (?, ?, ?)',
      [req.user.id, image_url, caption]
    );

    const [rows] = await db.execute(
      `SELECT s.*, u.username, u.avatar, u.full_name
       FROM stories s JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('uploadStory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/stories/:id/view  (idempotent — safe to call multiple times)
async function viewStory(req, res) {
  try {
    const db = getDB();
    // INSERT IGNORE makes this idempotent — duplicate views don't error
    const [result] = await db.execute(
      `INSERT IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)`,
      [req.params.id, req.user.id]
    );
    // Only increment the counter on a genuinely new view (affectedRows = 1)
    if (result.affectedRows > 0) {
      await db.execute(
        'UPDATE stories SET views_count = views_count + 1 WHERE id = ?',
        [req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('viewStory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/stories/:id/views  (owner only — who saw my story)
async function getStoryViews(req, res) {
  try {
    const db = getDB();

    // Verify ownership first
    const [story] = await db.execute(
      'SELECT user_id FROM stories WHERE id = ?',
      [req.params.id]
    );
    if (!story.length) return res.status(404).json({ error: 'Story not found' });
    if (story[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.avatar, u.full_name, sv.viewed_at
       FROM story_views sv
       JOIN users u ON sv.user_id = u.id
       WHERE sv.story_id = ?
       ORDER BY sv.viewed_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getStoryViews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/stories/:id
async function deleteStory(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM stories WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });

    // Clean up the file from disk
    const filePath = '.' + rows[0].image_url;
    fs.unlink(filePath, () => {});

    await db.execute('DELETE FROM stories WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteStory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getStories, uploadStory, viewStory, getStoryViews, deleteStory };
