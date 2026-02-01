import express from 'express';
import authMiddleware from '@middleware/auth';
import tenantMiddleware from '@middleware/tenant';
import rbacMiddleware from '@middleware/rbac';
import { asyncHandler } from '@middleware/errorHandler';
import leaveController from '@controllers/leaveController';

const router = express.Router();

// All routes require auth and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// List leave requests
router.get('/', asyncHandler(leaveController.listLeaveRequests));

// Create leave request (any authenticated user)
router.post('/', asyncHandler(leaveController.createLeaveRequest));

// Get leave balance
router.get('/balance/:employee_id', asyncHandler(leaveController.getLeaveBalance));

// Approve leave request (HR_ADMIN only)
router.patch(
    '/:id/approve',
    rbacMiddleware(['HR_ADMIN']),
    asyncHandler(leaveController.approveLeaveRequest)
);

// Reject leave request (HR_ADMIN only)
router.patch(
    '/:id/reject',
    rbacMiddleware(['HR_ADMIN']),
    asyncHandler(leaveController.rejectLeaveRequest)
);

export default router;
