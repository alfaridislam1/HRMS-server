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
            (req as any).tenantSchemaName,
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

        const employee = await employeeService.getEmployee(req.tenantId!, (req as any).tenantSchemaName, id);
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

        // Validate required fields (department_id is optional)
        if (!first_name || !last_name || !email_company || !employment_type || !start_date) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Missing required fields: first_name, last_name, email_company, employment_type, start_date');
        }

        // Validate department_id if provided (must be valid UUID or null)
        let validatedDepartmentId = null;
        if (department_id) {
            // Check if it's a valid UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(department_id)) {
                throw new AppError(400, 'VALIDATION_ERROR', 'department_id must be a valid UUID or null/omitted');
            }
            validatedDepartmentId = department_id;
        }

        // Generate employee ID
        const employee_id = `EMP${Date.now()}`;

        const employee = await employeeService.createEmployee(
            req.tenantId!,
            (req as any).tenantSchemaName,
            {
                employee_id,
                first_name,
                last_name,
                email_company,
                job_title,
                department_id: validatedDepartmentId,
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

        const employee = await employeeService.updateEmployee(req.tenantId!, (req as any).tenantSchemaName, id, updateData, req.userId!);

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

        await employeeService.deleteEmployee(req.tenantId!, (req as any).tenantSchemaName, id, req.userId!);

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
