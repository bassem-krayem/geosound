const { S3Client } = require('@aws-sdk/client-s3');

/**
 * Creates and returns an S3Client configured for Linode Object Storage.
 * Linode Object Storage is S3-compatible; the endpoint format is:
 *   https://<LINODE_STORAGE_CLUSTER>.linodeobjects.com
 *
 * Required environment variables:
 *   LINODE_STORAGE_ACCESS_KEY  – Access Key ID from the Linode Cloud Manager
 *   LINODE_STORAGE_SECRET_KEY  – Secret Access Key from the Linode Cloud Manager
 *   LINODE_STORAGE_CLUSTER     – Cluster ID, e.g. "us-east-1" or "eu-central"
 *   LINODE_STORAGE_REGION      – Region string passed to the SDK, e.g. "us-east-1"
 *   LINODE_STORAGE_BUCKET      – The name of the Object Storage bucket
 */
const createS3Client = () =>
  new S3Client({
    endpoint: `https://${process.env.LINODE_STORAGE_CLUSTER}.linodeobjects.com`,
    region: process.env.LINODE_STORAGE_REGION,
    credentials: {
      accessKeyId: process.env.LINODE_STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.LINODE_STORAGE_SECRET_KEY,
    },
    forcePathStyle: false,
  });

module.exports = { createS3Client };
