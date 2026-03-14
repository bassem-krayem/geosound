const path = require('path');
const fs = require('fs');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { createS3Client, validateS3Storage } = require('../config/storage');
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

if (isCloudStorageEnabled()) {  // ── Amazon S3 ─────────────────────────────────────────────────────────────────
  const region = (process.env.AWS_S3_REGION || '').trim();
  const bucket = (process.env.AWS_S3_BUCKET || '').trim();
  console.log(`[upload] Cloud storage enabled — region: ${region}  bucket: ${bucket}`);

  // validateS3Storage logs its own errors; suppress the unhandled-rejection
  // warning since we intentionally do not want to block server startup.
  validateS3Storage().catch(() => {});

  storage = multerS3({
    s3: createS3Client(),
    bucket,
    // Use the multer-validated mimetype directly instead of AUTO_CONTENT_TYPE.
    // AUTO_CONTENT_TYPE reads the first stream chunk to detect the type, which
    // can race with multer v2's stream handling and cause uploads to hang.
    contentType: (_req, file, cb) => cb(null, file.mimetype),
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
 * Wraps multer's upload.single() so that S3 errors are logged with full
 * detail on the server and surfaced to Express as a clean 500 error instead of
 * the raw AWS XML message.
 *
 * Usage in routes (replaces `upload.single('audio')` directly):
 *   router.post('/...', uploadSingle, csrfAfterMultipart, handler);
 */
const uploadSingle = (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (!err) {
      if (req.file && req.file.location) {
        const masked = ((process.env.AWS_S3_ACCESS_KEY || '').trim().slice(0, 4) || '(empty)') + '…';
        console.log(`[upload] Audio upload OK — location: ${req.file.location}  key: ${req.file.key}  access key: ${masked}`);
      }
      return next();
    }
    // Log the real error server-side with diagnostic context
    const region  = (process.env.AWS_S3_REGION || '').trim();
    const key     = (process.env.AWS_S3_ACCESS_KEY || '').trim();
    const masked  = key.length > 4 ? `${key.slice(0, 4)}…` : '(empty)';
    console.error(`[upload] Audio upload failed — region: ${region}  access key: ${masked}`);
    console.error(`[upload] Error code: ${err.name || err.Code || err.$metadata?.httpStatusCode}`);
    console.error(`[upload] Error message: ${err.message}`);
    if (err.cause) console.error(`[upload] Error cause: ${err.cause?.message || err.cause}`);
    // Forward to Express error handler with a user-friendly message
    const friendly = new Error('Audio file upload failed. Please try again.');
    friendly.statusCode = 500;
    next(friendly);
  });
};

module.exports = upload;
module.exports.uploadSingle = uploadSingle;
