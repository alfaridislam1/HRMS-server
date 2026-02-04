import { Request, Response, NextFunction } from 'express';
import { RouteObfuscator } from './routeObfuscator';

/**
 * Route obfuscation middleware
 * Intercepts incoming requests with obfuscated paths
 * Translates them to internal paths before routing
 */
export function createRouteObfuscationMiddleware(obfuscator: RouteObfuscator) {
    return (req: Request, res: Response, next: NextFunction) => {
        const obfuscatedPath = req.path;

        // Try to find mapping for this obfuscated path
        const mapping = obfuscator.getInternalPath(obfuscatedPath);

        if (mapping) {
            // Verify method matches
            if (mapping.method !== req.method.toUpperCase()) {
                return res.status(405).json({
                    error: {
                        code: 'METHOD_NOT_ALLOWED',
                        message: `Method ${req.method} not allowed for this endpoint`
                    }
                });
            }

            // Attach mapping info to request for later middleware
            (req as any).routeMapping = mapping;
            (req as any).internalPath = mapping.internalPath;
            (req as any).requiredRoles = mapping.requiredRole;

            // Update request path to internal path for routing
            // This is handled by the router configuration
            req.path = mapping.internalPath;
        }

        next();
    };
}

/**
 * Generate documentation for obfuscated routes
 * Returns a mapping of obfuscated to internal paths
 */
export function generateRouteDocumentation(obfuscator: RouteObfuscator) {
    return (req: Request, res: Response) => {
        if (process.env.NODE_ENV !== 'development') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Route documentation only available in development'
                }
            });
        }

        const mappings = obfuscator.getAllMappings();
        const documentation = mappings.map(m => ({
            externalPath: m.obfuscatedPath,
            internalPath: m.internalPath,
            method: m.method,
            requiredRoles: m.requiredRole,
            description: m.description
        }));

        res.json({
            total: documentation.length,
            mappings: documentation
        });
    };
}

/**
 * Health check endpoint
 * Does not require authentication
 */
export function healthCheckHandler() {
    return (req: Request, res: Response) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    };
}
