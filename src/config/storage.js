const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');

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

/**
 * Validates the Linode Object Storage configuration by performing a HeadBucket
 * call against the configured bucket. Call this once at server startup to catch
 * misconfigured credentials or a wrong cluster before the first upload attempt.
 *
 * Logs a clear diagnostic message on success or failure, including the exact
 * endpoint and a masked prefix of the access key so you can verify the right
 * credentials are being used without exposing the full key.
 */
const validateLinodeStorage = async () => {
  const cluster = (process.env.LINODE_STORAGE_CLUSTER || '').trim();
  const bucket  = (process.env.LINODE_STORAGE_BUCKET  || '').trim();
  const key     = (process.env.LINODE_STORAGE_ACCESS_KEY || '').trim();
  const maskedKey = key.length > 4 ? `${key.slice(0, 4)}…` : '(empty)';
  const endpoint = `https://${cluster}.linodeobjects.com`;

  console.log(`[storage] Validating Linode Object Storage…`);
  console.log(`[storage]   endpoint  : ${endpoint}`);
  console.log(`[storage]   bucket    : ${bucket}`);
  console.log(`[storage]   access key: ${maskedKey}`);

  try {
    const s3 = createS3Client();
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[storage] ✓ Linode Object Storage connection OK — uploads will go to ${endpoint}/${bucket}`);
  } catch (err) {
    const code = err.name || err.Code || err.$metadata?.httpStatusCode;
    console.error(`[storage] ✗ Linode Object Storage validation FAILED (${code}: ${err.message})`);
    if (/InvalidAccessKeyId|InvalidAccessKey|AuthorizationQueryParametersError/i.test(String(code) + String(err.message))) {
      console.error(`[storage]   ➜ The access key "${maskedKey}" was not found on Linode.`);
      console.error(`[storage]   ➜ Make sure LINODE_STORAGE_ACCESS_KEY and LINODE_STORAGE_SECRET_KEY`);
      console.error(`[storage]   ➜ are "Object Storage Access Keys" (Linode Cloud Manager → Object Storage → Access Keys),`);
      console.error(`[storage]   ➜ NOT your Linode account API token.`);
    } else if (/NoSuchBucket|404/.test(String(code) + String(err.message))) {
      console.error(`[storage]   ➜ Bucket "${bucket}" not found in cluster "${cluster}".`);
      console.error(`[storage]   ➜ Check LINODE_STORAGE_BUCKET and LINODE_STORAGE_CLUSTER match what you created in Linode.`);
    }
    console.error(`[storage]   ➜ Uploads will fail until this is resolved. Check your .env file.`);
  }
};

module.exports = { createS3Client, validateLinodeStorage };
