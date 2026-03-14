const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

/**
 * Creates and returns an S3Client configured for Amazon S3.
 *
 * Required environment variables:
 *   AWS_S3_ACCESS_KEY  – IAM Access Key ID
 *   AWS_S3_SECRET_KEY  – IAM Secret Access Key
 *   AWS_S3_REGION      – AWS region where the bucket lives (e.g. eu-central-1)
 *   AWS_S3_BUCKET      – S3 bucket name
 *
 * Credentials are trimmed to guard against accidental leading/trailing whitespace
 * when values are copy-pasted into .env.
 */
const createS3Client = () => {
  const region = (process.env.AWS_S3_REGION || '').trim();
  return new S3Client({
    region,
    credentials: {
      accessKeyId: (process.env.AWS_S3_ACCESS_KEY || '').trim(),
      secretAccessKey: (process.env.AWS_S3_SECRET_KEY || '').trim(),
    },
  });
};

/**
 * Validates the Amazon S3 configuration by listing bucket objects (MaxKeys: 1).
 * Using ListObjectsV2 (a GET request) ensures that on failure the response
 * contains a parseable XML error body with the exact error code.
 *
 * Logs a clear diagnostic message on success or failure, including the region,
 * HTTP status code, and a masked prefix of the access key.
 */
const validateS3Storage = async () => {
  const region  = (process.env.AWS_S3_REGION || '').trim();
  const bucket  = (process.env.AWS_S3_BUCKET  || '').trim();
  const key     = (process.env.AWS_S3_ACCESS_KEY || '').trim();
  const maskedKey = key.length > 4 ? `${key.slice(0, 4)}…` : '(empty)';
  const endpoint = `https://s3.${region}.amazonaws.com`;

  console.log(`[storage] Validating Amazon S3 storage…`);
  console.log(`[storage]   region    : ${region}`);
  console.log(`[storage]   bucket    : ${bucket}`);
  console.log(`[storage]   access key: ${maskedKey}`);

  try {
    const s3 = createS3Client();
    await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    console.log(`[storage] ✓ Amazon S3 connection OK — uploads will go to ${endpoint}/${bucket}`);
  } catch (err) {
    const httpStatus = err.$metadata?.httpStatusCode;
    const errCode    = err.name || err.Code || err.code || httpStatus || 'Unknown';
    const causeMsg   = err.cause?.message || err.cause?.code || '';

    console.error(`[storage] ✗ Amazon S3 validation FAILED`);
    console.error(`[storage]   error     : ${errCode}`);
    console.error(`[storage]   message   : ${err.message}`);
    if (httpStatus) console.error(`[storage]   HTTP      : ${httpStatus}`);
    if (causeMsg)   console.error(`[storage]   cause     : ${causeMsg}`);

    const combined = `${errCode} ${err.message} ${causeMsg}`;
    if (/InvalidAccessKeyId|InvalidAccessKey|AuthorizationQueryParametersError|InvalidSecurity/i.test(combined)
        || httpStatus === 403) {
      console.error(`[storage]   ➜ Access denied — key "${maskedKey}" not accepted by AWS.`);
      console.error(`[storage]   ➜ Make sure AWS_S3_ACCESS_KEY / AWS_S3_SECRET_KEY`);
      console.error(`[storage]   ➜ are an IAM Access Key + Secret Key (AWS Console → IAM → Users → Security credentials),`);
      console.error(`[storage]   ➜ NOT your AWS root account password or console login.`);
      console.error(`[storage]   ➜ Also confirm the IAM user has s3:PutObject / s3:GetObject / s3:DeleteObject on bucket "${bucket}".`);
    } else if (/NoSuchBucket/i.test(combined) || httpStatus === 404) {
      console.error(`[storage]   ➜ Bucket "${bucket}" not found in region "${region}".`);
      console.error(`[storage]   ➜ Check AWS_S3_BUCKET and AWS_S3_REGION match the bucket you created in the AWS console.`);
    } else if (!httpStatus) {
      console.error(`[storage]   ➜ Network error — could not reach ${endpoint}.`);
      console.error(`[storage]   ➜ Check your internet connection and that AWS_S3_REGION is correct.`);
    }
    console.error(`[storage]   ➜ Uploads will fail until this is resolved. Check your .env file.`);
  }
};

module.exports = { createS3Client, validateS3Storage };
