// routes/notifications.js
// Defines the URL paths for notifications.

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { getNotifications, markAllRead, getUnreadCount } = require('../controllers/notificationController');

router.get('/',         authMiddleware, getNotifications);
router.put('/read',     authMiddleware, markAllRead);
router.get('/count',    authMiddleware, getUnreadCount);

module.exports = router;
