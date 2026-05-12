/**
 * routes/posts.js
 *
 * IMPORTANT — route ordering:
 *  Static/specific paths MUST come before dynamic /:id routes.
 *  POST /comments/:commentId/like must be declared before POST /:id/comments,
 *  otherwise Express would attempt to match "comments" as a post :id.
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

// ── Static routes first ───────────────────────────────────────
router.post('/',                         authMiddleware, upload.single('image'), validateFileType, createPost);
router.get('/feed',                      authMiddleware, getFeed);
router.get('/explore',                   authMiddleware, getExplore);
router.get('/saved',                     authMiddleware, getSaved);

// ── Comment-like route BEFORE /:id to prevent "comments" matching as :id ──
router.post('/comments/:commentId/like', authMiddleware, toggleCommentLike);

// ── Dynamic /:id routes ───────────────────────────────────────
router.get('/:id',                       authMiddleware, getPost);
router.post('/:id/like',                 authMiddleware, toggleLike);
router.post('/:id/save',                 authMiddleware, toggleSave);
router.get('/:id/likes',                 authMiddleware, getLikes);
router.get('/:id/comments',              authMiddleware, getComments);
router.post('/:id/comments',             authMiddleware, addComment);
router.delete('/:id',                    authMiddleware, deletePost);
router.put('/:id/caption',               authMiddleware, editCaption);

module.exports = router;