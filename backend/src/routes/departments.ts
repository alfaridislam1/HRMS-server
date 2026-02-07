import { Router } from 'express';
import { listDepartments, createDepartment, getDepartment } from '@controllers/departmentController';
import authMiddleware from '@middleware/auth';
import tenantMiddleware from '@middleware/tenant';
import rbacMiddleware from '@middleware/rbac';
import { asyncHandler } from '@middleware/errorHandler';

const router = Router();

// All department routes require auth and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/', asyncHandler(listDepartments));
router.post('/', rbacMiddleware(['HR_ADMIN']), asyncHandler(createDepartment));
router.get('/:id', asyncHandler(getDepartment));

export default router;
