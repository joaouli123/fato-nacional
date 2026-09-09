import IORedis from "ioredis";

let redis: IORedis | null = null;

export function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redis) {
    redis = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  return redis;
}
