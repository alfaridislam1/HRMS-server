import { Response } from 'express';
import { ExtendedRequest } from '@middleware/auth';
import { AppError } from '@middleware/errorHandler';
import EmployeeService from '@services/employeeService';
import { logger } from '@config/logger';

const employeeService = new EmployeeService();

export const listEmployees = async (req: ExtendedRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const filters = {
            department_id: req.query.department_id,
            employment_status: req.query.employment_status,
            search: req.query.search,
        };

        const { employees, total } = await employeeService.listEmployees(
            req.tenantId!,
            page,
            limit,
            filters
        );

        res.json({
            success: true,
            data: employees,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        logger.error('List employees controller error:', err);
        throw new AppError(500, 'INTERNAL_ERROR', 'Failed to list employees', err);
    }
};

export const getEmployee = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const employee = await employeeService.getEmployee(req.tenantId!, id);
        if (!employee) {
            throw new AppError(404, 'NOT_FOUND', 'Employee not found');
        }

        res.json({
            success: true,
            data: employee,
        });
    } catch (err) {
        logger.error('Get employee controller error:', err);
        throw err;
    }
};

export const createEmployee = async (req: ExtendedRequest, res: Response) => {
    try {
        const { first_name, last_name, email_company, job_title, department_id, employment_type, start_date } =
            req.body;

        if (!first_name || !last_name || !email_company || !job_title || !department_id || !employment_type || !start_date) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Missing required fields');
        }

        // Generate employee ID
        const employee_id = `EMP${Date.now()}`;

        const employee = await employeeService.createEmployee(
            req.tenantId!,
            {
                employee_id,
                first_name,
                last_name,
                email_company,
                job_title,
                department_id,
                employment_type,
                start_date,
            },
            req.userId!
        );

        res.status(201).json({
            success: true,
            data: employee,
        });
    } catch (err) {
        logger.error('Create employee controller error:', err);
        throw err;
    }
};

export const updateEmployee = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const employee = await employeeService.updateEmployee(req.tenantId!, id, updateData, req.userId!);

        res.json({
            success: true,
            data: employee,
        });
    } catch (err) {
        logger.error('Update employee controller error:', err);
        throw err;
    }
};

export const deleteEmployee = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;

        await employeeService.deleteEmployee(req.tenantId!, id, req.userId!);

        res.status(204).send();
    } catch (err) {
        logger.error('Delete employee controller error:', err);
        throw err;
    }
};

export default {
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};
