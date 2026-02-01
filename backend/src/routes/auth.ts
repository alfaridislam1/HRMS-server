import express from 'express';
import { Response } from 'express';
import AuthService from '@services/authService';
import { AppError, asyncHandler } from '@middleware/errorHandler';
import { ExtendedRequest } from '@middleware/auth';
import { logger } from '@config/logger';

const router = express.Router();
const authService = new AuthService();

// Register
router.post(
    '/register',
    asyncHandler(async (req: ExtendedRequest, res: Response) => {
        const { email, password, full_name, tenant_name } = req.body;

        if (!email || !password || !full_name || !tenant_name) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Missing required fields');
        }

        const result = await authService.register({ email, password, full_name, tenant_name });

        res.status(201).json({
            success: true,
            data: result,
        });
    })
);

// Login
router.post(
    '/login',
    asyncHandler(async (req: ExtendedRequest, res: Response) => {
        const { email, password, tenant_slug } = req.body;

        if (!email || !password || !tenant_slug) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Missing required fields');
        }

        const result = await authService.login(email, password, tenant_slug);

        res.json({
            success: true,
            data: result,
        });
    })
);

// Refresh token
router.post(
    '/refresh',
    asyncHandler(async (req: ExtendedRequest, res: Response) => {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Refresh token required');
        }

        const result = await authService.refreshToken(refresh_token);

        res.json({
            success: true,
            data: result,
        });
    })
);

// Logout
router.post(
    '/logout',
    asyncHandler(async (req: ExtendedRequest, res: Response) => {
        if (!req.userId) {
            throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
        }

        await authService.logout(req.userId);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    })
);

// Health check
router.get('/health', (req: ExtendedRequest, res: Response) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

export default router;
