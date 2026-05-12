/**
 * config/multer.js
 *
 * CHANGES:
 *  • Uses UPLOAD_DIR from db.js instead of hardcoded './uploads'.
 *    UPLOAD_DIR resolves to process.env.UPLOAD_DIR (Railway Volume mount,
 *    e.g. /data/uploads) or ./uploads for local dev.
 *    WHY: Railway's default filesystem is ephemeral — files are wiped on
 *    every deploy. A Volume mount at /data persists across deploys/restarts.
 *  • Magic-byte validation with file-type@18 (unchanged).
 *
 * NOTE: `file-type` v19+ is ESM-only. Keep file-type@18 for CJS:
 *   npm install file-type@18
 */

const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { fileTypeFromFile } = require('file-type');
const { UPLOAD_DIR } = require('./db');

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']);
const ALL_ALLOWED_MIMES   = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]);

// Sub-directories are created at startup by db.js — no need to repeat here

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const base = (req.baseUrl || '') + (req.path || '');
    if (base.includes('avatar') || base.includes('profile'))
      return cb(null, path.join(UPLOAD_DIR, 'avatars'));
    if (base.includes('reels'))
      return cb(null, path.join(UPLOAD_DIR, 'reels'));
    if (base.includes('stories'))
      return cb(null, path.join(UPLOAD_DIR, 'stories'));
    cb(null, path.join(UPLOAD_DIR, 'posts'));
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

// First-pass: reject obviously wrong MIME headers (fast, before file hits disk)
const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
  cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
});

// Second-pass: magic-byte check after file is on disk
async function validateFileType(req, res, next) {
  if (!req.file) return next();
  const filePath = req.file.path;
  try {
    const type = await fileTypeFromFile(filePath);
    if (!type || !ALL_ALLOWED_MIMES.has(type.mime)) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ error: 'Invalid file — only images and videos are allowed.' });
    }
    req.file.mimetype = type.mime;
    next();
  } catch (err) {
    fs.unlink(filePath, () => {});
    return res.status(500).json({ error: 'Could not validate file type.' });
  }
}

module.exports = { upload, validateFileType, ALLOWED_VIDEO_MIMES };