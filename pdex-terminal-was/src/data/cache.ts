import { Redis } from "ioredis";
import { config } from "../config/index.js";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<{ data: T; cachedAt: string } | null> {
  try {
    const raw = await getRedis().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; cachedAt: string };
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  try {
    const payload = JSON.stringify({ data, cachedAt: new Date().toISOString() });
    await getRedis().set(key, payload, "EX", ttlSeconds);
  } catch {
    // Cache write failure is non-critical
  }
}

export function cacheKey(type: string, ...parts: string[]): string {
  return `pdex:${type}:${parts.join(":")}`;
}
