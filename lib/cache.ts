import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

// In-Memory cache storage entry
interface MemoryCacheEntry {
  value: string; // JSON serialized
  expiresAt: number;
}

const globalForCache = globalThis as unknown as {
  memoryCache: Map<string, MemoryCacheEntry> | undefined;
  upstashClient: UpstashRedis | undefined;
  ioRedisClient: IORedis | undefined;
};

const memoryCache = globalForCache.memoryCache ?? new Map<string, MemoryCacheEntry>();
globalForCache.memoryCache = memoryCache;

// 1. Initialize Upstash Redis if REST credentials are provided
function getUpstashClient(): UpstashRedis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    if (!globalForCache.upstashClient) {
      globalForCache.upstashClient = new UpstashRedis({ url, token });
    }
    return globalForCache.upstashClient;
  }
  return null;
}

// 2. Initialize standard IORedis if REDIS_URL is provided (e.g. redis://...)
function getIORedisClient(): IORedis | null {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    if (!globalForCache.ioRedisClient) {
      try {
        globalForCache.ioRedisClient = new IORedis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          lazyConnect: true,
          retryStrategy(times) {
            if (times > 3) return null; // Stop retrying on repeated connection failures
            return Math.min(times * 100, 1000);
          },
        });
        globalForCache.ioRedisClient.on("error", (err) => {
          // Suppress unhandled redis connection errors, fallback to memory
          console.warn("[Cache] Redis connection error, continuing with fallback:", err.message);
        });
      } catch {
        return null;
      }
    }
    return globalForCache.ioRedisClient;
  }
  return null;
}

/**
 * Returns active cache provider info
 */
export function getCacheProvider(): "upstash" | "ioredis" | "memory" {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return "upstash";
  }
  if (process.env.REDIS_URL) {
    return "ioredis";
  }
  return "memory";
}

/**
 * Clean up expired entries in memory cache (LRU hygiene)
 */
function pruneExpiredMemoryEntries() {
  if (memoryCache.size < 500) return;
  const now = Date.now();
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt <= now) {
      memoryCache.delete(k);
    }
  }
  // Hard cap to prevent memory bloat
  if (memoryCache.size > 2000) {
    const keysToDelete = Array.from(memoryCache.keys()).slice(0, 500);
    for (const k of keysToDelete) {
      memoryCache.delete(k);
    }
  }
}

/**
 * Retrieve cached value by key
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      const data = await upstash.get<T>(key);
      return data ?? null;
    } catch (err: any) {
      console.warn(`[Cache] Upstash get error for "${key}":`, err.message);
    }
  }

  const ioRedis = getIORedisClient();
  if (ioRedis) {
    try {
      const str = await ioRedis.get(key);
      if (str) {
        return JSON.parse(str) as T;
      }
      return null;
    } catch (err: any) {
      console.warn(`[Cache] IORedis get error for "${key}":`, err.message);
    }
  }

  // Fallback to high-speed in-memory cache
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    memoryCache.delete(key);
    return null;
  }
}

/**
 * Set cached value with TTL in seconds
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      await upstash.set(key, value, { ex: ttlSeconds });
      return;
    } catch (err: any) {
      console.warn(`[Cache] Upstash set error for "${key}":`, err.message);
    }
  }

  const ioRedis = getIORedisClient();
  if (ioRedis) {
    try {
      await ioRedis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch (err: any) {
      console.warn(`[Cache] IORedis set error for "${key}":`, err.message);
    }
  }

  // Fallback to high-speed in-memory cache
  pruneExpiredMemoryEntries();
  memoryCache.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Delete a single cache entry
 */
export async function deleteCache(key: string): Promise<void> {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      await upstash.del(key);
    } catch {}
  }

  const ioRedis = getIORedisClient();
  if (ioRedis) {
    try {
      await ioRedis.del(key);
    } catch {}
  }

  memoryCache.delete(key);
}

/**
 * Delete all cache entries matching a prefix pattern (e.g. "queue:today:*")
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const prefix = pattern.replace(/\*+$/, "");

  const upstash = getUpstashClient();
  if (upstash) {
    try {
      const keys = await upstash.keys(pattern);
      if (keys.length > 0) {
        await upstash.del(...keys);
      }
    } catch {}
  }

  const ioRedis = getIORedisClient();
  if (ioRedis) {
    try {
      const keys = await ioRedis.keys(pattern);
      if (keys.length > 0) {
        await ioRedis.del(...keys);
      }
    } catch {}
  }

  // In-memory prefix matching
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) {
      memoryCache.delete(k);
    }
  }
}

/**
 * Atomic Get-Or-Set: Returns cached data if available; otherwise executes fetcher, caches result, and returns.
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fresh = await fetcher();
  if (fresh !== undefined && fresh !== null) {
    // Fire and forget cache write to not block response
    setCache(key, fresh, ttlSeconds).catch(() => {});
  }
  return fresh;
}
