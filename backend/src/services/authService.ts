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
                'starter',
                'trial',
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

            // Assign HR_ADMIN role to the user for this tenant
            const roleQuery = `
        INSERT INTO public.roles (id, tenant_id, user_id, code, name)
        VALUES ($1, $2, $3, $4, $5)
      `;
            await db.query(roleQuery, [uuidv4(), tenantId, userId, 'HR_ADMIN', 'HR Administrator']);

            // Provision tenant schema and tables
            await this.provisionTenantSchema(schemaName);

            logger.info(`User registered: ${userResult.rows[0].email}, Tenant: ${tenantId}, Schema: ${schemaName}, Role: HR_ADMIN`);

            return {
                user_id: userResult.rows[0].id,
                email: userResult.rows[0].email,
                tenant_id: tenantId,
                schema_name: schemaName,
            };
        } catch (err) {
            logger.error('Registration failed:', err);
            throw err;
        }
    }

    private async provisionTenantSchema(schemaName: string): Promise<void> {
        const db = getPostgres();
        try {
            // 1. Create Schema
            await db.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

            // 2. Create Departments table
            await db.query(`
                CREATE TABLE "${schemaName}".departments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(100) NOT NULL,
                    code VARCHAR(50),
                    parent_department_id UUID REFERENCES "${schemaName}".departments(id) ON DELETE SET NULL,
                    budget VARCHAR(20),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 3. Create Employees table
            await db.query(`
                CREATE TABLE "${schemaName}".employees (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    employee_id VARCHAR(50) UNIQUE NOT NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email_company VARCHAR(255) UNIQUE NOT NULL,
                    email_personal VARCHAR(255),
                    phone_company VARCHAR(20),
                    phone_personal VARCHAR(20),
                    date_of_birth DATE,
                    job_title VARCHAR(100),
                    department_id UUID REFERENCES "${schemaName}".departments(id),
                    manager_id UUID REFERENCES "${schemaName}".employees(id) ON DELETE SET NULL,
                    employment_type VARCHAR(50) NOT NULL,
                    employment_status VARCHAR(50) DEFAULT 'active',
                    start_date DATE NOT NULL,
                    end_date DATE,
                    work_location VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TIMESTAMP WITH TIME ZONE,
                    created_by UUID,
                    updated_by UUID
                )
            `);

            // 4. Create Leave Types table
            await db.query(`
                CREATE TABLE "${schemaName}".leave_types (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(100) NOT NULL,
                    code VARCHAR(20),
                    annual_entitlement INTEGER NOT NULL,
                    paid BOOLEAN DEFAULT TRUE,
                    description TEXT,
                    requires_approval BOOLEAN DEFAULT TRUE,
                    country_code VARCHAR(2),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 5. Create Leave Requests table
            await db.query(`
                CREATE TABLE "${schemaName}".leave_requests (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    employee_id UUID REFERENCES "${schemaName}".employees(id) ON DELETE CASCADE NOT NULL,
                    leave_type_id UUID REFERENCES "${schemaName}".leave_types(id) ON DELETE CASCADE NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    duration_days INTEGER,
                    reason TEXT,
                    status VARCHAR(50) DEFAULT 'draft',
                    approved_by UUID,
                    approval_comment TEXT,
                    approved_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 6. Create Attendance table
            await db.query(`
                CREATE TABLE "${schemaName}".attendance (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    employee_id UUID REFERENCES "${schemaName}".employees(id) ON DELETE CASCADE NOT NULL,
                    attendance_date DATE NOT NULL,
                    check_in_time TIME,
                    check_out_time TIME,
                    work_hours_scheduled DECIMAL(5, 2),
                    work_hours_actual DECIMAL(5, 2),
                    status VARCHAR(50) DEFAULT 'present',
                    location VARCHAR(100),
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(employee_id, attendance_date)
                )
            `);

            // 7. Create Payroll Periods table
            await db.query(`
                CREATE TABLE "${schemaName}".payroll_periods (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    period_name VARCHAR(50) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    salary_due_date DATE,
                    status VARCHAR(50) DEFAULT 'draft',
                    total_employees INTEGER DEFAULT 0,
                    total_salary DECIMAL(15, 2) DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(start_date, end_date)
                )
            `);

            // 8. Create Salary Slips table
            await db.query(`
                CREATE TABLE "${schemaName}".salary_slips (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    employee_id UUID REFERENCES "${schemaName}".employees(id) ON DELETE CASCADE NOT NULL,
                    payroll_period_id UUID REFERENCES "${schemaName}".payroll_periods(id) ON DELETE CASCADE NOT NULL,
                    base_salary DECIMAL(12, 2),
                    allowances DECIMAL(12, 2) DEFAULT 0,
                    deductions DECIMAL(12, 2) DEFAULT 0,
                    net_salary DECIMAL(12, 2),
                    paid_status VARCHAR(50) DEFAULT 'pending',
                    paid_at TIMESTAMP WITH TIME ZONE,
                    payment_reference VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(employee_id, payroll_period_id)
                )
            `);

            // 9. Create Audit Log table
            await db.query(`
                CREATE TABLE "${schemaName}".audit_log (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    action VARCHAR(100) NOT NULL,
                    resource_type VARCHAR(50) NOT NULL,
                    resource_id UUID,
                    resource_name VARCHAR(255),
                    old_values JSONB,
                    new_values JSONB,
                    performed_by UUID,
                    ip_address VARCHAR(45),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);

            logger.info(`Successfully provisioned full schema: ${schemaName}`);
        } catch (err) {
            logger.error(`Failed to provision schema ${schemaName}:`, err);
            throw new Error('Schema provisioning failed');
        }
    }



    async login(email: string, password: string, tenantSlug: string): Promise<any> {
        try {
            const db = getPostgres();

            // Get tenant
            const tenantQuery = 'SELECT id FROM public.tenants WHERE slug = $1 AND subscription_status IN ($2, $3)';
            const tenantResult = await db.query(tenantQuery, [tenantSlug, 'active', 'trial']);


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
