/**
 * routes/posts.js
 *
 * CHANGES from v1:
 *  • validateFileType middleware added after upload.single('image').
 *    It performs a magic-byte check on the saved file and rejects it
 *    (with automatic cleanup) if the bytes don't match an allowed type.
 */

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { upload, validateFileType } = require('../config/multer');
const {
  createPost, getFeed, getExplore,
  toggleLike, getComments, addComment,
  deletePost, editCaption,
} = require('../controllers/postController');

router.post('/',              authMiddleware, upload.single('image'), validateFileType, createPost);
router.get('/feed',           authMiddleware, getFeed);
router.get('/explore',        authMiddleware, getExplore);
router.post('/:id/like',      authMiddleware, toggleLike);
router.get('/:id/comments',   authMiddleware, getComments);
router.post('/:id/comments',  authMiddleware, addComment);
router.delete('/:id',         authMiddleware, deletePost);
router.put('/:id/caption',    authMiddleware, editCaption);

module.exports = router;
