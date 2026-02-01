import app from './app';
import { config } from '@config/env';
import { logger } from '@config/logger';
import {
    initializePostgres,
    closePostgres,
} from '@config/postgres';
import {
    initializeMongoDB,
    closeMongoDB,
} from '@config/mongodb';
import {
    initializeRedis,
    closeRedis,
} from '@config/redis';

const PORT = config.port;

let server: any;

const startServer = async () => {
    try {
        logger.info(`Starting HRMS Backend Server (${config.env})`);

        // Initialize databases
        logger.info('Initializing PostgreSQL connection...');
        await initializePostgres();

        logger.info('Initializing MongoDB connection...');
        await initializeMongoDB();

        logger.info('Initializing Redis connection...');
        await initializeRedis();

        // Start Express server
        server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`✓ HRMS Backend Server running on port ${PORT}`);
            logger.info(`✓ API URL: ${config.urls.api}`);
            logger.info(`✓ Environment: ${config.env}`);
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
};

const gracefulShutdown = async () => {
    logger.info('Shutting down server gracefully...');

    if (server) {
        server.close(async () => {
            logger.info('HTTP server closed');

            try {
                await closePostgres();
                await closeMongoDB();
                await closeRedis();

                logger.info('All database connections closed');
                process.exit(0);
            } catch (err) {
                logger.error('Error during shutdown:', err);
                process.exit(1);
            }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after 30 seconds');
            process.exit(1);
        }, 30000);
    }
};

// Handle signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
});

startServer();
