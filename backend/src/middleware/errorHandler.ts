import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: any
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Internal server error';

    logger.error({
        message,
        statusCode,
        code,
        path: req.path,
        method: req.method,
        userId: (req as any).userId,
        tenantId: (req as any).tenantId,
        stack: err.stack,
        details: err.details,
    });

    const clientMessage = statusCode === 500 ? 'Internal server error' : message;

    res.status(statusCode).json({
        error: {
            code,
            message: clientMessage,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

export default errorHandler;
