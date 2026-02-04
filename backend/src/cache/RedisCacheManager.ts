import Redis from 'ioredis';

/**
 * Redis Cache Manager
 * Handles caching for frequently accessed data:
 * - Organization structure (departments, designations)
 * - User permissions and roles
 * - Dashboard metrics
 * - Session data
 */

export class RedisCacheManager {
    private redis: Redis;
    private readonly defaultTTL = 3600; // 1 hour in seconds

    constructor(
        host: string = process.env.REDIS_HOST || 'localhost',
        port: number = parseInt(process.env.REDIS_PORT || '6379'),
        password?: string,
    ) {
        this.redis = new Redis({
            host,
            port,
            password,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            enableOfflineQueue: true,
        });

        this.redis.on('error', (err) => {
            console.error('Redis error:', err);
        });

        this.redis.on('connect', () => {
            console.log('✓ Redis connected');
        });
    }

    /**
     * Get a value from cache
     */
    async get<T = any>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch {
            return value as T;
        }
    }

    /**
     * Set a value in cache with optional TTL
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttl) {
            await this.redis.setex(key, ttl, serialized);
        } else {
            await this.redis.setex(key, this.defaultTTL, serialized);
        }
    }

    /**
     * Delete a key from cache
     */
    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }

    /**
     * Delete multiple keys matching a pattern
     */
    async deletePattern(pattern: string): Promise<void> {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        return (await this.redis.exists(key)) === 1;
    }

    /**
     * Increment a counter
     */
    async increment(key: string, amount = 1): Promise<number> {
        return this.redis.incrby(key, amount);
    }

    /**
     * Flush all cache (be careful!)
     */
    async flushAll(): Promise<void> {
        await this.redis.flushall();
    }

    /**
     * Close connection
     */
    async disconnect(): Promise<void> {
        await this.redis.quit();
    }

    /**
     * Get Redis client for advanced operations
     */
    getClient(): Redis {
        return this.redis;
    }
}

export default RedisCacheManager;
