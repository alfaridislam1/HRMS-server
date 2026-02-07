import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, decodeToken } from '@utils/auth';
import { logger } from '@config/logger';
import { AuthenticatedRequest } from '@app-types/index';

export interface ExtendedRequest extends Request, AuthenticatedRequest {
    userId?: string;
    tenantId?: string;
    user?: any;
    roles?: string[];
    permissions?: string[];
}

export const authMiddleware = (req: ExtendedRequest, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Missing authorization header',
                },
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid authorization header format',
                },
            });
            return;
        }

        const decoded = verifyAccessToken(token);
        req.userId = decoded.user_id;
        req.tenantId = decoded.tenant_id;
        req.user = decoded;
        req.roles = decoded.roles;
        req.permissions = decoded.permissions;

        logger.debug(`Auth successful for user ${decoded.user_id} in tenant ${decoded.tenant_id}`);
        next();
    } catch (err: any) {
        logger.warn('Authentication failed:', err.message);

        if (err.name === 'TokenExpiredError') {
            res.status(401).json({
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Access token has expired',
                },
            });
            return;
        }

        if (err.name === 'JsonWebTokenError') {
            res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid access token',
                },
            });
            return;
        }

        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication failed',
            },
        });
    }
};

export default authMiddleware;
