import express, { Response } from 'express';
import authMiddleware, { ExtendedRequest } from '@middleware/auth';
import tenantMiddleware from '@middleware/tenant';
import rbacMiddleware from '@middleware/rbac';
import { asyncHandler } from '@middleware/errorHandler';
import employeeController from '@controllers/employeeController';

const router = express.Router();

// All routes require auth and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// List employees
router.get('/', asyncHandler(employeeController.listEmployees));

// Get single employee
router.get('/:id', asyncHandler(employeeController.getEmployee));

// Create employee (HR_ADMIN only)
router.post(
    '/',
    rbacMiddleware(['HR_ADMIN']),
    asyncHandler(employeeController.createEmployee)
);

// Update employee (HR_ADMIN only)
router.put(
    '/:id',
    rbacMiddleware(['HR_ADMIN']),
    asyncHandler(employeeController.updateEmployee)
);

// Delete employee (HR_ADMIN only)
router.delete(
    '/:id',
    rbacMiddleware(['HR_ADMIN']),
    asyncHandler(employeeController.deleteEmployee)
);

export default router;
