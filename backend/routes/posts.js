// routes/posts.js
// Defines the URL paths for posts.
// Note: /feed and /explore must be defined BEFORE /:id to avoid Express
// treating the word "feed" or "explore" as a post ID parameter.

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { upload }     = require('../config/multer');
const {
  createPost, getFeed, getExplore,
  toggleLike, getComments, addComment,
  deletePost, editCaption,
} = require('../controllers/postController');

router.post('/',              authMiddleware, upload.single('image'), createPost);
router.get('/feed',           authMiddleware, getFeed);
router.get('/explore',        authMiddleware, getExplore);
router.post('/:id/like',      authMiddleware, toggleLike);
router.get('/:id/comments',   authMiddleware, getComments);
router.post('/:id/comments',  authMiddleware, addComment);
router.delete('/:id',         authMiddleware, deletePost);
router.put('/:id/caption',    authMiddleware, editCaption);

module.exports = router;
