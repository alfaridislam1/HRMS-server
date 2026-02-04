import { Router, Request, Response, Express } from 'express';
import { StructuredLogger, requestLogger } from '../middleware/logger';
import { jwtAuthMiddleware, requireAuth } from '../middleware/jwtAuth';
import { RouteObfuscator, createRouteObfuscator } from '../middleware/routeObfuscator';
import { createRateLimiters } from '../middleware/rateLimiter';
import { sanitizeRequestData } from '../middleware/validator';
import { errorHandler, notFoundHandler, asyncHandler } from '../middleware/errorHandler';
import { createRouteObfuscationMiddleware, generateRouteDocumentation, healthCheckHandler } from '../middleware/routeHandler';

// Import route modules
import employeeRoutes from './employees';
import leaveRoutes from './leaveRoutes';
import payrollRoutes from './payrollRoutes';
import dashboardRoutes from './dashboardRoutes';
import approvalsRoutes from './approvalsRoutes';

export class APIRouter {
    private router: Router;
    private app: Express;
    private logger: StructuredLogger;
    private obfuscator: RouteObfuscator;
    private rateLimiters: ReturnType<typeof createRateLimiters>;

    constructor(app: Express) {
        this.app = app;
        this.router = Router();
        this.logger = new StructuredLogger();
        this.obfuscator = createRouteObfuscator();
        this.rateLimiters = createRateLimiters();
    }

    /**
     * Initialize all routes
     */
    public initialize(): void {
        // ==================== Global Middleware ====================

        // Request logging
        this.app.use(requestLogger(this.logger));

        // Sanitize input
        this.app.use(sanitizeRequestData());

        // ==================== Public Routes (No Auth Required) ====================

        // Health check
        this.app.get('/health', healthCheckHandler());

        // Route documentation (development only)
        this.app.get('/api/routes', generateRouteDocumentation(this.obfuscator));

        // ==================== API Routes ====================

        // General rate limiter
        this.app.use('/api/', this.rateLimiters.apiLimiter.middleware());

        // Route obfuscation middleware
        this.app.use(createRouteObfuscationMiddleware(this.obfuscator));

        // Authentication middleware for protected routes
        this.app.use('/api/', jwtAuthMiddleware());

        // ==================== Employee Routes ====================
        this.app.use('/api/employees', this.rateLimiters.readLimiter.middleware(), employeeRoutes);

        // ==================== Leave Routes ====================
        this.app.use('/api/leaves', this.rateLimiters.readLimiter.middleware(), leaveRoutes);
        this.app.use('/api/leave-balance', this.rateLimiters.readLimiter.middleware(), leaveRoutes);

        // ==================== Payroll Routes ====================
        this.app.use('/api/payroll', this.rateLimiters.writeLimiter.middleware(), payrollRoutes);

        // ==================== Dashboard Routes ====================
        this.app.use('/api/dashboard', this.rateLimiters.readLimiter.middleware(), dashboardRoutes);

        // ==================== Approval Routes ====================
        this.app.use('/api/approvals', this.rateLimiters.readLimiter.middleware(), approvalsRoutes);

        // ==================== Error Handling ====================

        // 404 handler
        this.app.use(notFoundHandler());

        // Global error handler (must be last)
        this.app.use(errorHandler());
    }

    /**
     * Get route obfuscator instance
     */
    public getObfuscator(): RouteObfuscator {
        return this.obfuscator;
    }

    /**
     * Get logger instance
     */
    public getLogger(): StructuredLogger {
        return this.logger;
    }

    /**
     * Register custom route
     */
    public registerCustomRoute(
        obfuscatedPath: string,
        internalPath: string,
        method: string,
        requiredRoles: string[],
        handler: (req: Request, res: Response) => Promise<void>
    ): void {
        this.obfuscator.registerRoute(obfuscatedPath, internalPath, {
            method,
            requiredRole: requiredRoles
        });

        // Register the actual route
        const routeMethod = method.toLowerCase() as keyof Router;
        if (routeMethod in this.router) {
            (this.router[routeMethod] as any)(internalPath, asyncHandler(handler));
        }
    }
}

export default APIRouter;
