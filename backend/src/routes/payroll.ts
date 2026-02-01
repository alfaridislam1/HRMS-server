import express from 'express';
import authMiddleware from '@middleware/auth';
import tenantMiddleware from '@middleware/tenant';
import rbacMiddleware from '@middleware/rbac';
import { asyncHandler } from '@middleware/errorHandler';
import payrollController from '@controllers/payrollController';

const router = express.Router();

// All routes require auth and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// List payroll periods (PAYROLL role)
router.get(
    '/periods',
    rbacMiddleware(['PAYROLL_MANAGER', 'HR_ADMIN']),
    asyncHandler(payrollController.listPayrollPeriods)
);

// Create payroll period (PAYROLL role)
router.post(
    '/periods',
    rbacMiddleware(['PAYROLL_MANAGER', 'HR_ADMIN']),
    asyncHandler(payrollController.createPayrollPeriod)
);

// Generate salary slips (PAYROLL role)
router.post(
    '/periods/:id/generate-slips',
    rbacMiddleware(['PAYROLL_MANAGER', 'HR_ADMIN']),
    asyncHandler(payrollController.generateSalarySlips)
);

// Get salary slips for period (PAYROLL role)
router.get(
    '/periods/:period_id/slips',
    rbacMiddleware(['PAYROLL_MANAGER', 'HR_ADMIN']),
    asyncHandler(payrollController.getSalarySlips)
);

// Get single salary slip
router.get(
    '/slips/:slip_id',
    asyncHandler(payrollController.getSalarySlip)
);

// Process payroll (PAYROLL role)
router.post(
    '/periods/:id/process',
    rbacMiddleware(['PAYROLL_MANAGER', 'HR_ADMIN']),
    asyncHandler(payrollController.processPayroll)
);

export default router;
