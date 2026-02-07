import { Pool, QueryResult } from 'pg';
import { getPostgres } from '@config/postgres';
import { logger } from '@config/logger';
import { PayrollPeriod, SalarySlip } from '@app-types/index';
import { v4 as uuidv4 } from 'uuid';

export class PayrollService {
    private get db(): Pool {
        return getPostgres();
    }

    async createPayrollPeriod(
        tenantId: string,
        data: Partial<PayrollPeriod>,
        userId: string
    ): Promise<PayrollPeriod> {
        try {
            const id = uuidv4();
            const { period_name, start_date, end_date, salary_due_date } = data;

            const query = `
        INSERT INTO payroll_periods (
          id, period_name, start_date, end_date, salary_due_date, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'draft', NOW())
        RETURNING *
      `;

            const result: QueryResult<PayrollPeriod> = await this.db.query(query, [
                id,
                period_name,
                start_date,
                end_date,
                salary_due_date,
            ]);

            logger.info(`Payroll period created: ${id}`);
            return result.rows[0];
        } catch (err) {
            logger.error('Failed to create payroll period:', err);
            throw err;
        }
    }

    async listPayrollPeriods(tenantId: string): Promise<PayrollPeriod[]> {
        try {
            const query = 'SELECT * FROM payroll_periods ORDER BY start_date DESC';
            const result: QueryResult<PayrollPeriod> = await this.db.query(query);
            return result.rows;
        } catch (err) {
            logger.error('Failed to list payroll periods:', err);
            throw err;
        }
    }

    async generateSalarySlips(
        tenantId: string,
        payrollPeriodId: string,
        userId: string
    ): Promise<{ job_id: string }> {
        try {
            // This would typically be an async job
            const jobId = uuidv4();
            logger.info(`Salary slip generation queued: ${jobId}`);
            return { job_id: jobId };
        } catch (err) {
            logger.error('Failed to generate salary slips:', err);
            throw err;
        }
    }

    async getSalarySlips(tenantId: string, payrollPeriodId: string): Promise<SalarySlip[]> {
        try {
            const query = `
        SELECT ss.* FROM salary_slips ss
        WHERE payroll_period_id = $1
        ORDER BY created_at DESC
      `;

            const result: QueryResult<SalarySlip> = await this.db.query(query, [payrollPeriodId]);
            return result.rows;
        } catch (err) {
            logger.error('Failed to get salary slips:', err);
            throw err;
        }
    }

    async getSalarySlip(tenantId: string, salarySlipId: string): Promise<SalarySlip | null> {
        try {
            const query = 'SELECT * FROM salary_slips WHERE id = $1';
            const result: QueryResult<SalarySlip> = await this.db.query(query, [salarySlipId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (err) {
            logger.error('Failed to get salary slip:', err);
            throw err;
        }
    }

    async processPayroll(
        tenantId: string,
        payrollPeriodId: string,
        userId: string
    ): Promise<{ job_id: string }> {
        try {
            // Mark payroll as processing
            const jobId = uuidv4();
            await this.db.query('UPDATE payroll_periods SET status = $1 WHERE id = $2', [
                'processed',
                payrollPeriodId,
            ]);

            logger.info(`Payroll processing started: ${jobId}`);
            return { job_id: jobId };
        } catch (err) {
            logger.error('Failed to process payroll:', err);
            throw err;
        }
    }

    async calculateSalaryBreakdown(
        tenantId: string,
        employeeId: string,
        payrollPeriodId: string
    ): Promise<any> {
        try {
            // Fetch employee base salary
            const empQuery = 'SELECT salary FROM employees WHERE id = $1';
            const empResult = await this.db.query(empQuery, [employeeId]);

            if (empResult.rows.length === 0) {
                throw new Error('Employee not found');
            }

            const baseSalary = empResult.rows[0].salary || 0;
            const allowances = 0; // Can be enhanced with actual allowance logic
            const deductions = 0; // Can be enhanced with tax/insurance logic

            return {
                baseSalary,
                allowances,
                deductions,
                netSalary: baseSalary + allowances - deductions,
            };
        } catch (err) {
            logger.error('Failed to calculate salary breakdown:', err);
            throw err;
        }
    }
}

export default PayrollService;
