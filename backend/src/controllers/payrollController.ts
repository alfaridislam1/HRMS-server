import { Response } from 'express';
import { ExtendedRequest } from '@middleware/auth';
import { AppError } from '@middleware/errorHandler';
import PayrollService from '@services/payrollService';
import { logger } from '@config/logger';

const payrollService = new PayrollService();

export const listPayrollPeriods = async (req: ExtendedRequest, res: Response) => {
    try {
        const periods = await payrollService.listPayrollPeriods(req.tenantId!);

        res.json({
            success: true,
            data: periods,
        });
    } catch (err) {
        logger.error('List payroll periods controller error:', err);
        throw new AppError(500, 'INTERNAL_ERROR', 'Failed to list payroll periods', err);
    }
};

export const createPayrollPeriod = async (req: ExtendedRequest, res: Response) => {
    try {
        const { period_name, start_date, end_date, salary_due_date } = req.body;

        if (!period_name || !start_date || !end_date || !salary_due_date) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Missing required fields');
        }

        const period = await payrollService.createPayrollPeriod(
            req.tenantId!,
            { period_name, start_date, end_date, salary_due_date },
            req.userId!
        );

        res.status(201).json({
            success: true,
            data: period,
        });
    } catch (err) {
        logger.error('Create payroll period controller error:', err);
        throw err;
    }
};

export const generateSalarySlips = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await payrollService.generateSalarySlips(req.tenantId!, id, req.userId!);

        res.status(202).json({
            success: true,
            data: {
                job_id: result.job_id,
                status: 'processing',
                message: 'Salary slips generation started',
            },
        });
    } catch (err) {
        logger.error('Generate salary slips controller error:', err);
        throw err;
    }
};

export const getSalarySlips = async (req: ExtendedRequest, res: Response) => {
    try {
        const { period_id } = req.params;

        const slips = await payrollService.getSalarySlips(req.tenantId!, period_id);

        res.json({
            success: true,
            data: slips,
        });
    } catch (err) {
        logger.error('Get salary slips controller error:', err);
        throw err;
    }
};

export const getSalarySlip = async (req: ExtendedRequest, res: Response) => {
    try {
        const { slip_id } = req.params;

        const slip = await payrollService.getSalarySlip(req.tenantId!, slip_id);
        if (!slip) {
            throw new AppError(404, 'NOT_FOUND', 'Salary slip not found');
        }

        res.json({
            success: true,
            data: slip,
        });
    } catch (err) {
        logger.error('Get salary slip controller error:', err);
        throw err;
    }
};

export const processPayroll = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await payrollService.processPayroll(req.tenantId!, id, req.userId!);

        res.status(202).json({
            success: true,
            data: {
                job_id: result.job_id,
                status: 'processing',
                message: 'Payroll processing initiated',
            },
        });
    } catch (err) {
        logger.error('Process payroll controller error:', err);
        throw err;
    }
};

export default {
    listPayrollPeriods,
    createPayrollPeriod,
    generateSalarySlips,
    getSalarySlips,
    getSalarySlip,
    processPayroll,
};
