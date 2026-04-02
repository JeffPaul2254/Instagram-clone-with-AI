/**
 * config/multer.js
 *
 * CHANGES from v1:
 *  • Added magic-byte validation with the `file-type` library.
 *
 *    WHY: The old code trusted file.mimetype, which comes from the HTTP request
 *    header — a value the client controls.  A malicious user could rename
 *    "malware.exe" to "photo.jpg", set Content-Type: image/jpeg, and bypass
 *    the check.  `file-type` inspects the actual bytes of the file (the "magic
 *    bytes" at the start of the binary data) to determine the real type.
 *
 *    HOW:  multer still saves the file to disk first (unavoidable with
 *    diskStorage).  A second middleware (`validateFileType`) then reads the
 *    first few bytes, checks the real type, and deletes + rejects the file if
 *    it doesn't match.  Attach it after upload.single() in each route:
 *
 *      router.post('/', authMiddleware, upload.single('image'), validateFileType, createPost);
 *
 *  NOTE: `file-type` v19+ is ESM-only.  Install v18 which still supports CJS:
 *    npm install file-type@18
 */

const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { fileTypeFromFile } = require('file-type');

// Create upload folders if they don't exist yet
['./uploads', './uploads/posts', './uploads/avatars', './uploads/reels'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']);
const ALL_ALLOWED_MIMES   = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]);

// ── Where to save and what to name the file ───────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // req.baseUrl is the router mount path (e.g. '/api/users', '/api/reels')
    // req.path is the sub-path within the router (often just '/')
    // Using baseUrl is reliable across all routers; req.path alone is not.
    const base = (req.baseUrl || '') + (req.path || '');
    if (base.includes('avatar') || base.includes('profile')) return cb(null, './uploads/avatars');
    if (base.includes('reels'))                               return cb(null, './uploads/reels');
    cb(null, './uploads/posts');
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

// ── First-pass filter: reject obviously wrong MIME headers ─────
// (fast — happens before the file hits disk)
const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
  cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },  // 200 MB max
});

// ── Second-pass filter: magic-byte check after file is on disk ─
/**
 * Express middleware — place this AFTER upload.single() / upload.array().
 * Reads the real file type from the saved bytes and rejects the request
 * (deleting the file) if it doesn't match an allowed type.
 */
async function validateFileType(req, res, next) {
  if (!req.file) return next();  // no file attached — let the controller handle it

  const filePath = req.file.path;
  try {
    const type = await fileTypeFromFile(filePath);

    if (!type || !ALL_ALLOWED_MIMES.has(type.mime)) {
      // Delete the already-saved file before rejecting
      fs.unlink(filePath, () => {});
      return res.status(400).json({ error: 'Invalid file — only images and videos are allowed.' });
    }

    // Overwrite the MIME with the real detected value so controllers can trust it
    req.file.mimetype = type.mime;
    next();
  } catch (err) {
    fs.unlink(filePath, () => {});
    return res.status(500).json({ error: 'Could not validate file type.' });
  }
}

module.exports = { upload, validateFileType, ALLOWED_VIDEO_MIMES };
