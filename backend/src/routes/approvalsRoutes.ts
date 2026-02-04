import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireRole } from '../middleware/rbac';
import { requireAuth } from '../middleware/jwtAuth';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/approvals
 * Get pending approvals for current user
 * Required role: hr, admin, manager
 */
router.get(
    '/',
    requireAuth(),
    requireRole('hr', 'admin', 'manager'),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { type, status = 'pending', page = 1, limit = 20 } = req.query;

        // TODO: Fetch approvals
        // let query = db('approvals')
        //   .where('tenant_id', tenantId)
        //   .where('approver_id', userId)
        //   .where('status', status);
        // if (type) {
        //   query = query.where('approval_type', type);
        // }
        // const approvals = await query.limit(Number(limit)).offset((Number(page) - 1) * Number(limit));

        const approvals = []; // Placeholder

        res.json({
            data: approvals,
            pagination: { page: Number(page), limit: Number(limit), total: 0 }
        });
    })
);

/**
 * GET /api/approvals/:id
 * Get approval details
 * Required role: hr, admin, manager
 */
router.get(
    '/:id',
    requireAuth(),
    requireRole('hr', 'admin', 'manager'),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { id } = req.params;

        // TODO: Fetch approval
        // const approval = await db('approvals')
        //   .where('tenant_id', tenantId)
        //   .where('id', id)
        //   .first();

        const approval = null; // Placeholder

        if (!approval) {
            throw new NotFoundError('Approval', id);
        }

        // Verify user is the approver
        if (approval.approver_id !== userId && (req as any).userRole !== 'admin') {
            throw new ForbiddenError('This approval is not assigned to you');
        }

        res.json({ data: approval });
    })
);

/**
 * POST /api/approvals/:id/action
 * Approve or reject an approval request
 * Required role: hr, admin, manager
 */
router.post(
    '/:id/action',
    requireAuth(),
    requireRole('hr', 'admin', 'manager'),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { id } = req.params;
        const { action, remarks } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            throw new Error('Invalid action');
        }

        // TODO: Get approval
        // const approval = await db('approvals')
        //   .where('tenant_id', tenantId)
        //   .where('id', id)
        //   .first();

        // TODO: Verify user is approver
        // if (approval.approver_id !== userId) {
        //   throw new ForbiddenError('You are not authorized to approve this');
        // }

        // TODO: Update approval
        // await db('approvals').where('id', id).update({
        //   status: action === 'approve' ? 'approved' : 'rejected',
        //   action_by: userId,
        //   action_at: new Date(),
        //   remarks
        // });

        // TODO: Based on approval type, take corresponding action
        // if (approval.approval_type === 'leave' && action === 'approve') {
        //   await db('leaves').where('id', approval.reference_id).update({
        //     status: 'approved',
        //     approved_by: userId
        //   });
        // } else if (approval.approval_type === 'payroll' && action === 'approve') {
        //   await db('payroll').where('id', approval.reference_id).update({
        //     status: 'approved',
        //     approved_by: userId
        //   });
        // }

        res.json({
            message: `Approval ${action}ed successfully`
        });
    })
);

/**
 * GET /api/approvals/pending/count
 * Get count of pending approvals for current user
 * Required role: hr, admin, manager
 */
router.get(
    '/pending/count',
    requireAuth(),
    requireRole('hr', 'admin', 'manager'),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;

        // TODO: Count pending approvals
        // const count = await db('approvals')
        //   .where('tenant_id', tenantId)
        //   .where('approver_id', userId)
        //   .where('status', 'pending')
        //   .count('*', { as: 'count' })
        //   .first();

        res.json({
            data: { pendingCount: 0 }
        });
    })
);

/**
 * GET /api/approvals/history
 * Get approval history (approved/rejected)
 * Required role: hr, admin, manager
 */
router.get(
    '/history',
    requireAuth(),
    requireRole('hr', 'admin', 'manager'),
    asyncHandler(async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { page = 1, limit = 20 } = req.query;

        // TODO: Fetch approval history
        // const history = await db('approvals')
        //   .where('tenant_id', tenantId)
        //   .where('action_by', userId)
        //   .where('status', 'in', ['approved', 'rejected'])
        //   .limit(Number(limit))
        //   .offset((Number(page) - 1) * Number(limit));

        const history = []; // Placeholder

        res.json({
            data: history,
            pagination: { page: Number(page), limit: Number(limit), total: 0 }
        });
    })
);

export default router;
