import Redis from "ioredis"
import { env } from "./env"

export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  lazyConnect: true,
})
