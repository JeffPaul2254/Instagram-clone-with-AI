// routes/users.js
// Defines the URL paths for user actions.
// Note: /search, /all, /suggestions and /profile must come BEFORE /:id or /:username
// so Express doesn't treat those words as parameter values.

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { upload }     = require('../config/multer');
const {
  searchUsers, getAllUsers, getSuggestions,
  toggleFollow, updateProfile, getProfile, getUserPosts,
} = require('../controllers/userController');

router.get('/search',              authMiddleware, searchUsers);
router.get('/all',                 authMiddleware, getAllUsers);
router.get('/suggestions',         authMiddleware, getSuggestions);
router.post('/:id/follow',         authMiddleware, toggleFollow);
router.put('/profile',             authMiddleware, upload.single('avatar'), updateProfile);
router.get('/:username/profile',   authMiddleware, getProfile);
router.get('/:username/posts',     authMiddleware, getUserPosts);

module.exports = router;
