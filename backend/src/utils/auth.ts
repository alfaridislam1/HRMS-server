import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { config } from '@config/env';
import { logger } from '@config/logger';
import { JWTPayload } from '@app-types/index';

export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    try {
        const token = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expirySeconds,
            issuer: 'hrms.masirat.com',
            audience: 'hrms-client',
        });
        return token;
    } catch (err) {
        logger.error('Failed to generate access token:', err);
        throw err;
    }
};

export const generateRefreshToken = (userId: string): string => {
    try {
        const token = jwt.sign({ userId }, config.jwt.refreshSecret, {
            expiresIn: config.jwt.refreshExpirySeconds,
            issuer: 'hrms.masirat.com',
        });
        return token;
    } catch (err) {
        logger.error('Failed to generate refresh token:', err);
        throw err;
    }
};

export const verifyAccessToken = (token: string): JWTPayload => {
    try {
        const decoded = jwt.verify(token, config.jwt.secret, {
            issuer: 'hrms.masirat.com',
            audience: 'hrms-client',
        }) as JWTPayload;
        return decoded;
    } catch (err) {
        logger.warn('Failed to verify access token:', err);
        throw err;
    }
};

export const verifyRefreshToken = (token: string): { userId: string } => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret, {
            issuer: 'hrms.masirat.com',
        }) as { userId: string };
        return decoded;
    } catch (err) {
        logger.warn('Failed to verify refresh token:', err);
        throw err;
    }
};

export const hashPassword = async (password: string): Promise<string> => {
    try {
        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(password, salt);
        return hash;
    } catch (err) {
        logger.error('Failed to hash password:', err);
        throw err;
    }
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    try {
        return await bcryptjs.compare(password, hash);
    } catch (err) {
        logger.error('Failed to compare password:', err);
        throw err;
    }
};

export const decodeToken = (token: string): any => {
    try {
        return jwt.decode(token);
    } catch (err) {
        logger.warn('Failed to decode token:', err);
        return null;
    }
};
