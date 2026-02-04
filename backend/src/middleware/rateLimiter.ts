import { Request, Response, NextFunction } from 'express';

export interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

export interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Max requests per window
    keyGenerator?: (req: Request) => string; // Function to generate rate limit key
    skipSuccessfulRequests?: boolean; // Don't count successful responses
    skipFailedRequests?: boolean; // Don't count failed responses
    message?: string; // Custom message
}

/**
 * In-memory rate limiter
 * Note: For production, use Redis-based rate limiter
 */
export class RateLimiter {
    private store: RateLimitStore = {};
    private config: Required<RateLimitConfig>;

    constructor(config: RateLimitConfig) {
        this.config = {
            keyGenerator: (req) => req.ip || 'unknown',
            skipSuccessfulRequests: false,
            skipFailedRequests: false,
            message: 'Too many requests, please try again later',
            ...config
        };

        // Cleanup old entries every minute
        setInterval(() => this.cleanup(), 60 * 1000);
    }

    private cleanup(): void {
        const now = Date.now();
        Object.keys(this.store).forEach(key => {
            if (this.store[key].resetTime < now) {
                delete this.store[key];
            }
        });
    }

    /**
     * Middleware function for Express
     */
    middleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            const key = this.config.keyGenerator(req);
            const now = Date.now();

            // Initialize or get existing record
            if (!this.store[key] || this.store[key].resetTime < now) {
                this.store[key] = {
                    count: 0,
                    resetTime: now + this.config.windowMs
                };
            }

            const record = this.store[key];

            // Check if limit exceeded
            if (record.count >= this.config.maxRequests) {
                res.set('Retry-After', String(Math.ceil((record.resetTime - now) / 1000)));
                return res.status(429).json({
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: this.config.message,
                        retryAfter: Math.ceil((record.resetTime - now) / 1000)
                    }
                });
            }

            // Override res.json to check response status
            const originalJson = res.json.bind(res);
            res.json = function (data: any) {
                const shouldSkip = (
                    (this.statusCode >= 200 && this.statusCode < 300 && this.config.skipSuccessfulRequests) ||
                    (this.statusCode >= 400 && this.config.skipFailedRequests)
                );

                if (!shouldSkip) {
                    record.count++;
                }

                return originalJson.call(this, data);
            }.bind({ statusCode: res.statusCode, config: this.config });

            // If we're not skipping based on response, count it now
            if (!this.config.skipSuccessfulRequests && !this.config.skipFailedRequests) {
                record.count++;
            }

            // Add rate limit info to response headers
            res.set('X-RateLimit-Limit', String(this.config.maxRequests));
            res.set('X-RateLimit-Remaining', String(Math.max(0, this.config.maxRequests - record.count)));
            res.set('X-RateLimit-Reset', String(record.resetTime));

            next();
        };
    }

    /**
     * Reset limit for a specific key
     */
    reset(key: string): void {
        delete this.store[key];
    }

    /**
     * Reset all limits
     */
    resetAll(): void {
        this.store = {};
    }
}

/**
 * Create rate limiters with common configurations
 */
export const createRateLimiters = () => ({
    /**
     * Strict rate limiter for auth endpoints
     * 5 requests per minute
     */
    authLimiter: new RateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 5,
        message: 'Too many login attempts, please try again after 1 minute'
    }),

    /**
     * General API rate limiter
     * 100 requests per 15 minutes
     */
    apiLimiter: new RateLimiter({
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
        message: 'Too many requests, please try again later'
    }),

    /**
     * Permissive rate limiter for read operations
     * 1000 requests per 15 minutes
     */
    readLimiter: new RateLimiter({
        windowMs: 15 * 60 * 1000,
        maxRequests: 1000,
        skipSuccessfulRequests: false
    }),

    /**
     * Strict rate limiter for write operations
     * 50 requests per 15 minutes
     */
    writeLimiter: new RateLimiter({
        windowMs: 15 * 60 * 1000,
        maxRequests: 50,
        message: 'Too many write requests, please try again later'
    }),

    /**
     * Per-user rate limiter
     * 200 requests per hour, keyed by userId
     */
    createUserLimiter: () => new RateLimiter({
        windowMs: 60 * 60 * 1000,
        maxRequests: 200,
        keyGenerator: (req: any) => req.user?.userId || req.ip || 'unknown'
    })
});

/**
 * Create custom rate limiter with user-defined config
 */
export function createCustomRateLimiter(config: RateLimitConfig): RateLimiter {
    return new RateLimiter(config);
}
