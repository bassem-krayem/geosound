const path = require('path');
const fs = require('fs');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { createS3Client, validateLinodeStorage } = require('../config/storage');
const { isCloudStorageEnabled } = require('../utils/deleteAudio');

const fileFilter = (_req, file, cb) => {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (mp3, wav, ogg, mp4/m4a, aac)'), false);
  }
};

let storage;

if (isCloudStorageEnabled()) {  // ── Linode Object Storage (S3-compatible) ────────────────────────────────────
  const cluster = (process.env.LINODE_STORAGE_CLUSTER || '').trim();
  const bucket = (process.env.LINODE_STORAGE_BUCKET || '').trim();
  console.log(`[upload] Cloud storage enabled — endpoint: https://${cluster}.linodeobjects.com  bucket: ${bucket}`);

  // validateLinodeStorage logs its own errors; suppress the unhandled-rejection
  // warning since we intentionally do not want to block server startup.
  validateLinodeStorage().catch(() => {});

  storage = multerS3({
    s3: createS3Client(),
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `audio/audio-${Date.now()}${ext}`);
    },
  });
} else {
  // ── Local disk storage (fallback / development) ──────────────────────────────
  const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'audio');
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error(`[upload] Failed to create upload directory "${UPLOAD_DIR}":`, err.message);
    throw err;
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `audio-${Date.now()}${ext}`);
    },
  });
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * Wraps multer's upload.single() so that S3/Linode errors are logged with full
 * detail on the server and surfaced to Express as a clean 500 error instead of
 * the raw AWS XML message.
 *
 * Usage in routes (replaces `upload.single('audio')` directly):
 *   router.post('/...', uploadSingle, csrfAfterMultipart, handler);
 */
const uploadSingle = (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (!err) return next();
    // Log the real error server-side with diagnostic context
    const cluster = (process.env.LINODE_STORAGE_CLUSTER || '').trim();
    const key     = (process.env.LINODE_STORAGE_ACCESS_KEY || '').trim();
    const masked  = key.length > 4 ? `${key.slice(0, 4)}…` : '(empty)';
    console.error(`[upload] Audio upload failed — endpoint: https://${cluster}.linodeobjects.com  key: ${masked}`);
    console.error(`[upload] Error code: ${err.name || err.Code || err.$metadata?.httpStatusCode}`);
    console.error(`[upload] Error message: ${err.message}`);
    // Forward to Express error handler with a user-friendly message
    const friendly = new Error('Audio file upload failed. Please try again.');
    friendly.statusCode = 500;
    next(friendly);
  });
};

module.exports = upload;
module.exports.uploadSingle = uploadSingle;
