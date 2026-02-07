import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';

import { config } from '@config/env';
import { logger } from '@config/logger';
import { initializePostgres, closePostgres } from '@config/postgres';
import { initializeMongoDB, closeMongoDB } from '@config/mongodb';
import { initializeRedis, closeRedis } from '@config/redis';

import authMiddleware from '@middleware/auth';
import { errorHandler, AppError } from '@middleware/errorHandler';

const app: Express = express();

// 1. Diagnostic Logging (Absolute Top)
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`\n--- Incoming Request: ${req.method} ${req.url} ---`);
    console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
    next();
});

// 2. Simple Health Check (Before heavy middleware)
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.env,
    });
});

// 3. Optional Middleware (Commented out for debugging)
// app.use(helmet());
// app.use(cors({ ... }));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
import authRoutes from '@routes/auth';
import employeeRoutes from '@routes/employees';
import departmentRoutes from '@routes/departments';
import leaveRoutes from '@routes/leaves';
import payrollRoutes from '@routes/payroll';

app.use('/api/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/payroll', payrollRoutes);

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
