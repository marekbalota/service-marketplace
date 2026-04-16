import { Client } from 'minio'
import { randomUUID } from 'crypto'

const BUCKET = process.env.MINIO_BUCKET ?? 'marketplace'
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000'

export const minioClient = new Client({
  endPoint:  process.env.MINIO_ENDPOINT ?? 'localhost',
  port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL:    false,
  accessKey: process.env.MINIO_ROOT_USER ?? 'minioadmin',
  secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
})

/** Creates the bucket if it doesn't exist and sets a public-read policy. */
export async function initBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET)
  if (!exists) {
    await minioClient.makeBucket(BUCKET)
  }
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect:    'Allow',
      Principal: { AWS: ['*'] },
      Action:    ['s3:GetObject'],
      Resource:  [`arn:aws:s3:::${BUCKET}/*`],
    }],
  })
  await minioClient.setBucketPolicy(BUCKET, policy)
}

/**
 * Uploads a File to MinIO under `profiles/{profileId}/{uuid}.{ext}`.
 * Returns the public URL stored in the `images.link` column.
 */
export async function uploadImage(file: File, profileId: string): Promise<string> {
  const rawExt = file.type.split('/')[1] ?? 'jpg'
  const ext    = rawExt === 'jpeg' ? 'jpg' : rawExt
  const key    = `profiles/${profileId}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': file.type,
  })
  return `${PUBLIC_URL}/${BUCKET}/${key}`
}
