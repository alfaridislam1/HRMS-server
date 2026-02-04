# HRMS Database Architecture - Visual Guide

**Complete system architecture, flows, and relationships**

---

## 🏗️ Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│  (Express/NestJS Controllers, Services, API Routes)             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  CACHE LAYER    │   │ TENANT MANAGER  │
│  (Redis)        │   │   & Router      │
│                 │   │                 │
│ ├─ Org Data     │   │ ├─ Routing      │
│ ├─ Permissions  │   │ ├─ Isolation    │
│ ├─ Dashboards   │   │ └─ Features     │
│ └─ Stats        │   └─────────────────┘
└────────┬────────┘           │
         │                    │
         └────────┬───────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
┌──────────────────┐   ┌──────────────────┐
│   PostgreSQL     │   │     MongoDB      │
│   (Structured)   │   │  (Unstructured)  │
│                  │   │                  │
│ ├─ Public Schema │   │ ├─ Appraisals    │
│ │ (Tenants)      │   │ ├─ Documents     │
│ │                │   │ ├─ Settings      │
│ ├─ Tenant 1      │   │ ├─ Features      │
│ │ (20 tables)    │   │ └─ Audit         │
│ │                │   │                  │
│ ├─ Tenant 2      │   └──────────────────┘
│ │ (20 tables)    │
│ │                │
│ └─ Tenant N      │
│   (20 tables)    │
└────────┬─────────┘
         │
         ▼
    ┌─────────────┐
    │  S3 Backup  │
    │   Storage   │
    │             │
    │ ├─ Daily    │
    │ ├─ Schema   │
    │ └─ Archive  │
    └─────────────┘
```

---

## 🗂️ PostgreSQL Schema Structure

### Public Schema (Tenant Management)

```
PUBLIC SCHEMA
┌──────────────────────────────────────┐
│            TENANTS TABLE             │
├──────────────────────────────────────┤
│ id (UUID, PK)                        │
│ name                                 │
│ slug                                 │
│ database_schema  → points to→ tenant schema
│ admin_email                          │
│ status (active/inactive)             │
│ settings (JSON)                      │
│ created_at                           │
│ updated_at                           │
│ deleted_at (soft delete)             │
└──────────────────────────────────────┘
         ↓ 1:N
    ┌────────────────────┐
    │ TENANT_FEATURES    │
    ├────────────────────┤
    │ id (UUID, PK)      │
    │ tenant_id (FK)     │
    │ feature_name       │
    │ enabled (bool)     │
    │ config (JSON)      │
    └────────────────────┘

    ┌────────────────────┐
    │ TENANT_AUDIT       │
    ├────────────────────┤
    │ id (UUID, PK)      │
    │ tenant_id (FK)     │
    │ action             │
    │ changes (JSON)     │
    │ created_at         │
    └────────────────────┘
```

### Per-Tenant Schema (e.g., tenant_acme_abc12345)

```
TENANT SCHEMA: tenant_acme_abc12345
┌────────────────────────────────────────────────────┐
│                                                    │
│  AUTHENTICATION & USERS                            │
│  ┌──────────────┐                                  │
│  │ USERS        │ - login credentials              │
│  │ role: admin  │ - role-based access              │
│  │ status       │                                  │
│  └──────────────┘                                  │
│          ↑                                         │
│          │ 1:N                                     │
│          │                                         │
│  ORGANIZATION STRUCTURE                           │
│  ┌──────────────────────┐                          │
│  │ DEPARTMENTS          │ hierarchical             │
│  │ - department_id (FK) │ parent reference         │
│  │ - name               │ path tracking            │
│  │ - manager_id         │                          │
│  └──────────────────────┘                          │
│                                                    │
│  ┌──────────────────────┐                          │
│  │ DESIGNATIONS         │ job titles               │
│  │ - designation_code   │ level, category          │
│  │ - salary_grade       │ reporting structure      │
│  └──────────────────────┘                          │
│                                                    │
│  EMPLOYEE MANAGEMENT                              │
│  ┌────────────────────────────────┐               │
│  │ EMPLOYEES                      │               │
│  │ ├─ Personal (DOB, contact)     │               │
│  │ ├─ Employment (join, type)     │               │
│  │ ├─ Identities (PAN, Aadhaar)   │               │
│  │ ├─ department_id (FK) ────────→ DEPARTMENTS  │
│  │ ├─ designation_id (FK) ──────→ DESIGNATIONS  │
│  │ └─ manager_id (FK) ───────────→ USERS        │
│  └────────────────────────────────┘               │
│          ↑                                         │
│          │ 1:N                                     │
│          │                                         │
│  ┌────────────────────────────────┐               │
│  │ EMPLOYEE_SALARIES              │               │
│  │ ├─ base_salary                 │               │
│  │ ├─ allowances (JSON)           │               │
│  │ │  └─ HRA, DA, Bonus           │               │
│  │ ├─ deductions (JSON)           │               │
│  │ │  └─ PF, Tax, Insurance       │               │
│  │ ├─ effective_from              │               │
│  │ └─ effective_to (NULL=current) │               │
│  └────────────────────────────────┘               │
│                                                    │
│  PAYROLL PROCESSING                               │
│  ┌────────────────────────────────┐               │
│  │ SALARY_STRUCTURES              │ templates     │
│  │ ├─ designation_id (FK)         │               │
│  │ ├─ components (JSON)           │               │
│  │ └─ grade_level                 │               │
│  └────────────────────────────────┘               │
│                                                    │
│  ┌────────────────────────────────┐               │
│  │ PAYROLL                        │               │
│  │ ├─ employee_id (FK)            │               │
│  │ ├─ month (YYYY-MM)             │               │
│  │ ├─ days_worked                 │               │
│  │ ├─ gross_salary                │               │
│  │ ├─ net_salary                  │               │
│  │ ├─ status: draft/approved/pay  │               │
│  │ └─ approval workflow refs      │               │
│  └────────────────────────────────┘               │
│                                                    │
│  LEAVE MANAGEMENT                                 │
│  ┌────────────────────────────────┐               │
│  │ LEAVE_TYPES                    │               │
│  │ ├─ name (PTO, Sick, Casual)    │               │
│  │ ├─ max_days_per_year           │               │
│  │ ├─ is_paid                     │               │
│  │ └─ requires_approval           │               │
│  └────────────────────────────────┘               │
│                                                    │
│  ┌────────────────────────────────┐               │
│  │ LEAVES                         │               │
│  │ ├─ employee_id (FK)            │               │
│  │ ├─ leave_type_id (FK)          │               │
│  │ ├─ start_date, end_date        │               │
│  │ ├─ number_of_days              │               │
│  │ ├─ status: pending/approved    │               │
│  │ └─ approval refs               │               │
│  └────────────────────────────────┘               │
│                                                    │
│  ┌────────────────────────────────┐               │
│  │ EMPLOYEE_LEAVE_BALANCE         │               │
│  │ ├─ employee_id (FK)            │               │
│  │ ├─ leave_type_id (FK)          │               │
│  │ ├─ year                        │               │
│  │ ├─ opening_balance             │               │
│  │ ├─ leaves_approved             │               │
│  │ ├─ leaves_pending              │               │
│  │ └─ closing_balance             │               │
│  └────────────────────────────────┘               │
│                                                    │
│  APPROVAL WORKFLOWS                               │
│  ┌────────────────────────────────┐               │
│  │ APPROVAL_WORKFLOWS             │               │
│  │ ├─ entity_type                 │               │
│  │ │  └─ leave / payroll / appr   │               │
│  │ ├─ steps (workflow definition) │               │
│  │ └─ approvers sequence          │               │
│  └────────────────────────────────┘               │
│          ↑                                         │
│          │ N:1                                     │
│          │                                         │
│  ┌────────────────────────────────┐               │
│  │ APPROVALS                      │               │
│  │ ├─ workflow_id (FK)            │               │
│  │ ├─ entity_id (FK to record)    │               │
│  │ ├─ current_step                │               │
│  │ ├─ assigned_to (user_id)       │               │
│  │ ├─ status: pending/approved    │               │
│  │ └─ actioned_at (timestamp)     │               │
│  └────────────────────────────────┘               │
│                                                    │
│  AUDIT & COMPLIANCE                               │
│  ┌────────────────────────────────┐               │
│  │ AUDIT_LOGS                     │               │
│  │ ├─ user_id (who changed)       │               │
│  │ ├─ action: create/update/del   │               │
│  │ ├─ entity_type, entity_id      │               │
│  │ ├─ changes (before/after JSON) │               │
│  │ └─ created_at (when changed)   │               │
│  └────────────────────────────────┘               │
│                                                    │
│  ORGANIZATION SETTINGS                            │
│  ┌────────────────────────────────┐               │
│  │ ORGANIZATION_SETTINGS          │               │
│  │ ├─ key (setting name)          │               │
│  │ ├─ value (JSON)                │               │
│  │ ├─ category                    │               │
│  │ └─ updated_by                  │               │
│  └────────────────────────────────┘               │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 🗄️ MongoDB Collections Structure

```
MONGODB DATABASE: hrms
┌──────────────────────────────────────────────┐
│                                              │
│  APPRAISAL FORMS COLLECTION                  │
│  ┌───────────────────────────────────────┐   │
│  │ AppraisalForm                         │   │
│  │ ├─ tenantId                           │   │
│  │ ├─ employeeId                         │   │
│  │ ├─ appraiserId                        │   │
│  │ ├─ appraisalPeriod                    │   │
│  │ │  ├─ startDate                       │   │
│  │ │  └─ endDate                         │   │
│  │ ├─ template                           │   │
│  │ │  ├─ templateId                      │   │
│  │ │  ├─ templateName                    │   │
│  │ │  └─ version                         │   │
│  │ ├─ responses[] (dynamic fields)       │   │
│  │ │  ├─ questionId                      │   │
│  │ │  └─ answer (text/number/bool)       │   │
│  │ ├─ overallRating                      │   │
│  │ ├─ status: draft/submitted/approved   │   │
│  │ ├─ comments[]                         │   │
│  │ │  ├─ userId                          │   │
│  │ │  └─ text                            │   │
│  │ ├─ submittedAt                        │   │
│  │ ├─ reviewedBy, reviewedAt             │   │
│  │ ├─ approvedBy, approvedAt             │   │
│  │ ├─ createdAt                          │   │
│  │ └─ updatedAt                          │   │
│  └───────────────────────────────────────┘   │
│  Indexes: {tenantId, employeeId}            │
│           {tenantId, status}                │
│           {tenantId, appraisalPeriod}       │
│                                              │
│  DOCUMENT METADATA COLLECTION                │
│  ┌───────────────────────────────────────┐   │
│  │ DocumentMetadata                      │   │
│  │ ├─ tenantId                           │   │
│  │ ├─ employeeId                         │   │
│  │ ├─ documentType                       │   │
│  │ │  ├─ offer_letter                    │   │
│  │ │  ├─ certification                   │   │
│  │ │  ├─ agreement                       │   │
│  │ │  └─ policy                          │   │
│  │ ├─ fileName                           │   │
│  │ ├─ fileSize                           │   │
│  │ ├─ mimeType                           │   │
│  │ ├─ s3Key (S3 storage path)            │   │
│  │ ├─ s3Url (signed URL)                 │   │
│  │ ├─ status: active/expired/archived    │   │
│  │ ├─ verificationStatus                 │   │
│  │ ├─ uploadedBy                         │   │
│  │ ├─ uploadedAt                         │   │
│  │ ├─ lastAccessedAt                     │   │
│  │ ├─ accessLog[]                        │   │
│  │ │  ├─ userId                          │   │
│  │ │  └─ timestamp                       │   │
│  │ ├─ retentionPolicy                    │   │
│  │ │  ├─ deleteAfter (TTL index)         │   │
│  │ │  └─ requiresApprovalForDeletion     │   │
│  │ └─ metadata (dynamic)                 │   │
│  └───────────────────────────────────────┘   │
│  Indexes: {tenantId, employeeId}            │
│           {s3Key} unique                    │
│           {retentionPolicy.deleteAfter} TTL │
│                                              │
│  TENANT SETTINGS COLLECTION                  │
│  ┌───────────────────────────────────────┐   │
│  │ TenantSettings (versioned configs)     │   │
│  │ ├─ tenantId                           │   │
│  │ ├─ category                           │   │
│  │ │  ├─ general                         │   │
│  │ │  ├─ payroll                         │   │
│  │ │  ├─ leave                           │   │
│  │ │  └─ performance                     │   │
│  │ ├─ settings {} (dynamic JSON)         │   │
│  │ ├─ version                            │   │
│  │ ├─ isActive                           │   │
│  │ ├─ validFrom, validUntil              │   │
│  │ ├─ approvedBy, approvedAt             │   │
│  │ ├─ createdAt                          │   │
│  │ └─ updatedAt                          │   │
│  └───────────────────────────────────────┘   │
│  Indexes: {tenantId, category}              │
│           {tenantId, isActive, category}    │
│                                              │
│  FEATURE FLAGS COLLECTION                    │
│  ┌───────────────────────────────────────┐   │
│  │ FeatureFlag (gradual rollout)         │   │
│  │ ├─ tenantId                           │   │
│  │ ├─ featureName                        │   │
│  │ ├─ enabled (bool)                     │   │
│  │ ├─ rolloutPercentage (0-100)          │   │
│  │ │  └─ 75% = feature for 75% of users  │   │
│  │ ├─ config {}                          │   │
│  │ ├─ validFrom, validUntil              │   │
│  │ ├─ createdAt                          │   │
│  │ └─ updatedAt                          │   │
│  └───────────────────────────────────────┘   │
│  Indexes: {tenantId, featureName} unique    │
│                                              │
│  SETTINGS AUDIT COLLECTION                   │
│  ┌───────────────────────────────────────┐   │
│  │ SettingsAudit (change history)        │   │
│  │ ├─ tenantId                           │   │
│  │ ├─ category                           │   │
│  │ ├─ action: create/update/delete       │   │
│  │ ├─ changes                            │   │
│  │ │  ├─ before {}                       │   │
│  │ │  └─ after {}                        │   │
│  │ ├─ changedBy                          │   │
│  │ ├─ reason                             │   │
│  │ └─ createdAt                          │   │
│  └───────────────────────────────────────┘   │
│  Indexes: {tenantId, createdAt}             │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 🔴 Redis Cache Structure

```
REDIS CACHE LAYER
┌────────────────────────────────────────────────────┐
│                                                    │
│  ORGANIZATION DATA (TTL: 1 hour)                  │
│  ├─ org:{tenantId}:departments                    │
│  │  └─ Array<Department>                          │
│  ├─ org:{tenantId}:designations                   │
│  │  └─ Array<Designation>                         │
│  ├─ org:{tenantId}:departments:{id}               │
│  │  └─ Department detail                          │
│  └─ org:{tenantId}:hierarchy                      │
│     └─ Org tree structure                         │
│                                                    │
│  PERMISSIONS (TTL: 30 minutes)                    │
│  ├─ perms:{tenantId}:user:{userId}                │
│  │  └─ Array<Permission>                          │
│  ├─ perms:{tenantId}:role:{roleName}              │
│  │  └─ Array<Permission>                          │
│  └─ perms:{tenantId}:user:{id}:resources:{type}   │
│     └─ Array<ResourceId>                          │
│                                                    │
│  DASHBOARDS (TTL: 10-15 minutes)                  │
│  ├─ dashboard:{tenantId}:executive                │
│  │  └─ {metrics for executives}                   │
│  ├─ dashboard:{tenantId}:employee:{id}            │
│  │  └─ {personal dashboard data}                  │
│  ├─ stats:{tenantId}:leaves                       │
│  │  └─ {leave statistics}                         │
│  └─ stats:{tenantId}:payroll:{month}              │
│     └─ {payroll metrics}                          │
│                                                    │
│  SESSIONS (TTL: 1 hour)                           │
│  ├─ session:{sessionId}                           │
│  │  └─ {user session data}                        │
│  └─ user:{userId}:session:{sessionId}             │
│     └─ {session metadata}                         │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 💾 S3 Backup Structure

```
S3 BUCKET: hrms-backups

hrms-backups/
├─ backups/
│  ├─ 2024/
│  │  ├─ 1/
│  │  │  ├─ backup_full_2024-01-01T02-00-00.sql.gz
│  │  │  ├─ backup_full_2024-01-02T02-00-00.sql.gz
│  │  │  └─ ... (30 daily backups)
│  │  ├─ 2/
│  │  │  └─ ... (30 daily backups)
│  │  └─ ...
│  │
│  └─ schemas/
│     ├─ tenant_acme_abc12345/
│     │  ├─ backup_schema_2024-01-01T15-30-00.sql.gz
│     │  └─ ... (on-demand backups)
│     │
│     └─ tenant_globex_def67890/
│        └─ ... (on-demand backups)
│
└─ archive/ (older backups, 31+ days old)
   └─ backup_full_2023-12-01T02-00-00.sql.gz.zip
```

---

## 🔄 Data Flow Diagrams

### Tenant Creation Flow

```
CREATE TENANT REQUEST
        │
        ▼
┌─────────────────────────┐
│  TenantManager          │
│  .createTenant()        │
└────────┬────────────────┘
         │
         ├──► 1. Insert into public.tenants
         │        └─ Get tenantId, schemaName
         │
         ├──► 2. CREATE SCHEMA {schemaName}
         │
         ├──► 3. MigrationRunner.runTenantMigrations()
         │        └─ CREATE all tables
         │
         ├──► 4. Initialize default data
         │        ├─ Leave types
         │        ├─ Designations
         │        └─ Departments
         │
         └──► 5. Return { tenantId, schemaName }
```

### Employee Creation Flow

```
CREATE EMPLOYEE REQUEST
        │
        ▼
    getTenantKnex(tenantId)
        │
        ├──► 1. Insert into users table
        │        └─ Create login account
        │
        ├──► 2. Insert into employees table
        │        └─ Link to user, department, designation
        │
        ├──► 3. Insert into employee_leave_balance
        │        └─ Initialize leave for each type
        │
        ├──► 4. Insert into audit_logs
        │        └─ Log employee creation
        │
        └──► 5. Invalidate cache
                 └─ org:{tenantId}:departments
```

### Leave Request Flow

```
REQUEST LEAVE
    │
    ├──► 1. Create LEAVES record (status=pending)
    │        └─ Calculate days_between
    │
    ├──► 2. Create APPROVALS task
    │        ├─ workflow_id
    │        ├─ assigned_to (manager)
    │        └─ status=pending
    │
    ├──► 3. Update AUDIT_LOGS
    │
    └──► Manager Views Dashboard
         │
         ├──► Query APPROVALS (assigned_to=manager, status=pending)
         │
         └──► Manager Approves
              │
              ├──► 1. Update LEAVES (status=approved)
              │
              ├──► 2. Update APPROVALS (status=approved)
              │
              ├──► 3. Update EMPLOYEE_LEAVE_BALANCE
              │        └─ Deduct from closing_balance
              │
              ├──► 4. Cache Invalidation
              │        └─ dashboard:{tenantId}:employee:{id}
              │
              └──► Send Notification
                   └─ Email/SMS to employee
```

### Payroll Processing Flow

```
PROCESS PAYROLL (Month)
        │
        ├──► 1. Get all EMPLOYEES (status=active)
        │
        ├──► 2. For each employee:
        │        │
        │        ├─► Get EMPLOYEE_SALARIES (current)
        │        │
        │        ├─► Get EMPLOYEE_LEAVE_BALANCE (approved leaves)
        │        │
        │        ├─► Calculate:
        │        │   ├─ days_worked
        │        │   ├─ days_absent
        │        │   ├─ gross_salary
        │        │   ├─ deductions
        │        │   └─ net_salary
        │        │
        │        └─► Insert PAYROLL (status=draft)
        │
        ├──► 3. Create APPROVALS for all draft payroll
        │        └─ assigned_to = payroll_approver
        │
        ├──► 4. Invalidate CACHE
        │        ├─ stats:{tenantId}:payroll:{month}
        │        └─ dashboard:{tenantId}:executive
        │
        └──► HR Approves Payroll
             │
             ├──► Update PAYROLL (status=approved)
             │
             └──► Process Payment
                  └─ Update PAYROLL (status=processed)
```

### Cache Hit Flow

```
REQUEST DATA (e.g., departments)
        │
        ├──► Check Redis Cache
        │    │
        │    ├─► CACHE HIT (org:{tenantId}:departments exists)
        │    │   └─► Return cached data (10-15ms)
        │    │
        │    └─► CACHE MISS (key doesn't exist)
        │        │
        │        ├──► Query PostgreSQL
        │        │    └─► fetch from database (50-200ms)
        │        │
        │        ├──► Store in Redis
        │        │    └─► set with TTL (3600s)
        │        │
        │        └─► Return data
        │
        └──► On Data Change
             │
             ├──► Update PostgreSQL
             │
             └──► Invalidate Cache
                  └─ DELETE org:{tenantId}:departments
                     (next request will re-fetch)
```

---

## 🔐 Multi-Tenancy Isolation Boundaries

```
┌────────────────────────────────────────────────────┐
│               ISOLATION BOUNDARIES                 │
├────────────────────────────────────────────────────┤
│                                                    │
│  1. DATABASE SCHEMA ISOLATION (STRONGEST)          │
│     ├─ Each tenant has separate PostgreSQL schema  │
│     ├─ No cross-schema queries possible            │
│     ├─ Physical separation at DB level             │
│     └─ Complete data isolation guaranteed          │
│                                                    │
│  2. TENANT ID ISOLATION (APPLICATION)              │
│     ├─ MongoDB documents filtered by tenantId      │
│     ├─ Cache keys namespaced: org:{tenantId}:...  │
│     ├─ Application-level check (secondary)         │
│     └─ Fallback if schema isolation fails          │
│                                                    │
│  3. NETWORK ISOLATION (INFRASTRUCTURE)             │
│     ├─ VPC security groups per tenant (optional)   │
│     ├─ IAM policies for resource access           │
│     └─ SSL/TLS encryption in transit              │
│                                                    │
│  4. BACKUP ISOLATION                               │
│     ├─ Schema-specific backups possible            │
│     ├─ Independent recovery per tenant             │
│     └─ Separate S3 prefixes                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

This visual guide complements the detailed documentation and shows the complete HRMS database architecture at a glance.
