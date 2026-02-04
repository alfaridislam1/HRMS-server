import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

export interface RequestLog {
    timestamp: string;
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
    userRole?: string;
    ipAddress: string;
    userAgent: string;
    error?: {
        code: string;
        message: string;
        stack?: string;
    };
}

export class StructuredLogger {
    private logDir: string;

    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private getLogFileName(level: 'info' | 'error' | 'warning'): string {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${level}-${date}.log`);
    }

    private formatLog(entry: any): string {
        return `[${entry.timestamp}] ${JSON.stringify(entry)}\n`;
    }

    log(level: 'info' | 'error' | 'warning', message: string, data?: any): void {
        const entry = {
            level,
            timestamp: new Date().toISOString(),
            message,
            ...(data && { data })
        };

        const logFile = this.getLogFileName(level);
        const formatted = this.formatLog(entry);

        fs.appendFileSync(logFile, formatted, 'utf8');

        // Also log to console in development
        if (process.env.NODE_ENV !== 'production') {
            const color = level === 'error' ? '\x1b[31m' : level === 'warning' ? '\x1b[33m' : '\x1b[32m';
            const reset = '\x1b[0m';
            console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`, data || '');
        }
    }

    info(message: string, data?: any): void {
        this.log('info', message, data);
    }

    error(message: string, data?: any): void {
        this.log('error', message, data);
    }

    warning(message: string, data?: any): void {
        this.log('warning', message, data);
    }

    logRequest(requestLog: RequestLog): void {
        const logFile = this.getLogFileName('info');
        const formatted = this.formatLog(requestLog);
        fs.appendFileSync(logFile, formatted, 'utf8');
    }
}

/**
 * Express middleware for structured request logging
 */
export function requestLogger(logger: StructuredLogger) {
    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();
        const requestId = generateRequestId();

        // Attach to request for use in other middleware
        (req as any).requestId = requestId;
        (req as any).logger = logger;

        // Override res.json to log the response
        const originalJson = res.json.bind(res);
        res.json = function (data: any) {
            const duration = Date.now() - startTime;

            const logEntry: RequestLog = {
                timestamp: new Date().toISOString(),
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                userId: (req as any).userId,
                userRole: (req as any).userRole,
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('user-agent') || 'unknown',
                ...(res.statusCode >= 400 && data?.error && {
                    error: {
                        code: data.error.code,
                        message: data.error.message
                    }
                })
            };

            logger.logRequest(logEntry);
            return originalJson(data);
        };

        next();
    };
}

export function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
