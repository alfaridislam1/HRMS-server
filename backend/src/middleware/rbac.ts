import { Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { ExtendedRequest } from './auth';

export const rbacMiddleware = (requiredRoles?: string[], requiredPermissions?: string[]) => {
    return (req: ExtendedRequest, res: Response, next: NextFunction) => {
        try {
            // No specific requirements, just continue
            if (!requiredRoles || requiredRoles.length === 0) {
                if (!requiredPermissions || requiredPermissions.length === 0) {
                    return next();
                }
            }

            if (!req.roles || req.roles.length === 0) {
                logger.warn(`No roles found for user ${req.userId}`);
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'User has no roles assigned',
                    },
                });
            }

            // Check required roles (OR logic)
            if (requiredRoles && requiredRoles.length > 0) {
                const hasRole = requiredRoles.some((role) => req.roles!.includes(role));
                if (!hasRole) {
                    logger.warn(
                        `User ${req.userId} missing required roles: ${requiredRoles.join(', ')}`
                    );
                    return res.status(403).json({
                        error: {
                            code: 'INSUFFICIENT_ROLE',
                            message: `Required roles: ${requiredRoles.join(', ')}`,
                        },
                    });
                }
            }

            // Check required permissions (OR logic)
            if (requiredPermissions && requiredPermissions.length > 0) {
                const hasPermission = requiredPermissions.some(
                    (permission) => req.permissions && req.permissions.includes(permission)
                );
                if (!hasPermission) {
                    logger.warn(
                        `User ${req.userId} missing required permissions: ${requiredPermissions.join(', ')}`
                    );
                    return res.status(403).json({
                        error: {
                            code: 'INSUFFICIENT_PERMISSION',
                            message: `Required permissions: ${requiredPermissions.join(', ')}`,
                        },
                    });
                }
            }

            logger.debug(`RBAC check passed for user ${req.userId}`);
            next();
        } catch (err) {
            logger.error('RBAC middleware error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Authorization check failed',
                },
            });
        }
    };
};

export default rbacMiddleware;
