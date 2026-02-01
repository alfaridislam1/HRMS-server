import { Pool, QueryResult } from 'pg';
import { getPostgres } from '@config/postgres';
import { logger } from '@config/logger';
import { LeaveRequest } from '@types/index';
import { v4 as uuidv4 } from 'uuid';

export class LeaveService {
    private db: Pool;

    constructor() {
        this.db = getPostgres();
    }

    async listLeaveRequests(
        tenantId: string,
        userId: string,
        filters: any = {}
    ): Promise<LeaveRequest[]> {
        try {
            let query = 'SELECT * FROM leave_requests WHERE 1=1';
            const params: any[] = [];

            // If user is not HR_ADMIN, only show their own leaves
            if (!filters.showAll) {
                query += ` AND employee_id = (SELECT id FROM employees WHERE created_by = $${params.length + 1})`;
                params.push(userId);
            }

            if (filters.status) {
                query += ` AND status = $${params.length + 1}`;
                params.push(filters.status);
            }

            if (filters.from_date && filters.to_date) {
                query += ` AND start_date >= $${params.length + 1} AND end_date <= $${params.length + 2}`;
                params.push(filters.from_date, filters.to_date);
            }

            query += ' ORDER BY created_at DESC';

            const result: QueryResult<LeaveRequest> = await this.db.query(query, params);
            return result.rows;
        } catch (err) {
            logger.error('Failed to list leave requests:', err);
            throw err;
        }
    }

    async createLeaveRequest(
        tenantId: string,
        employeeId: string,
        data: Partial<LeaveRequest>,
        userId: string
    ): Promise<LeaveRequest> {
        try {
            const id = uuidv4();
            const { leave_type_id, start_date, end_date, reason } = data;

            const query = `
        INSERT INTO leave_requests (
          id, employee_id, leave_type_id, start_date, end_date, reason, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

            const result: QueryResult<LeaveRequest> = await this.db.query(query, [
                id,
                employeeId,
                leave_type_id,
                start_date,
                end_date,
                reason,
                'submitted',
            ]);

            logger.info(`Leave request created: ${id} for employee ${employeeId}`);
            return result.rows[0];
        } catch (err) {
            logger.error('Failed to create leave request:', err);
            throw err;
        }
    }

    async approveLeaveRequest(
        tenantId: string,
        leaveRequestId: string,
        approverId: string,
        comment?: string
    ): Promise<LeaveRequest> {
        try {
            const query = `
        UPDATE leave_requests
        SET status = 'approved', approved_by = $1, approval_comment = $2, approved_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

            const result: QueryResult<LeaveRequest> = await this.db.query(query, [
                approverId,
                comment,
                leaveRequestId,
            ]);

            if (result.rows.length === 0) {
                throw new Error('Leave request not found');
            }

            logger.info(`Leave request approved: ${leaveRequestId}`);
            return result.rows[0];
        } catch (err) {
            logger.error('Failed to approve leave request:', err);
            throw err;
        }
    }

    async rejectLeaveRequest(
        tenantId: string,
        leaveRequestId: string,
        reason: string
    ): Promise<LeaveRequest> {
        try {
            const query = `
        UPDATE leave_requests
        SET status = 'rejected', approval_comment = $1
        WHERE id = $2
        RETURNING *
      `;

            const result: QueryResult<LeaveRequest> = await this.db.query(query, [
                reason,
                leaveRequestId,
            ]);

            if (result.rows.length === 0) {
                throw new Error('Leave request not found');
            }

            logger.info(`Leave request rejected: ${leaveRequestId}`);
            return result.rows[0];
        } catch (err) {
            logger.error('Failed to reject leave request:', err);
            throw err;
        }
    }

    async getLeaveBalance(tenantId: string, employeeId: string): Promise<any> {
        try {
            const query = `
        SELECT 
          lt.id as leave_type_id,
          lt.name,
          lt.annual_entitlement,
          COUNT(lr.id) as used_days
        FROM leave_types lt
        LEFT JOIN leave_requests lr ON lt.id = lr.leave_type_id 
          AND lr.employee_id = $1
          AND lr.status = 'approved'
          AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM NOW())
        GROUP BY lt.id, lt.name, lt.annual_entitlement
      `;

            const result = await this.db.query(query, [employeeId]);
            return result.rows.map((row: any) => ({
                leaveTypeId: row.leave_type_id,
                leaveType: row.name,
                totalEntitlement: row.annual_entitlement,
                usedDays: row.used_days || 0,
                remainingDays: row.annual_entitlement - (row.used_days || 0),
            }));
        } catch (err) {
            logger.error('Failed to get leave balance:', err);
            throw err;
        }
    }
}

export default LeaveService;
