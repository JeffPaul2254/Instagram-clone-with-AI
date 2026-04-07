/**
 * routes/stories.js
 *
 * All routes require authentication.
 * POST / uses multer to handle the image upload, then validateFileType
 * for the magic-byte check (same pattern as posts and reels).
 */

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { upload, validateFileType } = require('../config/multer');
const {
  getStories,
  uploadStory,
  viewStory,
  getStoryViews,
  deleteStory,
} = require('../controllers/storyController');

router.get('/',            authMiddleware, getStories);
router.post('/',           authMiddleware, upload.single('image'), validateFileType, uploadStory);
router.post('/:id/view',   authMiddleware, viewStory);
router.get('/:id/views',   authMiddleware, getStoryViews);
router.delete('/:id',      authMiddleware, deleteStory);

module.exports = router;
