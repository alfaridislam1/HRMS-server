import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';
import { trackCacheOp } from '../middleware/metrics';

let redisClient: Redis;

export const initializeRedis = async (): Promise<Redis> => {
    redisClient = new Redis(config.redis.url, {
        db: config.redis.db,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: null,
    });

    redisClient.on('error', (err) => {
        logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
        logger.info('Redis connected successfully');

        // Wrap get/set for metrics
        const originalGet = redisClient.get.bind(redisClient);
        redisClient.get = (async (key: string) => {
            const val = await originalGet(key);
            trackCacheOp(val ? 'hit' : 'miss');
            return val;
        }) as any;

        const originalSet = redisClient.set.bind(redisClient);
        redisClient.set = (async (...args: any[]) => {
            const res = await (originalSet as any)(...args);
            trackCacheOp('set');
            return res;
        }) as any;
    });

    try {
        await redisClient.ping();
        logger.info('Redis ping successful');
        return redisClient;
    } catch (err) {
        logger.error('Failed to connect to Redis:', err);
        throw err;
    }
};

export const getRedis = (): Redis => {
    if (!redisClient) {
        throw new Error('Redis not initialized. Call initializeRedis() first.');
    }
    return redisClient;
};

export const closeRedis = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
};
