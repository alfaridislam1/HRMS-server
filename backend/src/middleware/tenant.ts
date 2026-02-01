import { Response, NextFunction } from 'express';
import { getPostgres } from '@config/postgres';
import { logger } from '@config/logger';
import { ExtendedRequest } from './auth';

export const tenantMiddleware = async (
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.tenantId) {
            return res.status(401).json({
                error: {
                    code: 'MISSING_TENANT',
                    message: 'Tenant ID not found in request',
                },
            });
        }

        // Fetch tenant info from public schema
        const db = getPostgres();
        const tenantResult = await db.query(
            'SELECT id, schema_name FROM public.tenants WHERE id = $1 AND subscription_status = $2',
            [req.tenantId, 'active']
        );

        if (tenantResult.rows.length === 0) {
            return res.status(403).json({
                error: {
                    code: 'TENANT_NOT_FOUND',
                    message: 'Tenant not found or inactive',
                },
            });
        }

        const tenant = tenantResult.rows[0];
        req.tenantId = tenant.id;
        (req as any).tenantSchemaName = tenant.schema_name;

        // Set PostgreSQL search path to tenant schema
        await db.query(`SET search_path TO ${tenant.schema_name}, public`);

        logger.debug(`Tenant context set to ${tenant.schema_name}`);
        next();
    } catch (err) {
        logger.error('Tenant middleware error:', err);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to set tenant context',
            },
        });
    }
};

export default tenantMiddleware;
