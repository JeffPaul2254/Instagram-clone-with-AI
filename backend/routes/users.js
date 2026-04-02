/**
 * routes/users.js
 *
 * CHANGES from v1:
 *  • validateFileType middleware added after upload.single('avatar').
 */

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { upload, validateFileType } = require('../config/multer');
const {
  searchUsers, getAllUsers, getSuggestions,
  toggleFollow, updateProfile, getProfile, getUserPosts,
  getFollowers, getFollowing,
} = require('../controllers/userController');

router.get('/search',            authMiddleware, searchUsers);
router.get('/all',               authMiddleware, getAllUsers);
router.get('/suggestions',       authMiddleware, getSuggestions);
router.post('/:id/follow',       authMiddleware, toggleFollow);
router.get('/:id/followers',     authMiddleware, getFollowers);
router.get('/:id/following',     authMiddleware, getFollowing);
router.put('/profile',           authMiddleware, upload.single('avatar'), validateFileType, updateProfile);
router.get('/:username/profile', authMiddleware, getProfile);
router.get('/:username/posts',   authMiddleware, getUserPosts);

module.exports = router;
