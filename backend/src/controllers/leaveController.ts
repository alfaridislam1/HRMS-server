import { Response } from 'express';
import { ExtendedRequest } from '@middleware/auth';
import { AppError } from '@middleware/errorHandler';
import LeaveService from '@services/leaveService';
import { logger } from '@config/logger';

const leaveService = new LeaveService();

export const listLeaveRequests = async (req: ExtendedRequest, res: Response) => {
    try {
        const filters = {
            status: req.query.status,
            from_date: req.query.from_date,
            to_date: req.query.to_date,
            showAll: req.roles?.includes('HR_ADMIN'),
        };

        const leaves = await leaveService.listLeaveRequests(req.tenantId!, req.userId!, filters);

        res.json({
            success: true,
            data: leaves,
        });
    } catch (err) {
        logger.error('List leaves controller error:', err);
        throw new AppError(500, 'INTERNAL_ERROR', 'Failed to list leaves', err);
    }
};

export const createLeaveRequest = async (req: ExtendedRequest, res: Response) => {
    try {
        const { leave_type_id, start_date, end_date, reason, employee_id } = req.body;

        if (!leave_type_id || !start_date || !end_date) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Missing required fields');
        }

        // If not HR_ADMIN, can only create for themselves
        const targetEmployeeId = employee_id || req.userId;
        if (!req.roles?.includes('HR_ADMIN') && employee_id && employee_id !== req.userId) {
            throw new AppError(403, 'FORBIDDEN', 'Cannot create leave request for another employee');
        }

        const leave = await leaveService.createLeaveRequest(
            req.tenantId!,
            targetEmployeeId,
            { leave_type_id, start_date, end_date, reason },
            req.userId!
        );

        res.status(201).json({
            success: true,
            data: leave,
        });
    } catch (err) {
        logger.error('Create leave controller error:', err);
        throw err;
    }
};

export const approveLeaveRequest = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        const leave = await leaveService.approveLeaveRequest(req.tenantId!, id, req.userId!, comment);

        res.json({
            success: true,
            data: leave,
        });
    } catch (err) {
        logger.error('Approve leave controller error:', err);
        throw err;
    }
};

export const rejectLeaveRequest = async (req: ExtendedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Rejection reason required');
        }

        const leave = await leaveService.rejectLeaveRequest(req.tenantId!, id, reason);

        res.json({
            success: true,
            data: leave,
        });
    } catch (err) {
        logger.error('Reject leave controller error:', err);
        throw err;
    }
};

export const getLeaveBalance = async (req: ExtendedRequest, res: Response) => {
    try {
        const { employee_id } = req.params;

        const balance = await leaveService.getLeaveBalance(req.tenantId!, employee_id);

        res.json({
            success: true,
            data: balance,
        });
    } catch (err) {
        logger.error('Get leave balance controller error:', err);
        throw err;
    }
};

export default {
    listLeaveRequests,
    createLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    getLeaveBalance,
};
