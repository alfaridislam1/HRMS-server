import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';

import { config } from '@config/env';
import { logger } from '@config/logger';
import { initializePostgres, closePostgres } from '@config/postgres';
import { initializeMongoDB, closeMongoDB } from '@config/mongodb';
import { initializeRedis, closeRedis } from '@config/redis';

import authMiddleware from '@middleware/auth';
import { errorHandler, AppError } from '@middleware/errorHandler';

// Routes
import authRoutes from '@routes/auth';
import employeeRoutes from '@routes/employees';
import leaveRoutes from '@routes/leaves';
import payrollRoutes from '@routes/payroll';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';
app.use(morgan(morganFormat, {
    stream: {
        write: (message: string) => logger.info(message.trim()),
    },
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/payroll', payrollRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.env,
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            path: req.path,
        },
    });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
