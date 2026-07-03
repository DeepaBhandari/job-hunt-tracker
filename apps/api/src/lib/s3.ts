import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = process.env.AWS_S3_BUCKET;

if (!bucket) {
  throw new Error('AWS_S3_BUCKET is not configured');
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

export async function presignResumeUpload(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 900 });
}
