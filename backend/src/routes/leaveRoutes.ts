import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateInput, ValidationSchemas, sanitizeRequestData } from '../middleware/validator';
import { requireRole, requireTenantAccess } from '../middleware/rbac';
import { requireAuth } from '../middleware/jwtAuth';
import { NotFoundError, DuplicateError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/leaves
 * Get all leaves
 * Required role: hr, admin, manager, employee
 */
router.get('/', requireAuth(), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const { page = 1, limit = 20, status, employeeId } = req.query;

    // Employees can only see their own leaves
    const filterEmployeeId = userRole === 'employee' ? userId : (employeeId as string);

    // TODO: Fetch leaves from database
    // let query = db('leaves').where('tenant_id', tenantId);
    // if (filterEmployeeId) {
    //   query = query.where('employee_id', filterEmployeeId);
    // }
    // if (status) {
    //   query = query.where('status', status);
    // }
    // const leaves = await query.limit(Number(limit)).offset((Number(page) - 1) * Number(limit));

    const leaves = []; // Placeholder

    res.json({
        data: leaves,
        pagination: { page: Number(page), limit: Number(limit), total: 0 }
    });
}));

/**
 * POST /api/leaves
 * Request new leave
 * Required role: employee, hr, admin
 */
router.post(
    '/',
    requireAuth(),
    requireRole('employee', 'hr', 'admin'),
    sanitizeRequestData(),
    validateInput(ValidationSchemas.requestLeave, 'body'),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { leaveTypeId, startDate, endDate, reason } = req.body;

        // TODO: Create leave request
        // const [leaveId] = await db('leaves').insert({
        //   tenant_id: tenantId,
        //   employee_id: userId,
        //   leave_type_id: leaveTypeId,
        //   start_date: startDate,
        //   end_date: endDate,
        //   reason,
        //   status: 'pending',
        //   created_at: new Date()
        // });

        const leaveId = 'placeholder-id'; // Placeholder

        res.status(201).json({
            data: { id: leaveId },
            message: 'Leave request submitted successfully'
        });
    })
);

/**
 * POST /api/leaves/:id/approve
 * Approve leave request
 * Required role: hr, admin, manager
 */
router.post(
    '/:id/approve',
    requireAuth(),
    requireRole('hr', 'admin', 'manager'),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const { status, remarks } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            throw new Error('Invalid status');
        }

        // TODO: Update leave status
        // await db('leaves')
        //   .where('tenant_id', tenantId)
        //   .where('id', id)
        //   .update({
        //     status,
        //     remarks,
        //     approved_by: (req as any).userId,
        //     approved_at: new Date()
        //   });

        res.json({
            message: `Leave ${status} successfully`
        });
    })
);

/**
 * GET /api/leave-balance/:employeeId
 * Get leave balance for employee
 * Required role: hr, admin, manager, self
 */
router.get(
    '/balance/:employeeId',
    requireAuth(),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const userRole = (req as any).userRole;
        const { employeeId } = req.params;

        // Employees can only see their own balance
        if (userRole === 'employee' && employeeId !== userId) {
            throw new ForbiddenError('You can only view your own leave balance');
        }

        // TODO: Fetch leave balance
        // const balance = await db('leave_balances')
        //   .where('tenant_id', tenantId)
        //   .where('employee_id', employeeId)
        //   .select();

        const balance = {}; // Placeholder

        res.json({ data: balance });
    })
);

export default router;
