/**
 * controllers/messageController.js
 *
 * CHANGES from v1:
 *  • sendMessage now calls emitToUser() to push the new message to the
 *    recipient in real time, and updates both users' unread DM counts.
 *    This replaces the 3-second polling loop in MessagesPage.js.
 */

const { getDB, emitToUser } = require('../config/db');

// GET /api/messages/conversations
async function getConversations(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.full_name, u.avatar,
         m.text as last_message, m.created_at as last_message_at, m.sender_id as last_sender_id,
         (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND recipient_id = ? AND is_read = 0) as unread_count
       FROM users u
       JOIN messages m ON (
         (m.sender_id = u.id AND m.recipient_id = ?) OR
         (m.sender_id = ? AND m.recipient_id = u.id)
       )
       WHERE u.id != ?
         AND m.id = (
           SELECT id FROM messages m2
           WHERE (m2.sender_id = u.id AND m2.recipient_id = ?)
              OR (m2.sender_id = ? AND m2.recipient_id = u.id)
           ORDER BY m2.created_at DESC LIMIT 1
         )
       ORDER BY m.created_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/messages/unread/count
async function getUnreadCount(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch {
    res.json({ count: 0 });
  }
}

// GET /api/messages/:userId
async function getMessages(req, res) {
  try {
    const db      = getDB();
    const otherId = parseInt(req.params.userId);
    if (isNaN(otherId)) return res.status(400).json({ error: 'Invalid user ID' });

    const [rows] = await db.execute(
      `SELECT m.*, u.username, u.avatar FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
       ORDER BY m.created_at ASC LIMIT 200`,
      [req.user.id, otherId, otherId, req.user.id]
    );
    // Mark incoming messages as read
    await db.execute(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND recipient_id = ? AND is_read = 0',
      [otherId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/messages/:userId
async function sendMessage(req, res) {
  try {
    const db          = getDB();
    const { text }    = req.body;
    const recipientId = parseInt(req.params.userId);
    if (!text?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, recipient_id, text) VALUES (?, ?, ?)',
      [req.user.id, recipientId, text.trim().slice(0, 2000)]
    );
    const [rows] = await db.execute(
      'SELECT m.*, u.username, u.avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
      [result.insertId]
    );
    const message = rows[0];
    res.json(message);

    // ── Push real-time events ──────────────────────────────────
    // Tell the recipient's open tab(s) about the new message immediately
    emitToUser(recipientId, 'dm:new', message);
    // Tell both sides to refresh their conversation sidebar
    emitToUser(recipientId,   'conversations:update', {});
    emitToUser(req.user.id,   'conversations:update', {});

    // Update the recipient's unread badge count
    const [unread] = await db.execute(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = 0',
      [recipientId]
    );
    emitToUser(recipientId, 'dm:count', { count: unread[0].count });
    // ──────────────────────────────────────────────────────────

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/messages/:messageId
async function deleteMessage(req, res) {
  try {
    const db = getDB();
    await db.execute(
      'DELETE FROM messages WHERE id = ? AND sender_id = ?',
      [req.params.messageId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getConversations, getUnreadCount, getMessages, sendMessage, deleteMessage };
