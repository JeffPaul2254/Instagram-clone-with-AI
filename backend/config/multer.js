// config/multer.js
// Configures file upload handling (images for posts/avatars, videos for reels).
// multer intercepts multipart/form-data requests and saves files to disk.

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Create upload folders if they don't exist yet
['./uploads', './uploads/posts', './uploads/avatars', './uploads/reels'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

// Where to save the file and what to name it
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path.includes('avatar') || req.path.includes('profile')) return cb(null, './uploads/avatars');
    if (req.path.includes('reels'))                                   return cb(null, './uploads/reels');
    cb(null, './uploads/posts');
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

// Reject anything that isn't a known image or video MIME type
const fileFilter = (req, file, cb) => {
  const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
});

module.exports = { upload, ALLOWED_VIDEO_TYPES };
