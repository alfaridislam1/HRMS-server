import { Pool, QueryResult } from 'pg';
import { getPostgres } from '@config/postgres';
import { logger } from '@config/logger';
import { Department } from '@app-types/index';
import { v4 as uuidv4 } from 'uuid';

export class DepartmentService {
    private get db(): Pool {
        return getPostgres();
    }

    async listDepartments(tenantId: string, schemaName: string): Promise<Department[]> {
        try {
            const query = `SELECT * FROM "${schemaName}".departments ORDER BY name ASC`;
            const result: QueryResult<Department> = await this.db.query(query);
            return result.rows;
        } catch (err) {
            logger.error('Failed to list departments:', err);
            throw err;
        }
    }

    async createDepartment(
        tenantId: string,
        schemaName: string,
        data: Partial<Department>
    ): Promise<Department> {
        try {
            const id = uuidv4();
            const { name, code, parent_department_id, budget } = data;

            const query = `
        INSERT INTO "${schemaName}".departments (
          id, name, code, parent_department_id, budget
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

            const result: QueryResult<Department> = await this.db.query(query, [
                id,
                name,
                code,
                parent_department_id,
                budget,
            ]);

            return result.rows[0];
        } catch (err) {
            logger.error('Failed to create department:', err);
            throw err;
        }
    }

    async getDepartment(tenantId: string, schemaName: string, id: string): Promise<Department | null> {
        try {
            const query = `SELECT * FROM "${schemaName}".departments WHERE id = $1`;
            const result: QueryResult<Department> = await this.db.query(query, [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (err) {
            logger.error('Failed to get department:', err);
            throw err;
        }
    }
}

export default DepartmentService;
