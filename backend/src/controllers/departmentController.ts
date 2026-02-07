import { Response } from 'express';
import { ExtendedRequest } from '@middleware/auth';
import { AppError } from '@middleware/errorHandler';
import DepartmentService from '@services/departmentService';
import { logger } from '@config/logger';

const departmentService = new DepartmentService();

export const listDepartments = async (req: ExtendedRequest, res: Response) => {
    try {
        const departments = await departmentService.listDepartments(
            req.tenantId!,
            (req as any).tenantSchemaName
        );

        res.json({
            success: true,
            data: departments,
        });
    } catch (err) {
        logger.error('List departments controller error:', err);
        throw new AppError(500, 'INTERNAL_ERROR', 'Failed to list departments', err);
    }
};

export const createDepartment = async (req: ExtendedRequest, res: Response) => {
    try {
        const { name, code, parent_department_id, budget } = req.body;

        if (!name) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Department name is required');
        }

        const department = await departmentService.createDepartment(
            req.tenantId!,
            (req as any).tenantSchemaName,
            { name, code, parent_department_id, budget }
        );

        res.status(201).json({
            success: true,
            data: department,
        });
    } catch (err) {
        logger.error('Create department controller error:', err);
        throw err;
    }
};

export const getDepartment = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const department = await departmentService.getDepartment(
            req.tenantId!,
            (req as any).tenantSchemaName,
            id
        );

        if (!department) {
            throw new AppError(404, 'NOT_FOUND', 'Department not found');
        }

        res.json({
            success: true,
            data: department,
        });
    } catch (err) {
        logger.error('Get department controller error:', err);
        throw err;
    }
};

export default {
    listDepartments,
    createDepartment,
    getDepartment,
};
