const { S3Client } = require('@aws-sdk/client-s3');

/**
 * Creates and returns an S3Client configured for Linode Object Storage.
 * Linode Object Storage is S3-compatible; the endpoint format is:
 *   https://<LINODE_STORAGE_CLUSTER>.linodeobjects.com
 *
 * Required environment variables:
 *   LINODE_STORAGE_ACCESS_KEY  – Object Storage Access Key ID (from Linode Cloud Manager)
 *   LINODE_STORAGE_SECRET_KEY  – Object Storage Secret Key (from Linode Cloud Manager)
 *   LINODE_STORAGE_CLUSTER     – Cluster ID (e.g. us-east-1, eu-central-1, ap-south-1)
 *   LINODE_STORAGE_BUCKET      – The name of the Object Storage bucket
 *
 * The cluster ID is used as both the hostname segment of the endpoint URL and
 * as the signing region, since for Linode Object Storage they are one and the same.
 */
const createS3Client = () =>
  new S3Client({
    endpoint: `https://${process.env.LINODE_STORAGE_CLUSTER}.linodeobjects.com`,
    region: process.env.LINODE_STORAGE_CLUSTER,
    credentials: {
      accessKeyId: process.env.LINODE_STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.LINODE_STORAGE_SECRET_KEY,
    },
    forcePathStyle: false,
  });

module.exports = { createS3Client };
