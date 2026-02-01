import { Pool, QueryResult } from 'pg';
import { getPostgres } from '@config/postgres';
import { getRedis } from '@config/redis';
import { logger } from '@config/logger';
import { Employee } from '@types/index';
import { v4 as uuidv4 } from 'uuid';

export class EmployeeService {
    private db: Pool;

    constructor() {
        this.db = getPostgres();
    }

    async listEmployees(
        tenantId: string,
        page: number = 1,
        limit: number = 20,
        filters: any = {}
    ): Promise<{ employees: Employee[]; total: number }> {
        try {
            const offset = (page - 1) * limit;
            let query = 'SELECT * FROM employees WHERE deleted_at IS NULL';
            const params: any[] = [];

            if (filters.department_id) {
                query += ` AND department_id = $${params.length + 1}`;
                params.push(filters.department_id);
            }

            if (filters.employment_status) {
                query += ` AND employment_status = $${params.length + 1}`;
                params.push(filters.employment_status);
            }

            if (filters.search) {
                query += ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1})`;
                params.push(`%${filters.search}%`, `%${filters.search}%`);
            }

            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const result: QueryResult<Employee> = await this.db.query(query, params);

            const countQuery = 'SELECT COUNT(*) FROM employees WHERE deleted_at IS NULL';
            const countResult = await this.db.query(countQuery);
            const total = parseInt(countResult.rows[0].count, 10);

            return {
                employees: result.rows,
                total,
            };
        } catch (err) {
            logger.error('Failed to list employees:', err);
            throw err;
        }
    }

    async getEmployee(tenantId: string, employeeId: string): Promise<Employee | null> {
        try {
            const redis = getRedis();
            const cacheKey = `employee:${tenantId}:${employeeId}`;

            // Try cache first
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const result: QueryResult<Employee> = await this.db.query(
                'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
                [employeeId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const employee = result.rows[0];

            // Cache for 1 hour
            await redis.setex(cacheKey, 3600, JSON.stringify(employee));

            return employee;
        } catch (err) {
            logger.error('Failed to get employee:', err);
            throw err;
        }
    }

    async createEmployee(
        tenantId: string,
        data: Partial<Employee>,
        userId: string
    ): Promise<Employee> {
        try {
            const id = uuidv4();
            const {
                employee_id,
                first_name,
                last_name,
                email_company,
                job_title,
                department_id,
                employment_type,
                start_date,
            } = data;

            const query = `
        INSERT INTO employees (
          id, employee_id, first_name, last_name, email_company, job_title,
          department_id, employment_type, employment_status, start_date, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        RETURNING *
      `;

            const result: QueryResult<Employee> = await this.db.query(query, [
                id,
                employee_id,
                first_name,
                last_name,
                email_company,
                job_title,
                department_id,
                employment_type,
                'active',
                start_date,
                userId,
            ]);

            const employee = result.rows[0];

            // Invalidate cache
            const redis = getRedis();
            await redis.del(`employees:${tenantId}:list`);

            logger.info(`Employee created: ${employee.id} in tenant ${tenantId}`);
            return employee;
        } catch (err) {
            logger.error('Failed to create employee:', err);
            throw err;
        }
    }

    async updateEmployee(
        tenantId: string,
        employeeId: string,
        data: Partial<Employee>,
        userId: string
    ): Promise<Employee> {
        try {
            const allowedFields = [
                'first_name',
                'last_name',
                'job_title',
                'department_id',
                'employment_status',
            ];
            const updateFields = Object.keys(data)
                .filter((key) => allowedFields.includes(key))
                .map((key, index) => `${key} = $${index + 1}`)
                .join(', ');

            if (!updateFields) {
                throw new Error('No valid fields to update');
            }

            const updateValues = Object.keys(data)
                .filter((key) => allowedFields.includes(key))
                .map((key) => (data as any)[key]);

            const query = `
        UPDATE employees
        SET ${updateFields}, updated_by = $${updateValues.length + 1}, updated_at = NOW()
        WHERE id = $${updateValues.length + 2} AND deleted_at IS NULL
        RETURNING *
      `;

            const result: QueryResult<Employee> = await this.db.query(query, [
                ...updateValues,
                userId,
                employeeId,
            ]);

            if (result.rows.length === 0) {
                throw new Error('Employee not found');
            }

            const employee = result.rows[0];

            // Invalidate cache
            const redis = getRedis();
            await redis.del(`employee:${tenantId}:${employeeId}`);

            logger.info(`Employee updated: ${employeeId} in tenant ${tenantId}`);
            return employee;
        } catch (err) {
            logger.error('Failed to update employee:', err);
            throw err;
        }
    }

    async deleteEmployee(tenantId: string, employeeId: string, userId: string): Promise<void> {
        try {
            const query = `
        UPDATE employees
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2 AND deleted_at IS NULL
      `;

            const result = await this.db.query(query, [userId, employeeId]);

            if (result.rowCount === 0) {
                throw new Error('Employee not found');
            }

            // Invalidate cache
            const redis = getRedis();
            await redis.del(`employee:${tenantId}:${employeeId}`);

            logger.info(`Employee deleted: ${employeeId} in tenant ${tenantId}`);
        } catch (err) {
            logger.error('Failed to delete employee:', err);
            throw err;
        }
    }
}

export default EmployeeService;
