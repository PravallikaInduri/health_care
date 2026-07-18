import Redis from "ioredis";
import { logger } from "../utils/logger";

/*
Resilient Redis client.

The app must keep working even if Redis is not running, so:
- offline queue is disabled (commands fail fast instead of buffering)
- reconnection backs off and stops spamming logs
- all helpers swallow errors and degrade gracefully
*/

let warnedDown = false;

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    // Back off, and after several failures retry slowly (every 30s)
    if (times <= 5) {
      return Math.min(times * 500, 3000);
    }
    return 30000;
  },
});

redis.on("ready", () => {
  warnedDown = false;
  logger.info("Redis connected");
});

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  ) {
    return (err as { code: string }).code;
  }
  return String(err);
};

redis.on("error", (err: unknown) => {
  // Only log once per outage to avoid console spam
  if (!warnedDown) {
    warnedDown = true;
    logger.warn("Redis unavailable; running without cache", getErrorMessage(err));
  }
});

export const isRedisReady = () =>
  redis.status === "ready";

export const cacheGet = async (
  key: string
): Promise<string | null> => {
  if (!isRedisReady()) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> => {
  if (!isRedisReady()) return;
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    /* ignore cache write failures */
  }
};

export const cacheDel = async (
  key: string
): Promise<void> => {
  if (!isRedisReady()) return;
  try {
    await redis.del(key);
  } catch {
    /* ignore cache delete failures */
  }
};

export default redis;
