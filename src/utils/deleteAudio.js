const path = require('path');
const fs = require('fs');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createS3Client } = require('../config/storage');

/**
 * True when all required Linode Object Storage environment variables are present
 * (trimming each value so accidental whitespace doesn't silently disable cloud storage).
 * Evaluated once at module load time since env vars don't change during runtime.
 */
const CLOUD_STORAGE_ENABLED = !!(
  (process.env.LINODE_STORAGE_ACCESS_KEY || '').trim() &&
  (process.env.LINODE_STORAGE_SECRET_KEY || '').trim() &&
  (process.env.LINODE_STORAGE_CLUSTER || '').trim() &&
  (process.env.LINODE_STORAGE_BUCKET || '').trim()
);

const isCloudStorageEnabled = () => CLOUD_STORAGE_ENABLED;

/**
 * Returns the audioUrl to store in the database for an uploaded file.
 * • Cloud: req.file.location (full public HTTPS URL from Linode)
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
 * Deletes an audio file from Linode Object Storage or from the local filesystem,
 * depending on whether cloud storage is configured.
 *
 * @param {string} audioUrl - The stored audioUrl value from the database.
 *   • Cloud: a full HTTPS URL  (https://bucket.cluster.linodeobjects.com/key)
 *   • Local: a relative path   (/uploads/audio/audio-1234567890.mp3)
 */
const deleteAudio = async (audioUrl) => {
  if (!audioUrl) return;

  if (CLOUD_STORAGE_ENABLED) {
    try {
      // Extract the object key from the full URL.
      // URL format: https://<bucket>.<cluster>.linodeobjects.com/<key>
      const url = new URL(audioUrl);
      // pathname starts with '/', strip the leading slash to get the key
      const key = url.pathname.replace(/^\//, '');
      const s3 = createS3Client();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: (process.env.LINODE_STORAGE_BUCKET || '').trim(),
          Key: key,
        })
      );
    } catch (err) {
      console.error('[deleteAudio] Failed to delete object from Linode Storage:', err.message);
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

module.exports = { deleteAudio, isCloudStorageEnabled, getAudioUrl };
