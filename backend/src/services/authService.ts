import { getPostgres } from '@config/postgres';
import { getRedis } from '@config/redis';
import { logger } from '@config/logger';
import { generateAccessToken, generateRefreshToken, hashPassword, comparePassword } from '@utils/auth';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
    async register(data: {
        email: string;
        password: string;
        full_name: string;
        tenant_name: string;
    }): Promise<any> {
        try {
            const db = getPostgres();

            // Create tenant
            const tenantId = uuidv4();
            const schemaName = `tenant_${Math.random().toString(36).substring(7)}`;

            const hashedPassword = await hashPassword(data.password);

            // Insert tenant
            const tenantQuery = `
        INSERT INTO public.tenants (id, name, slug, schema_name, subscription_plan, subscription_status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

            const slug = data.tenant_name.toLowerCase().replace(/\s+/g, '-');
            const tenantResult = await db.query(tenantQuery, [
                tenantId,
                data.tenant_name,
                slug,
                schemaName,
                'trial',
                'active',
            ]);

            // Create user in public schema
            const userQuery = `
        INSERT INTO public.users (id, email, password_hash, full_name, status, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email
      `;

            const userId = uuidv4();
            const userResult = await db.query(userQuery, [
                userId,
                data.email,
                hashedPassword,
                data.full_name,
                'active',
                false,
            ]);

            logger.info(`User registered: ${userResult.rows[0].email}, Tenant: ${tenantId}`);

            return {
                user_id: userResult.rows[0].id,
                email: userResult.rows[0].email,
                tenant_id: tenantId,
            };
        } catch (err) {
            logger.error('Registration failed:', err);
            throw err;
        }
    }

    async login(email: string, password: string, tenantSlug: string): Promise<any> {
        try {
            const db = getPostgres();

            // Get tenant
            const tenantQuery = 'SELECT id FROM public.tenants WHERE slug = $1 AND subscription_status = $2';
            const tenantResult = await db.query(tenantQuery, [tenantSlug, 'active']);

            if (tenantResult.rows.length === 0) {
                throw new Error('Tenant not found or inactive');
            }

            const tenantId = tenantResult.rows[0].id;

            // Get user
            const userQuery = 'SELECT id, password_hash, full_name FROM public.users WHERE email = $1 AND status = $2';
            const userResult = await db.query(userQuery, [email, 'active']);

            if (userResult.rows.length === 0) {
                throw new Error('Invalid email or password');
            }

            const user = userResult.rows[0];
            const isPasswordValid = await comparePassword(password, user.password_hash);

            if (!isPasswordValid) {
                throw new Error('Invalid email or password');
            }

            // Get user roles
            const rolesQuery = `
        SELECT r.code FROM public.roles r
        WHERE r.tenant_id = $1 AND r.user_id = $2
      `;

            const rolesResult = await db.query(rolesQuery, [tenantId, user.id]);
            const roles = rolesResult.rows.map((r: any) => r.code) || ['EMPLOYEE'];

            // Generate tokens
            const accessToken = generateAccessToken({
                user_id: user.id,
                tenant_id: tenantId,
                email,
                roles,
                permissions: [], // Can be fetched based on roles
            });

            const refreshToken = generateRefreshToken(user.id);

            // Store refresh token in Redis
            const redis = getRedis();
            const rtKey = `hrms:refresh_token:${user.id}`;
            await redis.setex(rtKey, 604800, refreshToken); // 7 days

            logger.info(`User logged in: ${email} in tenant ${tenantId}`);

            return {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: 3600,
                user: {
                    id: user.id,
                    email,
                    full_name: user.full_name,
                    roles,
                    tenant_id: tenantId,
                },
            };
        } catch (err) {
            logger.error('Login failed:', err);
            throw err;
        }
    }

    async refreshToken(refreshToken: string): Promise<any> {
        try {
            const redis = getRedis();

            // Verify refresh token exists in Redis
            const rtKey = `hrms:refresh_token:*`;
            const keys = await redis.keys(rtKey);

            let userId: string | null = null;
            for (const key of keys) {
                const stored = await redis.get(key);
                if (stored === refreshToken) {
                    userId = key.split(':')[3];
                    break;
                }
            }

            if (!userId) {
                throw new Error('Invalid refresh token');
            }

            // Get user and tenant info
            const db = getPostgres();
            const userQuery = 'SELECT email, full_name FROM public.users WHERE id = $1';
            const userResult = await db.query(userQuery, [userId]);

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];

            // Generate new access token
            const accessToken = generateAccessToken({
                user_id: userId,
                tenant_id: '', // Would need to be fetched from user_tenant mapping
                email: user.email,
                roles: [],
                permissions: [],
            });

            return {
                access_token: accessToken,
                expires_in: 3600,
            };
        } catch (err) {
            logger.error('Token refresh failed:', err);
            throw err;
        }
    }

    async logout(userId: string): Promise<void> {
        try {
            const redis = getRedis();
            const rtKey = `hrms:refresh_token:${userId}`;
            await redis.del(rtKey);
            logger.info(`User logged out: ${userId}`);
        } catch (err) {
            logger.error('Logout failed:', err);
            throw err;
        }
    }
}

export default AuthService;
