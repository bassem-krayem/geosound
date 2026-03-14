const path = require('path');
const fs = require('fs');
const { DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createS3Client } = require('../config/storage');

/**
 * True when all required Amazon S3 environment variables are present
 * (trimming each value so accidental whitespace doesn't silently disable cloud storage).
 * Evaluated once at module load time since env vars don't change during runtime.
 */
const CLOUD_STORAGE_ENABLED = !!(
  (process.env.AWS_S3_ACCESS_KEY || '').trim() &&
  (process.env.AWS_S3_SECRET_KEY || '').trim() &&
  (process.env.AWS_S3_REGION || '').trim() &&
  (process.env.AWS_S3_BUCKET || '').trim()
);

const isCloudStorageEnabled = () => CLOUD_STORAGE_ENABLED;

/**
 * Returns the audioUrl to store in the database for an uploaded file.
 * • Cloud: req.file.location (full HTTPS URL from S3)
 * • Local: relative path     (/uploads/audio/<filename>)
 *
 * @param {object} file - The multer req.file object.
 * @returns {string|null}
 */
const getAudioUrl = (file) => {
  if (!file) return null;
  return CLOUD_STORAGE_ENABLED
    ? file.location
    : `/uploads/audio/${file.filename}`;
};

/**
 * Returns true when the stored audioUrl is a cloud (HTTPS) URL rather than a
 * local relative path.  We detect this by URL shape, not by the current env-var
 * state, so that old lessons whose audio was stored locally can still be handled
 * correctly even after cloud storage is enabled.
 */
const isCloudUrl = (audioUrl) => typeof audioUrl === 'string' && audioUrl.startsWith('http');

/**
 * Deletes an audio file from Amazon S3 or from the local filesystem.
 * The decision is based on the shape of the stored audioUrl, not on whether cloud
 * storage is currently configured, so that legacy local-path URLs are handled
 * correctly even when cloud storage is now enabled.
 *
 * @param {string} audioUrl - The stored audioUrl value from the database.
 *   • Cloud: a full HTTPS URL  (https://<bucket>.s3.<region>.amazonaws.com/<key>)
 *   • Local: a relative path   (/uploads/audio/audio-1234567890.mp3)
 */
const deleteAudio = async (audioUrl) => {
  if (!audioUrl) return;

  if (isCloudUrl(audioUrl)) {
    try {
      // Extract the object key from the full URL.
      const url = new URL(audioUrl);
      // pathname starts with '/', strip the leading slash to get the key
      const key = url.pathname.replace(/^\//, '');
      const s3 = createS3Client();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: (process.env.AWS_S3_BUCKET || '').trim(),
          Key: key,
        })
      );
    } catch (err) {
      console.error('[deleteAudio] Failed to delete object from S3:', err.message);
    }
  } else {
    try {
      // audioUrl is a local relative path like /uploads/audio/audio-123.mp3
      const localPath = path.join(process.cwd(), audioUrl);
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } catch (err) {
      console.error('[deleteAudio] Failed to delete local audio file:', err.message);
    }
  }
};

/**
 * Generates a pre-signed URL for temporary public access to a private S3 object.
 * Returns the audioUrl unchanged for local paths (relative URLs starting with '/').
 *
 * The decision is based on the shape of the stored audioUrl, not on whether cloud
 * storage is currently configured.  This means lessons whose audio was stored as a
 * local file path (uploaded before cloud storage was enabled) continue to work
 * correctly even when cloud storage is now active.
 *
 * @param {string} audioUrl - The stored audioUrl value from the database.
 * @param {number} [expiresIn=86400] - Expiry in seconds (default: 24 h).
 * @returns {Promise<string|null>}
 */
const generateSignedUrl = async (audioUrl, expiresIn = 86400) => {
  if (!audioUrl) return null;

  // Local paths are served directly — no signing needed.
  if (!isCloudUrl(audioUrl)) return audioUrl;

  try {
    // Virtual-hosted URL: https://<bucket>.s3.<region>.amazonaws.com/<key>
    const url = new URL(audioUrl);
    const key = url.pathname.replace(/^\//, '');
    const bucket = (process.env.AWS_S3_BUCKET || '').trim();
    const s3 = createS3Client();
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  } catch (err) {
    console.error('[generateSignedUrl] Failed to generate signed URL:', err.message);
    return audioUrl; // fall back to original URL on error
  }
};

module.exports = { deleteAudio, isCloudStorageEnabled, getAudioUrl, generateSignedUrl };
