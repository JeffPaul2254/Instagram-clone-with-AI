/**
 * routes/reels.js
 *
 * CHANGES from v1:
 *  • validateFileType middleware added after upload.single('video').
 */

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { upload, validateFileType } = require('../config/multer');
const {
  uploadReel, getReels, toggleLike,
  getComments, addComment, deleteReel, trackView,
} = require('../controllers/reelController');

router.post('/',               authMiddleware, upload.single('video'), validateFileType, uploadReel);
router.get('/',                authMiddleware, getReels);
router.post('/:id/like',       authMiddleware, toggleLike);
router.get('/:id/comments',    authMiddleware, getComments);
router.post('/:id/comments',   authMiddleware, addComment);
router.delete('/:id',          authMiddleware, deleteReel);
router.post('/:id/view',       authMiddleware, trackView);

module.exports = router;
