import { Client } from 'minio'
import { randomUUID } from 'crypto'
import { env } from './env'

export const minioClient = new Client({
  endPoint:  env.minio.endpoint,
  port:      env.minio.port,
  useSSL:    env.minio.useSSL,
  accessKey: env.minio.accessKey,
  secretKey: env.minio.secretKey,
})

/** Creates the bucket if it doesn't exist and sets a public-read policy. */
export async function initBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(env.minio.bucket)
  if (!exists) {
    await minioClient.makeBucket(env.minio.bucket)
  }
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect:    'Allow',
      Principal: { AWS: ['*'] },
      Action:    ['s3:GetObject'],
      Resource:  [`arn:aws:s3:::${env.minio.bucket}/*`],
    }],
  })
  await minioClient.setBucketPolicy(env.minio.bucket, policy)
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
  await minioClient.putObject(env.minio.bucket, key, buffer, buffer.length, {
    'Content-Type': file.type,
  })
  return `${env.minio.publicUrl}/${env.minio.bucket}/${key}`
}

/**
 * Uploads a File to MinIO under `reviews/{reviewId}/{uuid}.{ext}`.
 * Returns the public URL stored in the `review_images.link` column.
 */
export async function uploadReviewImage(file: File, reviewId: string): Promise<string> {
  const rawExt = file.type.split('/')[1] ?? 'jpg'
  const ext    = rawExt === 'jpeg' ? 'jpg' : rawExt
  const key    = `reviews/${reviewId}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': file.type,
  })
  return `${PUBLIC_URL}/${BUCKET}/${key}`
}

/**
 * Deletes a previously uploaded object from MinIO given its public URL.
 * Used for cleanup when a DB insert fails after a successful upload.
 */
export async function deleteUploadedImage(url: string): Promise<void> {
  const prefix = `${env.minio.publicUrl}/${env.minio.bucket}/`
  if (!url.startsWith(prefix)) return
  const key = url.slice(prefix.length)
  await minioClient.removeObject(env.minio.bucket, key)
}
