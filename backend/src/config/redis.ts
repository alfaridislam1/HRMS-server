import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

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
