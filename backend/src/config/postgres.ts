import { Pool } from 'pg';
import { config } from './env';
import { logger } from './logger';

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
