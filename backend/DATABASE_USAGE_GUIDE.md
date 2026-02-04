# HRMS Database - Usage Examples & Implementation Guide

Complete working examples for using the HRMS database system with multi-tenancy, caching, and backup functionality.

## Table of Contents

1. [Tenant Management](#tenant-management)
2. [Database Operations](#database-operations)
3. [Caching Examples](#caching-examples)
4. [Backup & Restore](#backup--restore)
5. [MongoDB Queries](#mongodb-queries)
6. [Migration Management](#migration-management)

---

## Tenant Management

### 1. Creating a New Tenant

```typescript
import { TenantManager } from './database/tenantManager';
import { Knex } from 'knex';

const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

const tenantManager = new TenantManager(knex);

async function setupNewTenant() {
  try {
    const { tenantId, schemaName } = await tenantManager.createTenant({
      name: 'ACME Corporation',
      slug: 'acme-corp',
      adminEmail: 'admin@acme.com',
      description: 'Manufacturing & Supply Chain',
      settings: {
        country: 'US',
        currency: 'USD',
        financialYear: 'april-march',
        timezone: 'America/New_York',
      },
    });

    console.log(`Tenant created: ${tenantId}`);
    console.log(`Schema: ${schemaName}`);

    // Now create admin user in tenant schema
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcrypt');

    await knex(schemaName)
      .table('users')
      .insert({
        id: uuidv4(),
        email: 'admin@acme.com',
        password_hash: await bcrypt.hash('temp_password_123', 10),
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        is_active: true,
      });

    console.log('Admin user created');
    return { tenantId, schemaName };
  } catch (error) {
    console.error('Failed to create tenant:', error);
    throw error;
  }
}

// Usage
setupNewTenant().then(({ tenantId, schemaName }) => {
  console.log(`✓ Tenant setup complete: ${tenantId}`);
});
```

### 2. Getting Tenant Information

```typescript
async function getTenantInfo(tenantId: string) {
  try {
    // Get tenant from public schema
    const tenant = await tenantManager.getTenant(tenantId);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    console.log('Tenant Info:');
    console.log(`  Name: ${tenant.name}`);
    console.log(`  Slug: ${tenant.slug}`);
    console.log(`  Schema: ${tenant.database_schema}`);
    console.log(`  Status: ${tenant.status}`);
    console.log(`  Created: ${tenant.created_at}`);

    // Get tenant-specific settings
    const tenantKnex = getKnexForTenant(tenant.database_schema);
    const settings = await tenantKnex('organization_settings').select('*');

    console.log('\nTenant Settings:');
    settings.forEach((s) => {
      console.log(`  ${s.key}: ${s.value}`);
    });

    return tenant;
  } catch (error) {
    console.error('Failed to get tenant info:', error);
  }
}

function getKnexForTenant(schemaName: string): Knex {
  return require('knex')({
    client: 'pg',
    connection: {
      ...require('url').parse(process.env.DATABASE_URL),
      search_path: `"${schemaName}", public`,
    },
  });
}
```

### 3. Feature Flag Management

```typescript
async function enableFeatures(tenantId: string) {
  // Enable payroll feature with configuration
  await tenantManager.setFeature(tenantId, 'payroll', true, {
    paymentMethod: 'bank_transfer',
    frequency: 'monthly',
    ctc: {
      baseSalary: 60,
      hra: 15,
      da: 20,
      allowances: 5,
    },
  });

  // Enable advanced appraisal with rollout
  await tenantManager.setFeature(tenantId, 'advanced_appraisal', true, {
    customTemplates: true,
    maxReviewers: 3,
    feedbackCycles: 2,
  });

  // Check if feature is enabled
  const payrollEnabled = await tenantManager.isFeatureEnabled(tenantId, 'payroll');
  console.log(`Payroll enabled: ${payrollEnabled}`);

  // Get feature config
  const config = await tenantManager.getFeatureConfig(tenantId, 'payroll');
  console.log('Payroll config:', config);
}
```

---

## Database Operations

### 1. Employee Management

```typescript
import { v4 as uuidv4 } from 'uuid';

async function createEmployee(tenantId: string, employeeData: any) {
  const tenantKnex = getTenantKnex(tenantId);

  try {
    // Get department
    const department = await tenantKnex('departments').where('code', 'ENG').first();
    const designation = await tenantKnex('designations').where('code', 'SE-L2').first();

    // Create user first
    const userId = uuidv4();
    await tenantKnex('users').insert({
      id: userId,
      email: employeeData.email,
      password_hash: await bcrypt.hash('temp_password', 10),
      first_name: employeeData.firstName,
      last_name: employeeData.lastName,
      role: 'employee',
      is_active: true,
    });

    // Create employee record
    const employeeId = uuidv4();
    const result = await tenantKnex('employees').insert({
      id: employeeId,
      user_id: userId,
      employee_code: `EMP-${Date.now()}`,
      email: employeeData.email,
      phone: employeeData.phone,
      date_of_birth: employeeData.dateOfBirth,
      gender: employeeData.gender,
      department_id: department.id,
      designation_id: designation.id,
      employment_type: 'full-time',
      date_of_joining: new Date(),
      status: 'active',
      pan: employeeData.pan,
      aadhaar: employeeData.aadhaar,
      bank_account: employeeData.bankAccount,
      ifsc_code: employeeData.ifscCode,
    });

    // Initialize leave balance
    const leaveTypes = await tenantKnex('leave_types').select('*');
    for (const leaveType of leaveTypes) {
      await tenantKnex('employee_leave_balance').insert({
        id: uuidv4(),
        employee_id: employeeId,
        leave_type_id: leaveType.id,
        year: new Date().getFullYear(),
        opening_balance: leaveType.max_days_per_year,
        leaves_taken: 0,
        closing_balance: leaveType.max_days_per_year,
      });
    }

    console.log(`✓ Employee created: ${employeeId}`);
    return { userId, employeeId };
  } catch (error) {
    console.error('Failed to create employee:', error);
    throw error;
  }
}

// Usage
createEmployee(tenantId, {
  email: 'john.doe@acme.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-0123',
  dateOfBirth: '1990-05-15',
  gender: 'M',
  pan: 'ABCDE1234F',
  aadhaar: '1234-5678-9012',
  bankAccount: '9876543210123456',
  ifscCode: 'SBIN0001234',
});
```

### 2. Leave Request & Approval

```typescript
async function requestLeave(
  tenantId: string,
  employeeId: string,
  leaveRequest: {
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
  }
) {
  const tenantKnex = getTenantKnex(tenantId);

  try {
    // Calculate days
    const daysDiff = Math.ceil(
      (leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const numberOfDays = daysDiff + 1;

    // Get employee and manager
    const employee = await tenantKnex('employees').where('id', employeeId).first();
    const manager = await tenantKnex('employees').where('id', employee.manager_id).first();

    // Get approval workflow
    const workflow = await tenantKnex('approval_workflows').where('entity_type', 'leave').first();

    // Create leave request
    const leaveId = uuidv4();
    await tenantKnex('leaves').insert({
      id: leaveId,
      employee_id: employeeId,
      leave_type_id: leaveRequest.leaveTypeId,
      start_date: leaveRequest.startDate,
      end_date: leaveRequest.endDate,
      number_of_days: numberOfDays,
      reason: leaveRequest.reason,
      status: 'pending',
    });

    // Create approval task
    await tenantKnex('approvals').insert({
      id: uuidv4(),
      workflow_id: workflow.id,
      entity_type: 'leave',
      entity_id: leaveId,
      current_step: 1,
      assigned_to: manager.user_id,
      status: 'pending',
    });

    // Log to audit
    await tenantKnex('audit_logs').insert({
      id: uuidv4(),
      user_id: employeeId,
      action: 'create',
      entity_type: 'leave',
      entity_id: leaveId,
      changes: JSON.stringify(leaveRequest),
    });

    console.log(`✓ Leave request created: ${leaveId}`);
    return leaveId;
  } catch (error) {
    console.error('Failed to request leave:', error);
    throw error;
  }
}

// Approve/Reject leave
async function approveLeave(
  tenantId: string,
  leaveId: string,
  approverId: string,
  approved: boolean,
  comments?: string
) {
  const tenantKnex = getTenantKnex(tenantId);

  const leave = await tenantKnex('leaves').where('id', leaveId).first();
  const status = approved ? 'approved' : 'rejected';

  await tenantKnex('leaves').where('id', leaveId).update({
    status,
    approved_by: approverId,
    approved_at: new Date(),
    approval_comments: comments,
  });

  // Update approval record
  await tenantKnex('approvals')
    .where('entity_id', leaveId)
    .update({
      status: approved ? 'approved' : 'rejected',
      actioned_at: new Date(),
      comments,
    });

  // Update leave balance if approved
  if (approved) {
    const balance = await tenantKnex('employee_leave_balance')
      .where('employee_id', leave.employee_id)
      .where('leave_type_id', leave.leave_type_id)
      .first();

    await tenantKnex('employee_leave_balance')
      .where('id', balance.id)
      .update({
        leaves_approved: tenantKnex.raw('leaves_approved + ?', [leave.number_of_days]),
        closing_balance: tenantKnex.raw('closing_balance - ?', [leave.number_of_days]),
      });
  }

  console.log(`✓ Leave ${status}: ${leaveId}`);
}

// Usage
requestLeave(tenantId, employeeId, {
  leaveTypeId: leaveTypeId,
  startDate: new Date('2024-02-05'),
  endDate: new Date('2024-02-09'),
  reason: 'Personal time off',
});
```

### 3. Payroll Processing

```typescript
async function processPayroll(tenantId: string, month: string) {
  const tenantKnex = getTenantKnex(tenantId);

  try {
    const [year, monthNum] = month.split('-').map(Number);

    // Get all active employees
    const employees = await tenantKnex('employees').where('status', 'active').select('*');

    for (const employee of employees) {
      // Get current salary
      const salary = await tenantKnex('employee_salaries')
        .where('employee_id', employee.id)
        .where('effective_from', '<=', new Date(`${year}-${monthNum}-01`))
        .orderBy('effective_from', 'desc')
        .first();

      if (!salary) continue;

      // Calculate attendance
      const daysWorked = calculateWorkingDays(year, monthNum);
      const daysAbsent = 0; // Should fetch from attendance system
      const daysLeave = await getApprovedLeaves(tenantId, employee.id, month);

      // Calculate payroll
      const grossSalary = salary.gross_salary;
      const basicSalary = salary.base_salary;
      const perDaySalary = basicSalary / daysWorked;
      const workedDays = daysWorked - daysAbsent - daysLeave;

      const deductions = salary.deductions;
      const totalDeductions = Object.values(deductions).reduce((a: any, b: any) => a + b, 0);

      const netSalary =
        perDaySalary * workedDays + parseFloat(salary.allowances.hra || 0) - totalDeductions;

      // Create payroll record
      const payrollId = uuidv4();
      await tenantKnex('payroll').insert({
        id: payrollId,
        employee_id: employee.id,
        month,
        days_worked: daysWorked,
        days_absent: daysAbsent,
        days_leave_taken: daysLeave,
        gross_salary: grossSalary,
        allowances: salary.allowances,
        deductions: salary.deductions,
        net_salary: netSalary,
        status: 'draft',
      });

      console.log(`✓ Payroll draft created for ${employee.employee_code}`);
    }

    // Create approval workflow for payroll
    const workflow = await tenantKnex('approval_workflows').where('entity_type', 'payroll').first();

    const draftPayrolls = await tenantKnex('payroll')
      .where('month', month)
      .where('status', 'draft');

    for (const payroll of draftPayrolls) {
      await tenantKnex('approvals').insert({
        id: uuidv4(),
        workflow_id: workflow.id,
        entity_type: 'payroll',
        entity_id: payroll.id,
        current_step: 1,
        assigned_to: process.env.PAYROLL_APPROVER_ID,
        status: 'pending',
      });
    }

    console.log(`✓ Payroll processing complete for ${month}`);
  } catch (error) {
    console.error('Failed to process payroll:', error);
    throw error;
  }
}

function calculateWorkingDays(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let workingDays = 0;

  for (let i = firstDay.getDate(); i <= lastDay.getDate(); i++) {
    const date = new Date(year, month - 1, i);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      // Exclude Sunday (0) and Saturday (6)
      workingDays++;
    }
  }

  return workingDays;
}
```

---

## Caching Examples

### 1. Organization Structure Caching

```typescript
import { CacheService } from './cache/CacheService';

const cacheService = CacheService.getInstance();
const orgCache = cacheService.getOrganizationCache();

async function getDepartmentsWithCache(tenantId: string) {
  // Try cache first
  let departments = await orgCache.getDepartments(tenantId);

  if (!departments) {
    // Cache miss - fetch from database
    const tenantKnex = getTenantKnex(tenantId);
    departments = await tenantKnex('departments')
      .select('*')
      .where('status', 'active')
      .orderBy('name');

    // Cache for 1 hour
    await orgCache.cacheDepartments(tenantId, departments, 3600);
    console.log('✓ Departments cached');
  } else {
    console.log('✓ Departments from cache');
  }

  return departments;
}

async function getDepartmentHierarchy(tenantId: string) {
  let hierarchy = await orgCache.getOrgHierarchy(tenantId);

  if (!hierarchy) {
    const tenantKnex = getTenantKnex(tenantId);

    // Build hierarchy
    const departments = await tenantKnex('departments').select('*');
    hierarchy = buildHierarchy(departments);

    await orgCache.cacheOrgHierarchy(tenantId, hierarchy, 3600);
  }

  return hierarchy;
}

// Invalidate when departments change
async function updateDepartment(tenantId: string, deptId: string, data: any) {
  const tenantKnex = getTenantKnex(tenantId);
  await tenantKnex('departments').where('id', deptId).update(data);

  // Invalidate cache
  await orgCache.invalidateDepartments(tenantId);
  await orgCache.invalidateOrgHierarchy(tenantId);

  console.log('✓ Department cache invalidated');
}
```

### 2. Permissions Caching

```typescript
const permCache = cacheService.getPermissionsCache();

async function checkUserPermission(tenantId: string, userId: string, permission: string) {
  // Check cache first
  const hasPermission = await permCache.hasPermission(tenantId, userId, permission);

  if (hasPermission !== null) {
    return hasPermission;
  }

  // Cache miss - compute permissions
  const permissions = await computeUserPermissions(tenantId, userId);

  // Cache for 30 minutes
  await permCache.cacheUserPermissions(tenantId, userId, permissions, 1800);

  return permissions.includes(permission);
}

async function computeUserPermissions(tenantId: string, userId: string): Promise<string[]> {
  const tenantKnex = getTenantKnex(tenantId);

  const user = await tenantKnex('users').where('id', userId).first();
  const rolePermissions = await tenantKnex('role_permissions').where('role', user.role);

  return rolePermissions.map((r) => r.permission);
}

// Invalidate on permission change
async function updateUserPermissions(tenantId: string, userId: string) {
  // ... update permissions in DB ...

  // Invalidate cache
  await permCache.invalidateUserPermissions(tenantId, userId);
  await permCache.invalidateResourceAccess(tenantId, userId);

  console.log('✓ User permissions cache invalidated');
}
```

### 3. Dashboard Caching

```typescript
const dashCache = cacheService.getDashboardCache();

async function getExecutiveDashboard(tenantId: string) {
  // Try cache first
  let metrics = await dashCache.getExecutiveDashboard(tenantId);

  if (!metrics) {
    // Compute metrics
    const tenantKnex = getTenantKnex(tenantId);

    const totalEmployees = await tenantKnex('employees').count('id as count').first();
    const activeEmployees = await tenantKnex('employees')
      .where('status', 'active')
      .count('id as count')
      .first();
    const onLeaveCount = await tenantKnex('employees')
      .where('status', 'on_leave')
      .count('id as count')
      .first();

    // More metrics...

    metrics = {
      totalEmployees: totalEmployees.count,
      activeEmployees: activeEmployees.count,
      onLeaveCount: onLeaveCount.count,
      newJoinersThisMonth: 5,
      departmentDistribution: { Engineering: 45, Sales: 30, HR: 15 },
      leavesApprovedThisMonth: 12,
      leavesPendingApproval: 3,
      payrollStatus: { processed: 1, pending: 1, failed: 0 },
      appraisalsInProgress: 8,
      appraisalsCompleted: 42,
      lastUpdated: new Date(),
    };

    // Cache for 15 minutes
    await dashCache.cacheExecutiveDashboard(tenantId, metrics, 900);
  }

  return metrics;
}

// Refresh specific dashboard metrics
async function refreshPayrollMetrics(tenantId: string) {
  // Invalidate related caches
  await dashCache.invalidatePayrollStats(tenantId);
  await dashCache.invalidateExecutiveDashboard(tenantId);

  console.log('✓ Payroll metrics cache cleared');
}
```

---

## Backup & Restore

### 1. Creating Backups

```typescript
import { DatabaseBackupManager } from './backup/DatabaseBackupManager';

const backupManager = new DatabaseBackupManager({
  dbName: 'hrms',
  dbUser: 'postgres',
  dbHost: process.env.DATABASE_HOST,
  dbPort: 5432,
  s3Bucket: 'hrms-backups',
  s3Region: 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  retentionDays: 30,
});

// Full database backup
async function createFullBackup() {
  try {
    const { filename, s3Key } = await backupManager.createFullBackup();
    console.log(`✓ Backup created: ${filename}`);
    console.log(`   S3 location: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

// Tenant-specific backup
async function backupTenant(tenantId: string) {
  const tenant = await tenantManager.getTenant(tenantId);
  const schemaName = tenant.database_schema;

  try {
    const { filename, s3Key } = await backupManager.createSchemaBackup(schemaName);
    console.log(`✓ Tenant backup created: ${filename}`);
    return s3Key;
  } catch (error) {
    console.error('Tenant backup failed:', error);
  }
}

// Scheduled daily backup
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled backup...');
  await createFullBackup();

  // Cleanup old backups
  await backupManager.cleanupOldBackups();
  console.log('✓ Old backups cleaned up');
});
```

### 2. Restoring Data

```typescript
import { DatabaseRestoreManager } from './backup/DatabaseRestoreManager';

const restoreManager = new DatabaseRestoreManager({
  dbName: 'hrms',
  dbUser: 'postgres',
  dbHost: process.env.DATABASE_HOST,
  dbPort: 5432,
  s3Bucket: 'hrms-backups',
  s3Region: 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Restore full database
async function restoreFullDatabase(backupKey: string) {
  try {
    console.log('Starting restore...');
    await restoreManager.restoreFullDatabase(backupKey);
    console.log('✓ Database restored successfully');
  } catch (error) {
    console.error('Restore failed:', error);
  }
}

// Restore specific tenant
async function restoreTenant(tenantId: string, backupKey: string) {
  const tenant = await tenantManager.getTenant(tenantId);

  try {
    await restoreManager.restoreSchema(backupKey, tenant.database_schema);
    console.log(`✓ Tenant ${tenantId} restored`);
  } catch (error) {
    console.error('Tenant restore failed:', error);
  }
}

// Validate backup before restore
async function validateAndRestore(backupKey: string) {
  const isValid = await restoreManager.validateBackup(backupKey);

  if (!isValid) {
    throw new Error('Backup validation failed');
  }

  await restoreFullDatabase(backupKey);
}
```

---

## MongoDB Queries

### 1. Appraisal Form Operations

```typescript
import { AppraisalForm } from './models/mongo/AppraisalForm';

async function createAppraisalForm(tenantId: string, employeeId: string, appraiserId: string) {
  const form = new AppraisalForm({
    tenantId,
    employeeId,
    appraiserId,
    appraisalPeriod: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    },
    template: {
      templateId: 'template-123',
      templateName: 'Annual Performance Review 2024',
      version: 1,
    },
    responses: [
      {
        questionId: 'q1',
        answer: 4,
        comments: 'Excellent performance',
      },
      {
        questionId: 'q2',
        answer: 'Technical skills: Strong, Communication: Good',
      },
    ],
    status: 'draft',
    comments: [],
  });

  await form.save();
  console.log(`✓ Appraisal form created: ${form._id}`);
  return form;
}

// Submit appraisal
async function submitAppraisal(formId: string, approverId: string) {
  const form = await AppraisalForm.findByIdAndUpdate(
    formId,
    {
      status: 'submitted',
      submittedAt: new Date(),
    },
    { new: true }
  );

  return form;
}

// Get appraisals for employee
async function getEmployeeAppraisals(tenantId: string, employeeId: string) {
  const appraisals = await AppraisalForm.find({
    tenantId,
    employeeId,
  })
    .sort({ createdAt: -1 })
    .lean();

  return appraisals;
}

// Get pending appraisals for approver
async function getPendingAppraisalsForApprover(tenantId: string, approverId: string) {
  const appraisals = await AppraisalForm.find({
    tenantId,
    status: 'submitted',
  })
    .select('employeeId appraisalPeriod template submittedAt')
    .limit(20)
    .lean();

  return appraisals;
}

// Add comment to appraisal
async function addAppraisalComment(formId: string, userId: string, comment: string) {
  const form = await AppraisalForm.findByIdAndUpdate(
    formId,
    {
      $push: {
        comments: {
          userId,
          text: comment,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  );

  return form;
}
```

### 2. Document Management

```typescript
import { DocumentMetadata } from './models/mongo/DocumentMetadata';

async function uploadDocumentMetadata(
  tenantId: string,
  employeeId: string,
  document: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    documentType: string;
    s3Key: string;
  },
  uploadedBy: string
) {
  const doc = new DocumentMetadata({
    tenantId,
    employeeId,
    documentType: document.documentType,
    fileName: document.fileName,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    s3Key: document.s3Key,
    s3Url: `https://s3.amazonaws.com/hrms-documents/${document.s3Key}`,
    uploadedBy,
    uploadedAt: new Date(),
    status: 'active',
    verificationStatus: 'pending',
    tags: [document.documentType, tenantId],
    accessLog: [{ userId: uploadedBy, timestamp: new Date() }],
    retentionPolicy: {
      deleteAfter: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
      requiresApprovalForDeletion: true,
    },
    metadata: {},
  });

  await doc.save();
  console.log(`✓ Document metadata saved: ${doc._id}`);
  return doc;
}

// Verify document
async function verifyDocument(docId: string, verifiedBy: string) {
  const doc = await DocumentMetadata.findByIdAndUpdate(
    docId,
    {
      verificationStatus: 'verified',
      verifiedBy,
      verifiedAt: new Date(),
    },
    { new: true }
  );

  return doc;
}

// Get employee documents
async function getEmployeeDocuments(tenantId: string, employeeId: string) {
  const documents = await DocumentMetadata.find({
    tenantId,
    employeeId,
    status: { $in: ['active', 'verified'] },
  })
    .select('-accessLog')
    .sort({ uploadedAt: -1 })
    .lean();

  return documents;
}

// Log document access
async function logDocumentAccess(docId: string, userId: string) {
  await DocumentMetadata.findByIdAndUpdate(docId, {
    lastAccessedAt: new Date(),
    $push: {
      accessLog: {
        userId,
        timestamp: new Date(),
      },
    },
  });
}

// Archive old documents
async function archiveOldDocuments(tenantId: string, beforeDate: Date) {
  const result = await DocumentMetadata.updateMany(
    {
      tenantId,
      uploadedAt: { $lt: beforeDate },
      status: 'active',
    },
    {
      status: 'archived',
    }
  );

  console.log(`✓ Archived ${result.modifiedCount} documents`);
  return result;
}
```

### 3. Settings Management

```typescript
import { TenantSettings, FeatureFlag, SettingsAudit } from './models/mongo/TenantSettings';

// Get all payroll settings
async function getPayrollSettings(tenantId: string) {
  const settings = await TenantSettings.findOne({
    tenantId,
    category: 'payroll',
    isActive: true,
  }).lean();

  return settings?.settings || {};
}

// Update settings with audit
async function updateSettings(
  tenantId: string,
  category: string,
  newSettings: Record<string, any>,
  changedBy: string,
  reason?: string
) {
  // Get current settings
  const current = await TenantSettings.findOne({
    tenantId,
    category,
    isActive: true,
  });

  const before = current?.settings || {};

  // Create new version
  const version = (current?.version || 0) + 1;

  const updated = await TenantSettings.findByIdAndUpdate(current?._id, {
    isActive: false,
  });

  // Insert new version
  const newDoc = new TenantSettings({
    tenantId,
    category,
    settings: newSettings,
    version,
    isActive: true,
  });

  await newDoc.save();

  // Audit log
  const audit = new SettingsAudit({
    tenantId,
    category,
    action: 'update',
    changes: {
      before,
      after: newSettings,
    },
    changedBy,
    reason,
  });

  await audit.save();

  console.log(`✓ Settings updated (v${version})`);
  return newDoc;
}

// Feature flag management
async function setFeatureFlag(
  tenantId: string,
  featureName: string,
  enabled: boolean,
  rolloutPercentage = 100,
  config = {}
) {
  const flag = await FeatureFlag.findOneAndUpdate(
    { tenantId, featureName },
    {
      enabled,
      rolloutPercentage,
      config,
      validFrom: new Date(),
    },
    { upsert: true, new: true }
  );

  console.log(`✓ Feature flag updated: ${featureName}`);
  return flag;
}

// Check if user should see feature (with rollout)
async function shouldUserSeeFeature(tenantId: string, featureName: string, userId: string) {
  const flag = await FeatureFlag.findOne({
    tenantId,
    featureName,
  }).lean();

  if (!flag || !flag.enabled) return false;

  // Calculate if user is in rollout percentage
  const userHash = parseInt(userId.substring(0, 8), 16);
  const rolloutHash = userHash % 100;

  return rolloutHash < flag.rolloutPercentage;
}
```

---

## Migration Management

### 1. Running Migrations

```typescript
import { MigrationRunner } from './database/MigrationRunner';

const migrationRunner = new MigrationRunner(knex, {
  directory: './src/database/migrations',
  extension: 'ts',
});

// Run latest migrations
async function runMigrations() {
  try {
    await migrationRunner.up();
    console.log('✓ Migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Check migration status
async function checkMigrationStatus() {
  await migrationRunner.status();
}

// Rollback migrations
async function rollbackMigrations(steps = 1) {
  try {
    await migrationRunner.down(steps);
    console.log(`✓ Rolled back ${steps} migration(s)`);
  } catch (error) {
    console.error('Rollback failed:', error);
  }
}

// Create new migration
async function createNewMigration(name: string) {
  const path = await migrationRunner.createMigration(name);
  console.log(`Created migration: ${path}`);
}
```

### 2. Tenant-Specific Migrations

```typescript
async function initializeTenantSchema(tenantId: string) {
  const tenant = await tenantManager.getTenant(tenantId);
  const schemaName = tenant.database_schema;

  const tenantKnex = getKnexForTenant(schemaName);
  const tenantMigrationRunner = new MigrationRunner(tenantKnex);

  // Run migrations for this tenant
  await tenantMigrationRunner.runTenantMigrations(schemaName);

  // Initialize default data
  await initializeDefaultLeaveTypes(tenantKnex);
  await initializeDefaultDesignations(tenantKnex);
  await initializeDefaultDepartments(tenantKnex);

  console.log(`✓ Tenant schema initialized: ${schemaName}`);
}

async function initializeDefaultLeaveTypes(tenantKnex: any) {
  const defaultLeaves = [
    {
      name: 'Annual Leave',
      code: 'AL',
      max_days_per_year: 20,
      is_paid: true,
      requires_approval: true,
    },
    {
      name: 'Sick Leave',
      code: 'SL',
      max_days_per_year: 10,
      is_paid: true,
      requires_approval: true,
    },
    {
      name: 'Casual Leave',
      code: 'CL',
      max_days_per_year: 5,
      is_paid: true,
      requires_approval: false,
    },
  ];

  for (const leave of defaultLeaves) {
    await tenantKnex('leave_types').insert({
      id: uuidv4(),
      ...leave,
      status: 'active',
    });
  }
}
```

---

This guide provides production-ready examples for all major operations. Adapt the code to your specific needs and error handling requirements.
