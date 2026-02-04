import { Request, Response, NextFunction } from 'express';
import { CloudWatchMetrics } from '@utils/cloudwatch';
import { logger } from '@config/logger';

/**
 * Prometheus Metrics Middleware
 * Exposes metrics endpoint for Prometheus scraping
 */

interface Metrics {
    http_requests_total: number;
    http_request_duration_seconds: number[];
    http_errors_total: number;
    db_queries_total: Record<string, number>;
    cache_operations_total: Record<string, number>;
}

const metrics: Metrics = {
    http_requests_total: 0,
    http_request_duration_seconds: [],
    http_errors_total: 0,
    db_queries_total: {},
    cache_operations_total: {},
};

/**
 * Metrics collection middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Track request
    metrics.http_requests_total++;

    // Track response
    res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        metrics.http_request_duration_seconds.push(duration);

        // Keep only last 1000 durations
        if (metrics.http_request_duration_seconds.length > 1000) {
            metrics.http_request_duration_seconds.shift();
        }

        // Track errors
        if (res.statusCode >= 400) {
            metrics.http_errors_total++;
        }

        // Send to CloudWatch
        CloudWatchMetrics.trackRequest(
            req.method,
            req.path,
            res.statusCode,
            duration
        ).catch(err => {
            logger.error('Failed to send metrics to CloudWatch:', err);
        });
    });

    next();
}

/**
 * Prometheus metrics endpoint handler
 */
export function metricsHandler(req: Request, res: Response): void {
    const avgDuration = metrics.http_request_duration_seconds.length > 0
        ? metrics.http_request_duration_seconds.reduce((a, b) => a + b, 0) / metrics.http_request_duration_seconds.length
        : 0;

    const maxDuration = metrics.http_request_duration_seconds.length > 0
        ? Math.max(...metrics.http_request_duration_seconds)
        : 0;

    // DB Metrics
    const dbMetrics = Object.entries(metrics.db_queries_total)
        .map(([type, count]) => `db_queries_total{type="${type}"} ${count}`)
        .join('\n');

    // Cache Metrics
    const cacheMetrics = Object.entries(metrics.cache_operations_total)
        .map(([op, count]) => `cache_operations_total{operation="${op}"} ${count}`)
        .join('\n');

    // Prometheus format
    const prometheusMetrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.http_requests_total}

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} ${metrics.http_request_duration_seconds.filter(d => d <= 0.1).length}
http_request_duration_seconds_bucket{le="0.5"} ${metrics.http_request_duration_seconds.filter(d => d <= 0.5).length}
http_request_duration_seconds_bucket{le="1"} ${metrics.http_request_duration_seconds.filter(d => d <= 1).length}
http_request_duration_seconds_bucket{le="2"} ${metrics.http_request_duration_seconds.filter(d => d <= 2).length}
http_request_duration_seconds_bucket{le="5"} ${metrics.http_request_duration_seconds.filter(d => d <= 5).length}
http_request_duration_seconds_bucket{le="+Inf"} ${metrics.http_request_duration_seconds.length}
http_request_duration_seconds_sum ${metrics.http_request_duration_seconds.reduce((a, b) => a + b, 0)}
http_request_duration_seconds_count ${metrics.http_request_duration_seconds.length}

# HELP http_errors_total Total number of HTTP errors
# TYPE http_errors_total counter
http_errors_total ${metrics.http_errors_total}

# HELP http_request_duration_seconds_avg Average HTTP request duration
# TYPE http_request_duration_seconds_avg gauge
http_request_duration_seconds_avg ${avgDuration}

# HELP http_request_duration_seconds_max Maximum HTTP request duration
# TYPE http_request_duration_seconds_max gauge
http_request_duration_seconds_max ${maxDuration}

# HELP db_queries_total Total number of database queries
# TYPE db_queries_total counter
${dbMetrics}

# HELP cache_operations_total Total number of cache operations
# TYPE cache_operations_total counter
${cacheMetrics}
`.trim();

    res.setHeader('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
}

/**
 * Helper functions to increment metrics from other parts of the app
 */
export const trackDbQuery = (type: string) => {
    metrics.db_queries_total[type] = (metrics.db_queries_total[type] || 0) + 1;
};

export const trackCacheOp = (op: 'hit' | 'miss' | 'set') => {
    metrics.cache_operations_total[op] = (metrics.cache_operations_total[op] || 0) + 1;
};


export default metricsMiddleware;
