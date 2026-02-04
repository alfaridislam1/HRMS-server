import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
    userId: string;
    tenantId: string;
    role: string;
    email: string;
    permissions: string[];
    iat: number;
    exp: number;
}

export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
    userId?: string;
    tenantId?: string;
    userRole?: string;
    permissions?: string[];
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 * Extracts and validates user information
 */
export function jwtAuthMiddleware() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return res.status(401).json({
                    error: {
                        code: 'MISSING_TOKEN',
                        message: 'Authorization header is missing'
                    }
                });
            }

            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;

            const secret = process.env.JWT_SECRET || 'your-secret-key';

            const decoded = jwt.verify(token, secret) as JWTPayload;

            // Attach user info to request
            req.user = decoded;
            req.userId = decoded.userId;
            req.tenantId = decoded.tenantId;
            req.userRole = decoded.role;
            req.permissions = decoded.permissions || [];

            next();
        } catch (error) {
            const message = error instanceof jwt.TokenExpiredError
                ? 'Token has expired'
                : error instanceof jwt.JsonWebTokenError
                    ? 'Invalid token'
                    : 'Authentication failed';

            const code = error instanceof jwt.TokenExpiredError
                ? 'TOKEN_EXPIRED'
                : 'INVALID_TOKEN';

            return res.status(401).json({
                error: {
                    code,
                    message
                }
            });
        }
    };
}

/**
 * Generate JWT token for user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '24h'): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        return jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Middleware to check if user is authenticated
 * Used as route middleware
 */
export function requireAuth() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: {
                    code: 'NOT_AUTHENTICATED',
                    message: 'User is not authenticated'
                }
            });
        }
        next();
    };
}
