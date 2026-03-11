const { S3Client } = require('@aws-sdk/client-s3');

/**
 * Creates and returns an S3Client configured for Linode Object Storage.
 * Linode Object Storage is S3-compatible; the endpoint format is:
 *   https://<LINODE_STORAGE_CLUSTER>.linodeobjects.com
 *
 * Required environment variables:
 *   LINODE_STORAGE_ACCESS_KEY  – Object Storage Access Key ID (from Linode Cloud Manager)
 *   LINODE_STORAGE_SECRET_KEY  – Object Storage Secret Key (from Linode Cloud Manager)
 *   LINODE_STORAGE_CLUSTER     – Cluster ID (e.g. eu-central-1, us-east-1, ap-south-1)
 *   LINODE_STORAGE_BUCKET      – The name of the Object Storage bucket
 *
 * The cluster ID is used as both the hostname segment of the endpoint URL and
 * as the signing region, since for Linode Object Storage they are one and the same.
 *
 * Credentials and cluster are trimmed to guard against accidental leading/trailing
 * whitespace when values are copy-pasted into .env, which would cause Linode to
 * return "InvalidAccessKeyId" even if the key itself is correct.
 *
 * requestChecksumCalculation / responseChecksumValidation are set to WHEN_REQUIRED
 * so the SDK does not add x-amz-checksum-crc32 / x-amz-sdk-checksum-algorithm
 * headers that AWS SDK v3 sends by default but Linode Object Storage does not expect.
 */
const createS3Client = () => {
  const cluster = (process.env.LINODE_STORAGE_CLUSTER || '').trim();
  return new S3Client({
    endpoint: `https://${cluster}.linodeobjects.com`,
    region: cluster,
    credentials: {
      accessKeyId: (process.env.LINODE_STORAGE_ACCESS_KEY || '').trim(),
      secretAccessKey: (process.env.LINODE_STORAGE_SECRET_KEY || '').trim(),
    },
    forcePathStyle: false,
    // Only calculate/validate checksums when the operation explicitly requires it.
    // By default AWS SDK v3 adds x-amz-checksum-crc32 to every upload, which
    // Linode Object Storage does not recognise and may cause upload failures.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
};

module.exports = { createS3Client };
