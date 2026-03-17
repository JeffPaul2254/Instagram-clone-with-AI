// controllers/notificationController.js
// Handles fetching, marking as read, and counting unread notifications.

const { getDB } = require('../config/db');

// GET /api/notifications
async function getNotifications(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT n.*, u.username, u.avatar FROM notifications n
       JOIN users u ON n.sender_id = u.id
       WHERE n.recipient_id = ? ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/notifications/read
async function markAllRead(req, res) {
  try {
    const db = getDB();
    await db.execute('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/notifications/count
async function getUnreadCount(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch {
    res.json({ count: 0 });
  }
}

module.exports = { getNotifications, markAllRead, getUnreadCount };
