// routes/messages.js
// Defines the URL paths for direct messages.
// Note: /conversations and /unread/count must come BEFORE /:userId
// so Express doesn't treat those words as a user ID parameter.

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getConversations, getUnreadCount,
  getMessages, sendMessage, deleteMessage,
} = require('../controllers/messageController');

router.get('/conversations',    authMiddleware, getConversations);
router.get('/unread/count',     authMiddleware, getUnreadCount);
router.get('/:userId',          authMiddleware, getMessages);
router.post('/:userId',         authMiddleware, sendMessage);
router.delete('/:messageId',    authMiddleware, deleteMessage);

module.exports = router;
