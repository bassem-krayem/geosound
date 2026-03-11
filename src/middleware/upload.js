const path = require('path');
const fs = require('fs');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { createS3Client } = require('../config/storage');
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
  storage = multerS3({
    s3: createS3Client(),
    bucket,
    acl: 'public-read',
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

module.exports = upload;
