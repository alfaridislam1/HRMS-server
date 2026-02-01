# HRMS SaaS - Low Level Design (LLD)

**Project:** Monolithic HRMS SaaS Platform  
**Date:** February 2, 2026  
**Version:** 1.0

---

## 1. Database Schema Design

### 1.1 Public Schema (Shared across all tenants)

```sql
-- Tenants (multi-tenancy metadata)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- Used for subdomain: slug.hrms.com
  schema_name VARCHAR(100) UNIQUE NOT NULL, -- e.g., tenant_001
  subscription_plan ENUM ('starter', 'professional', 'enterprise'),
  subscription_status ENUM ('active', 'trial', 'suspended', 'cancelled'),
  trial_ends_at TIMESTAMP,
  billing_email VARCHAR(255),
  country_code VARCHAR(2), -- OM, AE, KW, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES public.tenant_admins(id) ON DELETE SET NULL
);

-- Tenant Admins (cross-tenant, can manage multiple organizations)
CREATE TABLE public.tenant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  status ENUM ('active', 'inactive'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant Admin Assignments
CREATE TABLE public.tenant_admin_assignments (
  admin_id UUID REFERENCES public.tenant_admins(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_id, tenant_id)
);

-- Global audit log (cross-tenant, for system-level events)
CREATE TABLE public.audit_log_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  action VARCHAR(100), -- 'subscription_created', 'schema_migrated'
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  performed_by UUID,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_created (tenant_id, created_at)
);

-- Feature flags (enable/disable features per tenant)
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_name VARCHAR(100),
  enabled BOOLEAN DEFAULT false,
  config JSONB,
  UNIQUE (tenant_id, feature_name)
);
```

### 1.2 Tenant Schema (Replicated for each organization)

```sql
-- Example: tenant_001 schema

-- EMPLOYEES TABLE
CREATE TABLE tenant_001.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Personal Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email_personal VARCHAR(255),
  email_company VARCHAR(255) UNIQUE NOT NULL,
  phone_personal VARCHAR(20),
  phone_company VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(100),
  ssn_encrypted BYTEA, -- Encrypted: PGCrypto
  passport_number_encrypted BYTEA,

  -- Employment Info
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  job_title VARCHAR(100),
  department_id UUID NOT NULL REFERENCES tenant_001.departments(id),
  cost_center_id UUID REFERENCES tenant_001.cost_centers(id),
  manager_id UUID REFERENCES tenant_001.employees(id) ON DELETE SET NULL,
  employment_type ENUM ('full_time', 'part_time', 'contract', 'intern'),
  employment_status ENUM ('active', 'on_leave', 'suspended', 'terminated'),
  start_date DATE NOT NULL,
  end_date DATE,

  -- Compensation
  salary_encrypted NUMERIC, -- Encrypted
  salary_currency VARCHAR(3) DEFAULT 'OMR',
  bank_account_encrypted BYTEA, -- IBAN

  -- Work Schedule
  work_location VARCHAR(100),
  work_schedule_id UUID REFERENCES tenant_001.work_schedules(id),

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete
  created_by UUID,
  updated_by UUID,

  INDEX idx_dept (department_id),
  INDEX idx_manager (manager_id),
  INDEX idx_status (employment_status),
  INDEX idx_deleted (deleted_at)
);

-- DEPARTMENTS TABLE
CREATE TABLE tenant_001.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE,
  parent_department_id UUID REFERENCES tenant_001.departments(id),
  head_id UUID REFERENCES tenant_001.employees(id),
  budget DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LEAVE TYPES TABLE
CREATE TABLE tenant_001.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- Annual Leave, Sick Leave, Maternity, etc.
  code VARCHAR(20) UNIQUE,
  annual_entitlement INT, -- Days per year
  paid BOOLEAN DEFAULT true,
  description TEXT,
  requires_approval BOOLEAN DEFAULT true,
  country_code VARCHAR(2), -- OM, AE (for localized entitlements)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LEAVE REQUESTS TABLE
CREATE TABLE tenant_001.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES tenant_001.employees(id),
  leave_type_id UUID NOT NULL REFERENCES tenant_001.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INT GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason TEXT,
  status ENUM ('draft', 'submitted', 'approved', 'rejected', 'cancelled') DEFAULT 'draft',
  approved_by UUID REFERENCES tenant_001.employees(id),
  approval_comment TEXT,
  approved_at TIMESTAMP,
  attachment_ids UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee_status (employee_id, status),
  INDEX idx_dates (start_date, end_date)
);

-- ATTENDANCE TABLE
CREATE TABLE tenant_001.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES tenant_001.employees(id),
  attendance_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  work_hours_scheduled DECIMAL(5, 2),
  work_hours_actual DECIMAL(5, 2),
  status ENUM ('present', 'absent', 'late', 'on_leave', 'holiday', 'sick'),
  location VARCHAR(100), -- Office location or GPS
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, attendance_date),
  INDEX idx_employee_date (employee_id, attendance_date)
);

-- PAYROLL PERIODS TABLE
CREATE TABLE tenant_001.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name VARCHAR(50), -- 'January 2026', '2026-M01'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  salary_due_date DATE,
  status ENUM ('draft', 'locked', 'processed', 'paid'),
  total_employees INT,
  total_salary DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (start_date, end_date)
);

-- SALARY SLIPS TABLE
CREATE TABLE tenant_001.salary_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES tenant_001.employees(id),
  payroll_period_id UUID NOT NULL REFERENCES tenant_001.payroll_periods(id),
  base_salary DECIMAL(12, 2),
  allowances DECIMAL(12, 2),
  deductions DECIMAL(12, 2),
  net_salary DECIMAL(12, 2),
  paid_status ENUM ('pending', 'paid', 'failed') DEFAULT 'pending',
  paid_at TIMESTAMP,
  payment_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, payroll_period_id),
  INDEX idx_payroll_period (payroll_period_id)
);

-- AUDIT LOG (Tenant-specific)
CREATE TABLE tenant_001.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100), -- 'create', 'update', 'delete'
  resource_type VARCHAR(50), -- 'employee', 'leave_request', 'salary_slip'
  resource_id UUID,
  resource_name VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created (created_at)
);

-- ROW-LEVEL SECURITY (RBAC/ABAC)
-- Example: Department isolation
ALTER TABLE tenant_001.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_department_access ON tenant_001.employees
  USING (
    -- HR Admins see all employees
    current_user_role() = 'HR_ADMIN'
    OR
    -- Managers see their department
    department_id = (
      SELECT department_id FROM tenant_001.employee_assignments
      WHERE user_id = current_user_id()
      LIMIT 1
    )
    OR
    -- Employees see themselves
    id = (SELECT employee_id FROM tenant_001.user_employees WHERE user_id = current_user_id())
  );
```

### 1.3 Tenant Users Table

```sql
-- USER TO TENANT MAPPING
CREATE TABLE tenant_001.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  phone VARCHAR(20),

  -- Auth
  oauth_provider VARCHAR(50), -- 'google', 'microsoft'
  oauth_id VARCHAR(255),
  auth_method ENUM ('email', 'oauth') DEFAULT 'email',

  -- Status
  status ENUM ('active', 'inactive', 'pending_invitation') DEFAULT 'pending_invitation',
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,

  -- 2FA
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret_encrypted BYTEA,
  mfa_backup_codes_encrypted BYTEA,

  -- Roles
  roles TEXT[] DEFAULT ARRAY['EMPLOYEE'], -- Array of role codes

  -- Metadata
  last_login TIMESTAMP,
  last_ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  password_last_changed TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_oauth (oauth_provider, oauth_id)
);

-- USER TO EMPLOYEE LINK
CREATE TABLE tenant_001.user_employees (
  user_id UUID REFERENCES tenant_001.users(id),
  employee_id UUID REFERENCES tenant_001.employees(id),
  PRIMARY KEY (user_id, employee_id)
);

-- ROLES (Predefined RBAC roles)
CREATE TABLE tenant_001.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE, -- 'HR_ADMIN', 'PAYROLL', 'EMPLOYEE'
  name VARCHAR(100),
  description TEXT,
  permissions TEXT[], -- Array of permission codes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Role Assignments (for ABAC)
CREATE TABLE tenant_001.role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES tenant_001.users(id),
  role_id UUID NOT NULL REFERENCES tenant_001.roles(id),
  scope_type VARCHAR(50), -- 'department', 'cost_center', 'tenant'
  scope_id UUID, -- department_id, cost_center_id, null for tenant-wide
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, role_id, scope_type, scope_id)
);
```

---

## 2. API Specification

### 2.1 Authentication API

#### POST /api/auth/register

```
Request:
{
  "email": "alfarid@masirat.com",
  "password": "SecurePass123!",
  "full_name": "Alfarid Islam",
  "tenant_name": "Masirat Al Ibda"
}

Response (201):
{
  "user_id": "usr_123",
  "email": "alfarid@masirat.com",
  "tenant_id": "tenant_001",
  "verification_email_sent": true
}
```

#### POST /api/auth/login

```
Request:
{
  "email": "alfarid@masirat.com",
  "password": "SecurePass123!",
  "tenant_slug": "masirat-al-ibda"
}

Response (200):
{
  "access_token": "eyJhbGc...",
  "refresh_token": "ref_...",
  "expires_in": 3600,
  "user": {
    "id": "usr_123",
    "email": "alfarid@masirat.com",
    "full_name": "Alfarid Islam",
    "roles": ["HR_ADMIN"],
    "tenant_id": "tenant_001"
  }
}
```

#### POST /api/auth/refresh

```
Request:
{
  "refresh_token": "ref_..."
}

Response (200):
{
  "access_token": "eyJhbGc...",
  "expires_in": 3600
}
```

### 2.2 Employees API

#### GET /api/v1/employees

```
Query Parameters:
- page: 1
- limit: 20
- department_id: dept_123 (optional)
- employment_status: active (optional)
- search: "Ahmed" (optional)

Response (200):
{
  "data": [
    {
      "id": "emp_001",
      "employee_id": "EMP0001",
      "first_name": "Ahmed",
      "last_name": "Al Balushi",
      "email_company": "ahmed@masirat.com",
      "job_title": "HR Manager",
      "department": { "id": "dept_001", "name": "HR" },
      "employment_status": "active",
      "start_date": "2023-01-15",
      "manager": { "id": "emp_002", "full_name": "Fatima Al Siyabi" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

#### POST /api/v1/employees

```
Request (requires HR_ADMIN role):
{
  "first_name": "Mohammed",
  "last_name": "Al Makki",
  "email_company": "mohammed@masirat.com",
  "job_title": "Accountant",
  "department_id": "dept_002",
  "employment_type": "full_time",
  "start_date": "2026-02-15",
  "salary": 2500.00
}

Response (201):
{
  "id": "emp_146",
  "employee_id": "EMP0146",
  "first_name": "Mohammed",
  "last_name": "Al Makki",
  "email_company": "mohammed@masirat.com",
  "created_at": "2026-02-01T10:30:00Z"
}
```

#### PUT /api/v1/employees/{id}

```
Request:
{
  "job_title": "Senior Accountant",
  "salary": 3000.00
}

Response (200):
{
  "id": "emp_146",
  "job_title": "Senior Accountant",
  "salary": 3000.00,
  "updated_at": "2026-02-01T11:00:00Z"
}
```

#### DELETE /api/v1/employees/{id}

```
Response (204): No Content
(Soft delete: sets deleted_at timestamp)
```

### 2.3 Leave Requests API

#### GET /api/v1/leave-requests

```
Query Parameters:
- status: approved (optional)
- from_date: 2026-01-01
- to_date: 2026-12-31
- employee_id: emp_001 (optional, admin only)

Response (200):
{
  "data": [
    {
      "id": "lr_001",
      "employee": { "id": "emp_001", "full_name": "Ahmed Al Balushi" },
      "leave_type": { "id": "lt_001", "name": "Annual Leave" },
      "start_date": "2026-03-01",
      "end_date": "2026-03-05",
      "duration_days": 5,
      "reason": "Family visit",
      "status": "approved",
      "approved_by": { "id": "emp_002", "full_name": "Fatima Al Siyabi" },
      "approved_at": "2026-02-20T14:30:00Z",
      "created_at": "2026-02-18T09:00:00Z"
    }
  ]
}
```

#### POST /api/v1/leave-requests

```
Request:
{
  "leave_type_id": "lt_001",
  "start_date": "2026-03-15",
  "end_date": "2026-03-17",
  "reason": "Personal time"
}

Response (201):
{
  "id": "lr_002",
  "status": "submitted",
  "created_at": "2026-02-01T10:00:00Z"
}
```

#### PATCH /api/v1/leave-requests/{id}/approve

```
Request:
{
  "comment": "Approved"
}

Response (200):
{
  "id": "lr_001",
  "status": "approved",
  "approved_at": "2026-02-01T15:30:00Z"
}
```

#### PATCH /api/v1/leave-requests/{id}/reject

```
Request:
{
  "reason": "Insufficient notice"
}

Response (200):
{
  "id": "lr_001",
  "status": "rejected"
}
```

### 2.4 Attendance API

#### POST /api/v1/attendance/check-in

```
Request:
{
  "location": "Office - Muscat"
}

Response (200):
{
  "employee_id": "emp_001",
  "check_in_time": "2026-02-01T08:30:00Z",
  "attendance_date": "2026-02-01"
}
```

#### POST /api/v1/attendance/check-out

```
Response (200):
{
  "employee_id": "emp_001",
  "check_out_time": "2026-02-01T17:00:00Z",
  "work_hours_actual": 8.5
}
```

#### GET /api/v1/attendance?from_date=2026-01-01&to_date=2026-02-01

```
Response (200):
{
  "data": [
    {
      "attendance_date": "2026-02-01",
      "check_in_time": "08:30",
      "check_out_time": "17:00",
      "work_hours_actual": 8.5,
      "status": "present"
    },
    {
      "attendance_date": "2026-02-02",
      "status": "on_leave"
    }
  ]
}
```

### 2.5 Payroll API

#### POST /api/v1/payroll/periods

```
Request (requires PAYROLL role):
{
  "period_name": "January 2026",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "salary_due_date": "2026-02-05"
}

Response (201):
{
  "id": "pp_001",
  "period_name": "January 2026",
  "status": "draft",
  "total_employees": 145
}
```

#### POST /api/v1/payroll/periods/{id}/generate-slips

```
Request:
{
  "include_overtime": true,
  "include_deductions": true
}

Response (202): Accepted (Async job)
{
  "job_id": "job_456",
  "status": "processing",
  "message": "Salary slips generation started"
}
```

#### GET /api/v1/payroll/periods/{id}/slips

```
Response (200):
{
  "data": [
    {
      "id": "ss_001",
      "employee": { "id": "emp_001", "full_name": "Ahmed Al Balushi" },
      "base_salary": 2500.00,
      "allowances": 300.00,
      "deductions": 250.00,
      "net_salary": 2550.00,
      "paid_status": "pending"
    }
  ]
}
```

#### POST /api/v1/payroll/periods/{id}/process

```
Request:
{}

Response (202): Accepted
{
  "job_id": "job_789",
  "status": "processing",
  "message": "Payroll processing initiated"
}
```

### 2.6 Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email already exists"
      }
    ]
  }
}
```

**Common HTTP Status Codes:**

- `200 OK` - Successful GET/PUT/PATCH
- `201 Created` - Successful POST (resource created)
- `202 Accepted` - Async operation started
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## 3. Backend Code Structure

### 3.1 Directory Layout

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # PostgreSQL, MongoDB connections
│   │   ├── redis.ts             # Redis client
│   │   ├── env.ts               # Environment variables
│   │   └── logger.ts            # Winston logger setup
│   │
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   ├── tenant.ts            # Tenant context extraction
│   │   ├── rbac.ts              # Role-based access control
│   │   ├── validation.ts        # Request validation
│   │   ├── errorHandler.ts      # Global error handler
│   │   └── requestLogger.ts     # Request/response logging
│   │
│   ├── routes/
│   │   ├── auth.ts              # /api/auth/*
│   │   ├── employees.ts         # /api/v1/employees/*
│   │   ├── leaves.ts            # /api/v1/leave-requests/*
│   │   ├── attendance.ts        # /api/v1/attendance/*
│   │   ├── payroll.ts           # /api/v1/payroll/*
│   │   └── admin.ts             # /api/admin/* (tenant management)
│   │
│   ├── controllers/
│   │   ├── authController.ts    # Login, register logic
│   │   ├── employeeController.ts
│   │   ├── leaveController.ts
│   │   ├── attendanceController.ts
│   │   ├── payrollController.ts
│   │   └── adminController.ts
│   │
│   ├── services/
│   │   ├── authService.ts       # Auth logic, JWT generation
│   │   ├── employeeService.ts   # Employee CRUD
│   │   ├── leaveService.ts      # Leave logic, approvals
│   │   ├── attendanceService.ts
│   │   ├── payrollService.ts    # Payroll calculations
│   │   ├── notificationService.ts # Email, SMS, notifications
│   │   ├── tenantService.ts     # Tenant provisioning
│   │   └── auditService.ts      # Audit logging
│   │
│   ├── models/
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── schemas.ts           # Joi/Yup validation schemas
│   │   └── constants.ts         # Enums, constants
│   │
│   ├── utils/
│   │   ├── encryption.ts        # PGCrypto, field encryption
│   │   ├── dateHelper.ts        # Date calculations (leave balance)
│   │   ├── validators.ts        # Custom validators
│   │   ├── cache.ts             # Redis cache helpers
│   │   └── s3.ts                # S3 upload, download
│   │
│   ├── jobs/
│   │   ├── payrollJob.ts        # Async payroll processing
│   │   ├── attendanceJob.ts     # Daily attendance reports
│   │   ├── emailJob.ts          # Email queue processing
│   │   └── backupJob.ts         # Database backup
│   │
│   ├── migrations/
│   │   ├── 001_initial_schema.ts
│   │   ├── 002_add_audit_table.ts
│   │   └── ...
│   │
│   └── app.ts                   # Express app initialization

├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/

├── Dockerfile
├── docker-compose.yml           # Local dev environment
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### 3.2 Example: Employee Service

```typescript
// services/employeeService.ts

import { Pool } from "pg";
import { Employee, EmployeeFilter } from "../models/types";
import { notificationService } from "./notificationService";
import { auditService } from "./auditService";

export class EmployeeService {
  constructor(
    private db: Pool,
    private tenantId: string,
  ) {}

  async listEmployees(
    filters: EmployeeFilter,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        e.id, e.employee_id, e.first_name, e.last_name, e.email_company,
        e.job_title, e.employment_status, e.start_date,
        d.name as department_name,
        m.first_name || ' ' || m.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.deleted_at IS NULL
        ${filters.department_id ? "AND e.department_id = $1" : ""}
        ${filters.employment_status ? "AND e.employment_status = $2" : ""}
        ${filters.search ? "AND (e.first_name ILIKE $3 OR e.last_name ILIKE $3)" : ""}
      ORDER BY e.created_at DESC
      LIMIT $${filters.department_id ? 4 : 3} OFFSET $${filters.department_id ? 5 : 4}
    `;

    const result = await this.db.query(
      query,
      [
        filters.department_id,
        filters.employment_status,
        filters.search ? `%${filters.search}%` : undefined,
        limit,
        offset,
      ].filter(Boolean),
    );

    const countResult = await this.db.query(`
      SELECT COUNT(*) FROM employees WHERE deleted_at IS NULL
    `);

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    };
  }

  async createEmployee(data: Partial<Employee>, userId: string) {
    const {
      first_name,
      last_name,
      email_company,
      job_title,
      department_id,
      salary,
    } = data;

    const query = `
      INSERT INTO employees (
        first_name, last_name, email_company, job_title, department_id, 
        salary_encrypted, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, pgp_sym_encrypt($6::TEXT, 'secret_key'), $7, $7)
      RETURNING id, employee_id, first_name, last_name, email_company, job_title;
    `;

    const result = await this.db.query(query, [
      first_name,
      last_name,
      email_company,
      job_title,
      department_id,
      salary,
      userId,
    ]);

    const employee = result.rows[0];

    // Audit log
    await auditService.log(this.tenantId, {
      action: "create",
      resource_type: "employee",
      resource_id: employee.id,
      resource_name: `${employee.first_name} ${employee.last_name}`,
      new_values: data,
      performed_by: userId,
    });

    // Send welcome email
    await notificationService.sendEmail({
      to: email_company,
      template: "employee_welcome",
      data: { name: first_name, email_company },
    });

    return employee;
  }

  async updateEmployee(id: string, data: Partial<Employee>, userId: string) {
    // Fetch existing data for audit
    const existingResult = await this.db.query(
      "SELECT * FROM employees WHERE id = $1",
      [id],
    );
    const oldValues = existingResult.rows[0];

    const updateFields = Object.keys(data)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ");

    const query = `
      UPDATE employees
      SET ${updateFields}, updated_by = $${Object.keys(data).length + 1}, updated_at = NOW()
      WHERE id = $${Object.keys(data).length + 2}
      RETURNING *;
    `;

    const result = await this.db.query(query, [
      ...Object.values(data),
      userId,
      id,
    ]);

    const updatedEmployee = result.rows[0];

    // Audit log
    await auditService.log(this.tenantId, {
      action: "update",
      resource_type: "employee",
      resource_id: id,
      resource_name: `${updatedEmployee.first_name} ${updatedEmployee.last_name}`,
      old_values: oldValues,
      new_values: data,
      performed_by: userId,
    });

    return updatedEmployee;
  }

  async softDeleteEmployee(id: string, userId: string) {
    const query = `
      UPDATE employees
      SET deleted_at = NOW(), updated_by = $1
      WHERE id = $2
      RETURNING id;
    `;

    await this.db.query(query, [userId, id]);

    // Audit log
    await auditService.log(this.tenantId, {
      action: "delete",
      resource_type: "employee",
      resource_id: id,
      performed_by: userId,
    });
  }
}
```

### 3.3 Example: Express Route Handler

```typescript
// routes/employees.ts

import express, { Router, Request, Response } from "express";
import {
  authMiddleware,
  tenantMiddleware,
  rbacMiddleware,
} from "../middleware";
import { employeeController } from "../controllers";

const router: Router = express.Router();

// GET /api/v1/employees
router.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        department_id,
        employment_status,
        search,
      } = req.query;

      const result = await employeeController.listEmployees({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters: { department_id, employment_status, search },
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/v1/employees (requires HR_ADMIN role)
router.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  rbacMiddleware(["HR_ADMIN"]),
  async (req: Request, res: Response) => {
    try {
      const employee = await employeeController.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
);

// PUT /api/v1/employees/:id
router.put(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  rbacMiddleware(["HR_ADMIN"]),
  async (req: Request, res: Response) => {
    try {
      const employee = await employeeController.updateEmployee(
        req.params.id,
        req.body,
      );
      res.json(employee);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
);

// DELETE /api/v1/employees/:id (soft delete)
router.delete(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  rbacMiddleware(["HR_ADMIN"]),
  async (req: Request, res: Response) => {
    try {
      await employeeController.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
);

export default router;
```

---

## 4. Frontend Components (React + RTK Query)

### 4.1 Redux Store Setup

```typescript
// store/index.ts

import { configureStore } from "@reduxjs/toolkit";
import { employeeApi } from "./apis/employeeApi";
import { leaveApi } from "./apis/leaveApi";
import { attendanceApi } from "./apis/attendanceApi";
import { payrollApi } from "./apis/payrollApi";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [employeeApi.reducerPath]: employeeApi.reducer,
    [leaveApi.reducerPath]: leaveApi.reducer,
    [attendanceApi.reducerPath]: attendanceApi.reducer,
    [payrollApi.reducerPath]: payrollApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(employeeApi.middleware)
      .concat(leaveApi.middleware)
      .concat(attendanceApi.middleware)
      .concat(payrollApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 4.2 RTK Query API Slice

```typescript
// store/apis/employeeApi.ts

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "../index";

export const employeeApi = createApi({
  reducerPath: "employeeApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Employees"],
  endpoints: (builder) => ({
    listEmployees: builder.query({
      query: ({ page = 1, limit = 20, filters = {} }) => ({
        url: "/employees",
        params: { page, limit, ...filters },
      }),
      providesTags: ["Employees"],
    }),
    getEmployee: builder.query({
      query: (id) => `/employees/${id}`,
      providesTags: (result, error, id) => [{ type: "Employees", id }],
    }),
    createEmployee: builder.mutation({
      query: (data) => ({
        url: "/employees",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Employees"],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/employees/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Employees", id }],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/employees/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employees"],
    }),
  }),
});

export const {
  useListEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeeApi;
```

### 4.3 Example React Component

```typescript
// components/EmployeeList.tsx

import React, { useState } from 'react';
import { useListEmployeesQuery, useDeleteEmployeeMutation } from '../store/apis/employeeApi';
import { useAppSelector } from '../hooks/redux';

const EmployeeList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  const { data, isLoading, error } = useListEmployeesQuery({
    page,
    limit: 20,
    filters,
  });

  const [deleteEmployee] = useDeleteEmployeeMutation();
  const user = useAppSelector((state) => state.auth.user);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id).unwrap();
        alert('Employee deleted successfully');
      } catch (error) {
        alert('Failed to delete employee');
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading employees</div>;

  return (
    <div className="employee-list">
      <h1>Employees</h1>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name"
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.employee_id}</td>
              <td>{employee.first_name} {employee.last_name}</td>
              <td>{employee.email_company}</td>
              <td>{employee.department_name}</td>
              <td>{employee.employment_status}</td>
              <td>
                <button onClick={() => handleDelete(employee.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </button>
        <span>Page {data?.page} of {Math.ceil(data?.total / 20)}</span>
        <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(data?.total / 20)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default EmployeeList;
```

---

## 5. Deployment Architecture

### 5.1 Docker Compose (Local Development)

```yaml
# docker-compose.yml

version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: hrms_dev
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: hrms_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hrms_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin_password
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: hrms_dev
      DB_PASSWORD: dev_password
      DB_NAME: hrms_dev
      REDIS_URL: redis://redis:6379
      MONGO_URL: mongodb://admin:admin_password@mongo:27017
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      mongo:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
    depends_on:
      - backend
    volumes:
      - ../frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  mongo_data:
```

### 5.2 Dockerfile (Production)

```dockerfile
# Multi-stage build for Node.js backend

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /build
COPY package*.json ./
RUN npm ci --only=production && npm prune --production

# Copy source
COPY . .

# Compile TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### 5.3 AWS CloudFormation Template (Infrastructure as Code)

```yaml
# cloudformation/stack.yaml

AWSTemplateFormatVersion: "2010-09-09"
Description: "HRMS SaaS Infrastructure"

Resources:
  # ECS Cluster
  EcsCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: hrms-prod

  # RDS PostgreSQL
  RDSInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: hrms-prod-db
      DBInstanceClass: db.r6i.xlarge
      Engine: postgres
      EngineVersion: "15.1"
      MasterUsername: !Sub "{{resolve:secretsmanager:hrms/db:SecretString:username}}"
      MasterUserPassword: !Sub "{{resolve:secretsmanager:hrms/db:SecretString:password}}"
      AllocatedStorage: 100
      StorageType: gp3
      StorageEncrypted: true
      KmsKeyId: !GetAtt RDSKmsKey.Arn
      MultiAZ: true
      BackupRetentionPeriod: 30
      PreferredBackupWindow: "03:00-04:00"
      PreferredMaintenanceWindow: "sun:04:00-sun:05:00"
      VPCSecurityGroups:
        - !Ref RDSSecurityGroup
      DBSubnetGroupName: !Ref DBSubnetGroup
      EnableIAMDatabaseAuthentication: true
      DeletionProtection: true

  # ElastiCache Redis
  RedisCluster:
    Type: AWS::ElastiCache::ReplicationGroup
    Properties:
      ReplicationGroupDescription: HRMS Cache
      Engine: redis
      EngineVersion: "7.0"
      CacheNodeType: cache.r6g.xlarge
      NumCacheClusters: 3
      AutomaticFailoverEnabled: true
      MultiAZEnabled: true
      AtRestEncryptionEnabled: true
      TransitEncryptionEnabled: true
      SecurityGroupIds:
        - !Ref RedisSecurityGroup

  # ALB
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: hrms-prod-alb
      Type: application
      Scheme: internet-facing
      IpAddressType: ipv4
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
        - !Ref PublicSubnet3

  # ECS Task Definition
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: hrms-backend
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: "2048"
      Memory: "4096"
      TaskRoleArn: !GetAtt EcsTaskRole.Arn
      ExecutionRoleArn: !GetAtt EcsTaskExecutionRole.Arn
      ContainerDefinitions:
        - Name: hrms-backend
          Image: !Sub "${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/hrms-backend:latest"
          PortMappings:
            - ContainerPort: 3000
              HostPort: 3000
              Protocol: tcp
          Environment:
            - Name: NODE_ENV
              Value: production
            - Name: DB_HOST
              Value: !GetAtt RDSInstance.Endpoint.Address
            - Name: REDIS_URL
              Value: !Sub "redis://${RedisCluster.RedisEndpoint.Address}:6379"
          Secrets:
            - Name: DB_PASSWORD
              ValueFrom: !Sub "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:hrms/db:password"
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: ecs

  # ECS Service
  EcsService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: hrms-backend-service
      Cluster: !Ref EcsCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 3
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2
            - !Ref PrivateSubnet3
          SecurityGroups:
            - !Ref EcsSecurityGroup
          AssignPublicIp: DISABLED
      LoadBalancers:
        - ContainerName: hrms-backend
          ContainerPort: 3000
          TargetGroupArn: !Ref TargetGroup

  # Auto Scaling
  ServiceScaling:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 10
      MinCapacity: 3
      ResourceId: !Sub "service/${EcsCluster}/hrms-backend-service"
      RoleARN: !Sub "arn:aws:iam::${AWS::AccountId}:role/ecsAutoscalingRole"
      ScalableDimension: ecs:service:DesiredCount
      ServiceNamespace: ecs

  # CloudWatch Log Group
  LogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /ecs/hrms-prod
      RetentionInDays: 30

Outputs:
  LoadBalancerDNS:
    Value: !GetAtt ApplicationLoadBalancer.DNSName
  RDSEndpoint:
    Value: !GetAtt RDSInstance.Endpoint.Address
  RedisEndpoint:
    Value: !GetAtt RedisCluster.RedisEndpoint.Address
```

---

## 6. Database Migration Strategy

### 6.1 Migration Tool: Knex.js

```typescript
// knexfile.ts

module.exports = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./seeds",
      extension: "ts",
    },
  },
  production: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 10, max: 30 },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
  },
};
```

### 6.2 Creating a Migration

```typescript
// migrations/001_initial_schema.ts

import Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return (
    knex.schema
      // Create public schema tables
      .createTable("public.tenants", (t) => {
        t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
        t.string("name", 255).notNullable();
        t.string("slug", 100).unique().notNullable();
        t.string("schema_name", 100).unique().notNullable();
        t.enum("subscription_plan", ["starter", "professional", "enterprise"]);
        t.enum("subscription_status", [
          "active",
          "trial",
          "suspended",
          "cancelled",
        ]);
        t.timestamp("trial_ends_at");
        t.timestamps(true, true);
      })
      // Create initial tenant schema
      .then(() => knex.raw("CREATE SCHEMA IF NOT EXISTS tenant_001"))
      .then(() => {
        return knex.schema
          .withSchema("tenant_001")
          .createTable("employees", (t) => {
            t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
            t.string("employee_id", 50).unique().notNullable();
            t.string("first_name", 100).notNullable();
            t.string("last_name", 100).notNullable();
            t.string("email_company", 255).unique().notNullable();
            t.enum("employment_status", [
              "active",
              "on_leave",
              "suspended",
              "terminated",
            ]).default("active");
            t.date("start_date").notNullable();
            t.date("end_date");
            t.timestamps(true, true);
            t.timestamp("deleted_at");
            t.index("employment_status");
            t.index("deleted_at");
          });
      })
  );
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema
    .withSchema("tenant_001")
    .dropTableIfExists("employees")
    .then(() => knex.raw("DROP SCHEMA IF EXISTS tenant_001 CASCADE"))
    .then(() => knex.schema.dropTableIfExists("public.tenants"));
}
```

---

## 7. Error Handling & Logging

### 7.1 Global Error Handler

```typescript
// middleware/errorHandler.ts

import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export interface AppError extends Error {
  status?: number;
  details?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  // Log error
  logger.error({
    message,
    status,
    path: req.path,
    method: req.method,
    tenant_id: req.tenantId,
    user_id: req.userId,
    stack: err.stack,
    details: err.details,
  });

  // Don't expose internal errors to client
  const clientMessage = status === 500 ? "Internal Server Error" : message;

  res.status(status).json({
    error: {
      message: clientMessage,
      code: err.name,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

// Custom error classes
export class ValidationError extends Error {
  status = 400;
  constructor(
    public details: any,
    message: string = "Validation Error",
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
```

### 7.2 Logger Configuration

```typescript
// config/logger.ts

import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "hrms-backend" },
  transports: [
    // Console output (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`;
        }),
      ),
    }),
    // File output (production)
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

export { logger };
```

---

## 8. Testing Strategy

### 8.1 Unit Test Example

```typescript
// tests/unit/services/employeeService.test.ts

import { EmployeeService } from "../../../src/services/employeeService";
import { Pool } from "pg";

describe("EmployeeService", () => {
  let service: EmployeeService;
  let mockDb: jest.Mocked<Pool>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    service = new EmployeeService(mockDb, "tenant_001");
  });

  describe("createEmployee", () => {
    it("should create an employee and log audit", async () => {
      const employeeData = {
        first_name: "Ahmed",
        last_name: "Al Balushi",
        email_company: "ahmed@masirat.com",
        job_title: "HR Manager",
        department_id: "dept_001",
        salary: 2500,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: "emp_001", ...employeeData }],
      });

      const result = await service.createEmployee(employeeData, "usr_123");

      expect(result).toHaveProperty("id");
      expect(mockDb.query).toHaveBeenCalled();
    });

    it("should throw validation error for missing email", async () => {
      const invalidData = {
        first_name: "Ahmed",
        last_name: "Al Balushi",
        // missing email_company
      };

      await expect(
        service.createEmployee(invalidData as any, "usr_123"),
      ).rejects.toThrow();
    });
  });
});
```

### 8.2 Integration Test Example

```typescript
// tests/integration/routes/employees.test.ts

import request from "supertest";
import app from "../../../src/app";

describe("Employee Routes", () => {
  let authToken: string;

  beforeAll(async () => {
    // Login and get token
    const response = await request(app).post("/api/auth/login").send({
      email: "test@masirat.com",
      password: "testpass123",
      tenant_slug: "masirat-test",
    });
    authToken = response.body.access_token;
  });

  describe("GET /api/v1/employees", () => {
    it("should return list of employees", async () => {
      const response = await request(app)
        .get("/api/v1/employees?page=1&limit=20")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("POST /api/v1/employees", () => {
    it("should create employee with HR_ADMIN role", async () => {
      const response = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          first_name: "Mohammed",
          last_name: "Al Makki",
          email_company: "mohammed@masirat.com",
          job_title: "Accountant",
          department_id: "dept_001",
          salary: 2500,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
    });

    it("should reject without HR_ADMIN role", async () => {
      // Login as regular employee
      const empResponse = await request(app).post("/api/auth/login").send({
        email: "employee@masirat.com",
        password: "emppass123",
        tenant_slug: "masirat-test",
      });
      const empToken = empResponse.body.access_token;

      const response = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          first_name: "Mohammed",
          last_name: "Al Makki",
          email_company: "mohammed@masirat.com",
          job_title: "Accountant",
          department_id: "dept_001",
          salary: 2500,
        });

      expect(response.status).toBe(403);
    });
  });
});
```

---

## Summary

This LLD provides:

- **Database schema** with multi-tenancy, encryption, RLS policies
- **API specification** with request/response formats
- **Backend code structure** with services, controllers, middleware
- **Frontend components** using React + RTK Query
- **Deployment architecture** with Docker, CloudFormation
- **Testing strategy** for unit and integration tests

Ready to proceed with implementation? Next steps:

1. Set up project structure & dependencies
2. Implement authentication & tenant middleware
3. Build core CRUD operations (employees, leaves)
4. Integrate Prometheus metrics
5. Deploy to ECS/Fargate

---

**Status:** Ready for development  
**Last Updated:** February 2, 2026
