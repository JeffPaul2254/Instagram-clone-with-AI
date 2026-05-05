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
  deletePost, editCaption, getLikes, getPost,
  toggleSave, getSaved, toggleCommentLike,
} = require('../controllers/postController');

router.post('/',              authMiddleware, upload.single('image'), validateFileType, createPost);
router.get('/feed',           authMiddleware, getFeed);
router.get('/explore',        authMiddleware, getExplore);
router.get('/saved',          authMiddleware, getSaved);
router.get('/:id',            authMiddleware, getPost);
router.post('/:id/like',      authMiddleware, toggleLike);
router.post('/:id/save',      authMiddleware, toggleSave);
router.get('/:id/likes',      authMiddleware, getLikes);
router.get('/:id/comments',   authMiddleware, getComments);
router.post('/:id/comments',  authMiddleware, addComment);
router.post('/comments/:commentId/like', authMiddleware, toggleCommentLike);
router.delete('/:id',         authMiddleware, deletePost);
router.put('/:id/caption',    authMiddleware, editCaption);

module.exports = router;
