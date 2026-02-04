import { Pool } from 'pg';
import { config } from './env';
import { logger } from './logger';
import { trackDbQuery } from '../middleware/metrics';

let pool: Pool;

export const initializePostgres = async (): Promise<Pool> => {
    pool = new Pool({
        host: config.database.postgres.host,
        port: config.database.postgres.port,
        user: config.database.postgres.user,
        password: config.database.postgres.password,
        database: config.database.postgres.database,
        min: config.database.postgres.pool.min,
        max: config.database.postgres.pool.max,
        ssl: config.database.postgres.ssl,
    });

    pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
    });

    try {
        const client = await pool.connect();

        // Wrap query for metrics
        const originalQuery = client.query.bind(client);
        client.query = (async (...args: any[]) => {
            const start = Date.now();
            try {
                const res = await (originalQuery as any)(...args);
                trackDbQuery('select'); // Simplification
                return res;
            } finally {
                const duration = Date.now() - start;
                // Could track duration here too
            }
        }) as any;

        const result = await client.query('SELECT NOW()');
        logger.info(`PostgreSQL connected. Server time: ${result.rows[0].now}`);
        client.release();
        return pool;
    } catch (err) {
        logger.error('Failed to connect to PostgreSQL:', err);
        throw err;
    }
};

export const getPostgres = (): Pool => {
    if (!pool) {
        throw new Error('PostgreSQL not initialized. Call initializePostgres() first.');
    }
    return pool;
};

export const closePostgres = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        logger.info('PostgreSQL connection pool closed');
    }
};
