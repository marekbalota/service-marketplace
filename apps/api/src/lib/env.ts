function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendUrl: required("FRONTEND_URL"),
  betterAuthUrl: required("BETTER_AUTH_URL"),
  databaseUrl: required("DATABASE_URL"),
  redis: {
    host: required("REDIS_HOST"),
    port: parseInt(required("REDIS_PORT"), 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  minio: {
    endpoint: required("MINIO_ENDPOINT"),
    port: parseInt(required("MINIO_PORT"), 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: required("MINIO_ROOT_USER"),
    secretKey: required("MINIO_ROOT_PASSWORD"),
    bucket: required("MINIO_BUCKET"),
    publicUrl: required("MINIO_PUBLIC_URL"),
  },
  turnstile: {
    secretKey: required("TURNSTILE_SECRET_KEY"),
  },
}
