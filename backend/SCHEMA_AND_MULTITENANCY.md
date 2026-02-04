# HRMS Database Architecture & Multi-Tenancy Design

## Overview

This document describes the comprehensive database architecture for the HRMS system, featuring multi-tenant isolation, PostgreSQL for structured data, MongoDB for unstructured data, and Redis caching for performance optimization.

## Table of Contents

1. [Multi-Tenancy Strategy](#multi-tenancy-strategy)
2. [PostgreSQL Architecture](#postgresql-architecture)
3. [MongoDB Architecture](#mongodb-architecture)
4. [Redis Caching Strategy](#redis-caching-strategy)
5. [Backup & Restore](#backup--restore)
6. [Deployment Guide](#deployment-guide)
7. [Performance Optimization](#performance-optimization)

---

## Multi-Tenancy Strategy

### Per-Schema Multi-Tenancy (PostgreSQL)

The system implements a **per-schema isolation strategy** for PostgreSQL:

- **Tenant Management**: Central `public.tenants` table stores all tenant metadata
- **Data Isolation**: Each tenant gets a dedicated PostgreSQL schema (e.g., `tenant_acme_abc12345`)
- **Complete Isolation**: No cross-tenant data access possible at database level
- **Flexibility**: Easy to migrate tenants, backup independently, or enforce different backup policies

### Tenant Lifecycle

```
1. Create Tenant
   ├─ Insert into public.tenants
   ├─ Create new schema
   ├─ Run tenant-specific migrations
   └─ Initialize default configurations

2. Tenant Operations
   ├─ Application routes tenant via middleware
   ├─ Connections switch schema via SET search_path
   └─ All queries run in tenant schema

3. Tenant Deletion
   ├─ Backup schema to S3
   ├─ Soft delete in public.tenants
   ├─ Drop schema (after retention period)
   └─ Cleanup MongoDB documents
```

### Multi-Tenancy Middleware

```typescript
// Applied to all routes
app.use((req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
  req.tenantId = tenantId;
  next();
});

// Connection per tenant
const knex = getKnexForTenant(tenantId);
```

---

## PostgreSQL Architecture

### Schema Structure

Each tenant schema contains these tables:

#### **Authentication & Users**

- `users` - User accounts, roles, authentication

#### **Organization Structure**

- `departments` - Organizational departments with hierarchy support
- `designations` - Job titles and positions

#### **Employee Management**

- `employees` - Core employee information
  - Personal details (name, DOB, contact)
  - Employment details (joining date, type, status)
  - Document references (PAN, Aadhaar, bank account)
  - Manager relationships (reporting hierarchy)

#### **Payroll**

- `salary_structures` - Salary templates per designation
- `employee_salaries` - Active salary for each employee
- `payroll` - Monthly payroll records with approval workflow

#### **Leave Management**

- `leave_types` - Leave type definitions (PTO, sick, casual, etc.)
- `employee_leave_balance` - Annual leave balance per type
- `leaves` - Leave requests with approval status

#### **Approvals & Workflows**

- `approval_workflows` - Define approval chains
- `approvals` - Individual approval tasks in workflow

#### **Audit & Compliance**

- `audit_logs` - All data changes for compliance
- `organization_settings` - Tenant-specific configurations

### Key Design Decisions

1. **UUID Primary Keys**: Globally unique, supports distributed systems
2. **Soft Deletes**: `deleted_at` column for data recovery
3. **Audit Logging**: Every change tracked in `audit_logs`
4. **JSON Fields**: For flexible configurations (allowances, deductions)
5. **Indexes**: Strategic indexes on frequently queried columns

### Example Tenant Schema Creation

```sql
-- Tenant metadata (public schema)
INSERT INTO tenants (id, name, slug, database_schema, admin_email)
VALUES ('uuid', 'ACME Corp', 'acme-corp', 'tenant_acme_abc12345', 'admin@acme.com');

-- Creates schema
CREATE SCHEMA tenant_acme_abc12345;

-- Switch to tenant schema
SET search_path TO tenant_acme_abc12345, public;

-- Run migrations in tenant schema
-- All subsequent queries in tenant schema
```

---

## MongoDB Architecture

### Collections

#### **1. AppraisalForm**

Stores employee performance appraisals with dynamic form responses.

```typescript
{
  _id: ObjectId,
  tenantId: "uuid",
  employeeId: "uuid",
  appraiserId: "uuid",
  appraisalPeriod: {
    startDate: Date,
    endDate: Date
  },
  template: {
    templateId: "uuid",
    templateName: "Annual Appraisal 2024",
    version: 1
  },
  responses: [
    {
      questionId: "q1",
      answer: 4,  // Can be text, number, boolean
      comments: "Excellent performance"
    }
  ],
  overallRating: 4.5,
  strengths: ["Leadership", "Problem-solving"],
  areasForImprovement: ["Documentation"],
  status: "approved",
  submittedAt: Date,
  reviewedBy: "uuid",
  reviewedAt: Date,
  approvedBy: "uuid",
  approvedAt: Date,
  comments: [
    {
      userId: "uuid",
      text: "Great work!",
      createdAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Advantages**:

- Dynamic form fields without schema changes
- Comments thread per form
- Version tracking of templates
- Flexible rating scales

#### **2. DocumentMetadata**

Tracks document uploads with S3 storage metadata.

```typescript
{
  _id: ObjectId,
  tenantId: "uuid",
  employeeId: "uuid",
  documentType: "offer_letter",
  fileName: "offer_letter_john.pdf",
  fileSize: 245000,
  mimeType: "application/pdf",
  s3Key: "documents/tenant_id/employee_id/offer_letter.pdf",
  s3Url: "https://s3.amazonaws.com/...",
  documentNumber: "OL-2024-001",
  issueDate: Date,
  expiryDate: Date,
  status: "active",
  verificationStatus: "verified",
  verifiedBy: "uuid",
  verifiedAt: Date,
  tags: ["payroll", "hr-documents"],
  uploadedBy: "uuid",
  uploadedAt: Date,
  lastAccessedAt: Date,
  accessLog: [
    {
      userId: "uuid",
      timestamp: Date
    }
  ],
  retentionPolicy: {
    deleteAfter: Date,
    archiveAfter: Date,
    requiresApprovalForDeletion: true
  },
  metadata: {
    department: "Engineering",
    position: "Senior Developer"
  }
}
```

**Advantages**:

- S3 integration for documents
- Access logging for compliance
- Auto-deletion with TTL index
- Rich search with tags and metadata

#### **3. TenantSettings**

Dynamic, versioned configuration management.

```typescript
{
  _id: ObjectId,
  tenantId: "uuid",
  category: "payroll",
  settings: {
    paymentMethod: "bank_transfer",
    paymentFrequency: "monthly",
    ctcComponents: {
      baseSalary: 60,
      hra: 15,
      da: 20,
      allowances: 5
    }
  },
  version: 2,
  isActive: true,
  validFrom: Date,
  validUntil: null,
  approvedBy: "uuid",
  approvedAt: Date
}
```

#### **4. FeatureFlag**

Feature toggles for gradual rollout.

```typescript
{
  _id: ObjectId,
  tenantId: "uuid",
  featureName: "advanced_appraisal",
  enabled: true,
  rolloutPercentage: 75,  // 75% of users see this feature
  config: {
    allowCustomTemplates: true,
    maxReviewers: 3
  },
  validFrom: Date,
  validUntil: Date
}
```

#### **5. SettingsAudit**

Audit trail for all configuration changes.

```typescript
{
  _id: ObjectId,
  tenantId: "uuid",
  category: "payroll",
  action: "update",
  changes: {
    before: { paymentFrequency: "weekly" },
    after: { paymentFrequency: "monthly" }
  },
  changedBy: "uuid",
  reason: "Policy update Q1 2024",
  createdAt: Date
}
```

### Indexing Strategy

```typescript
// AppraisalForm indexes
db.appraisalforms.createIndex({ tenantId: 1, employeeId: 1 });
db.appraisalforms.createIndex({ tenantId: 1, status: 1 });
db.appraisalforms.createIndex({ tenantId: 1, appraisalPeriod: 1 });

// DocumentMetadata indexes
db.documentmetadatas.createIndex({ tenantId: 1, employeeId: 1 });
db.documentmetadatas.createIndex({ s3Key: 1 }, { unique: true });
db.documentmetadatas.createIndex({ 'retentionPolicy.deleteAfter': 1 }, { expireAfterSeconds: 0 });

// TenantSettings indexes
db.tenantsettings.createIndex({ tenantId: 1, category: 1 });
db.tenantsettings.createIndex({ tenantId: 1, isActive: 1, category: 1 });

// FeatureFlag indexes
db.featureflags.createIndex({ tenantId: 1, featureName: 1 }, { unique: true });
```

---

## Redis Caching Strategy

### Cache Hierarchy

```
1. Application Request
   ├─ Check Redis Cache
   ├─ If hit: Return cached data
   └─ If miss: Query DB → Update Cache → Return

2. Cache Key Patterns
   ├─ org:{tenantId}:departments - Organization structure
   ├─ org:{tenantId}:designations - Job titles
   ├─ perms:{tenantId}:user:{userId} - User permissions
   ├─ perms:{tenantId}:role:{roleName} - Role permissions
   ├─ dashboard:{tenantId}:executive - Executive dashboard
   ├─ dashboard:{tenantId}:employee:{id} - Employee dashboard
   └─ stats:{tenantId}:payroll:{month} - Payroll statistics
```

### Cache TTLs

| Data Type     | TTL       | Reason                     |
| ------------- | --------- | -------------------------- |
| Org Structure | 1 hour    | Changes infrequently       |
| Permissions   | 30 min    | Security-sensitive         |
| Dashboards    | 10-15 min | Should be relatively fresh |
| Statistics    | 30 min    | Balance freshness & load   |
| Payroll Data  | 1 hour    | Stable during month        |

### Cache Invalidation

```typescript
// When employee data changes
await cacheService.getOrganizationCache().invalidateDepartments(tenantId);

// When permissions change
await cacheService.getPermissionsCache().invalidateTenantPermissions(tenantId);

// When payroll is updated
await cacheService.getDashboardCache().invalidatePayrollStats(tenantId);
```

### Usage Examples

#### Cache Organization Structure

```typescript
// Get or fetch departments
let departments = await cacheService.getOrganizationCache().getDepartments(tenantId);
if (!departments) {
  departments = await db('departments').select('*');
  await cacheService.getOrganizationCache().cacheDepartments(tenantId, departments);
}
```

#### Cache User Permissions

```typescript
// Get or compute user permissions
let permissions = await cacheService.getPermissionsCache().getUserPermissions(tenantId, userId);
if (!permissions) {
  permissions = await computeUserPermissions(userId, tenantId);
  await cacheService.getPermissionsCache().cacheUserPermissions(tenantId, userId, permissions);
}
```

#### Cache Dashboard Metrics

```typescript
// Executive dashboard
let metrics = await cacheService.getDashboardCache().getExecutiveDashboard(tenantId);
if (!metrics) {
  metrics = await computeExecutiveMetrics(tenantId);
  await cacheService.getDashboardCache().cacheExecutiveDashboard(tenantId, metrics);
}
```

---

## Backup & Restore

### Backup Strategy

#### Full Database Backup

- **Frequency**: Daily (off-peak hours)
- **Retention**: 30 days
- **Storage**: AWS S3 with versioning enabled
- **Compression**: gzip for cost optimization

#### Schema-Specific Backup

- **Frequency**: Before critical operations
- **Retention**: Configurable per tenant
- **Use Case**: Tenant migration, isolated recovery

### Backup Execution

```typescript
const backupManager = new DatabaseBackupManager({
  dbName: 'hrms',
  dbUser: 'postgres',
  dbHost: 'rds.amazonaws.com',
  dbPort: 5432,
  s3Bucket: 'hrms-backups',
  s3Region: 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY,
  awsSecretAccessKey: process.env.AWS_SECRET_KEY,
  retentionDays: 30,
});

// Full backup
const fullBackup = await backupManager.createFullBackup();
// Output: { filename: 'backup_full_2024-01-01...sql.gz', s3Key: 'backups/2024/1/...' }

// Schema backup (tenant-specific)
const schemaBackup = await backupManager.createSchemaBackup('tenant_acme_abc12345');

// Cleanup old backups
await backupManager.cleanupOldBackups();
```

### Restore Operations

```typescript
const restoreManager = new DatabaseRestoreManager({
  dbName: 'hrms',
  dbUser: 'postgres',
  dbHost: 'rds.amazonaws.com',
  dbPort: 5432,
  s3Bucket: 'hrms-backups',
  s3Region: 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY,
  awsSecretAccessKey: process.env.AWS_SECRET_KEY,
});

// Full database restore
await restoreManager.restoreFullDatabase('backups/2024/1/backup_full_...sql.gz');

// Schema restore
await restoreManager.restoreSchema(
  'backups/schemas/tenant_acme_abc12345/...',
  'tenant_acme_abc12345'
);

// Validate backup before restore
const isValid = await restoreManager.validateBackup(s3Key);
```

### Backup Schedule (Recommended)

```bash
# Daily full backup at 2 AM UTC
0 2 * * * /app/scripts/backup-full.sh

# Hourly schema backups for critical tenants
0 * * * * /app/scripts/backup-schema.sh --tenant=critical-tenant

# Weekly cleanup
0 3 * * 0 /app/scripts/cleanup-old-backups.sh
```

---

## Deployment Guide

### Prerequisites

- PostgreSQL 14+
- MongoDB 5.0+
- Redis 6.0+
- Node.js 18+
- AWS credentials for S3

### Environment Variables

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:pass@rds.amazonaws.com:5432/hrms
DATABASE_HOST=rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=xxxxx
DATABASE_NAME=hrms

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hrms
MONGODB_DB_NAME=hrms

# Redis
REDIS_HOST=redis.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=xxxxx

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
S3_BACKUP_BUCKET=hrms-backups

# Multi-tenancy
TENANT_SCHEMA=tenant_default
```

### Database Setup

```bash
# 1. Create main database
createdb -U postgres hrms

# 2. Run migrations
npm run migrate:up

# 3. Create first tenant
npm run cli -- create-tenant \
  --name "ACME Corporation" \
  --slug "acme" \
  --email "admin@acme.com"

# 4. Verify tenant
npm run cli -- list-tenants
```

### Tenant Provisioning Workflow

```typescript
// 1. Create tenant
const { tenantId, schemaName } = await tenantManager.createTenant({
  name: 'ACME Corporation',
  slug: 'acme-corp',
  adminEmail: 'admin@acme.com',
  description: 'Manufacturing company',
});

// 2. Create admin user
await db(schemaName)
  .table('users')
  .insert({
    id: uuidv4(),
    email: 'admin@acme.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'admin',
    password_hash: hashPassword('initial_password'),
    is_active: true,
  });

// 3. Enable features
await tenantManager.setFeature(tenantId, 'payroll', true, {
  paymentMethod: 'bank_transfer',
  frequency: 'monthly',
});

// 4. Setup default settings in MongoDB
await TenantSettings.create({
  tenantId,
  category: 'general',
  settings: {
    organizationName: 'ACME Corporation',
    country: 'US',
    currency: 'USD',
  },
});
```

---

## Performance Optimization

### Query Optimization

1. **Index Strategy**

   ```sql
   -- Critical indexes
   CREATE INDEX idx_employees_dept ON employees(department_id);
   CREATE INDEX idx_employees_status ON employees(status);
   CREATE INDEX idx_payroll_month ON payroll(month);
   CREATE INDEX idx_leaves_emp_status ON leaves(employee_id, status);
   ```

2. **Connection Pooling**

   ```typescript
   const knex = require('knex')({
     client: 'pg',
     connection: {
       // RDS endpoint
       host: process.env.DATABASE_HOST,
       pool: {
         min: 2,
         max: 10,
         acquireTimeoutMillis: 30000,
         idleTimeoutMillis: 30000,
         reapIntervalMillis: 1000,
       },
     },
   });
   ```

3. **Query Analysis**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM employees WHERE department_id = $1;
   ```

### Caching Best Practices

1. **Cache-Aside Pattern**

   ```typescript
   async function getDepartment(id) {
     const cached = await cache.get(`dept:${id}`);
     if (cached) return cached;

     const data = await db.query(...);
     await cache.set(`dept:${id}`, data, 3600);
     return data;
   }
   ```

2. **Write-Through Pattern**
   ```typescript
   async function updateDepartment(id, data) {
     await db.update(...);
     await cache.delete(`dept:${id}`); // Invalidate
     return data;
   }
   ```

### Scaling Considerations

1. **Horizontal Scaling**
   - Application servers: Stateless design
   - Database: Read replicas with read-only connections
   - Redis: Cluster mode for high availability

2. **Tenant Isolation Performance**
   - Per-tenant connections don't scale linearly
   - Use connection pooling with tenant-aware routing
   - Consider schema sharding for > 10,000 tenants

3. **Monitoring**
   ```typescript
   // Monitor slow queries
   SELECT query, calls, mean_time FROM pg_stat_statements
   WHERE mean_time > 1000 ORDER BY mean_time DESC;
   ```

---

## Disaster Recovery

### Recovery Time Objectives (RTO)

| Scenario              | RTO    | RPO       |
| --------------------- | ------ | --------- |
| Full DB recovery      | 1 hour | 1 hour    |
| Single tenant restore | 15 min | 1 hour    |
| Data point recovery   | 5 min  | Real-time |

### Recovery Procedures

1. **Complete Database Failure**

   ```bash
   # Restore from latest backup
   npm run cli -- restore-db --backup=s3://backups/latest.sql.gz
   ```

2. **Tenant-Specific Failure**

   ```bash
   # Restore specific tenant schema
   npm run cli -- restore-schema \
     --tenant=acme-corp \
     --backup=s3://backups/schemas/tenant_acme_abc/latest.sql.gz
   ```

3. **Point-in-Time Recovery**
   - Use AWS RDS automated backups (35-day retention)
   - Request restore to specific timestamp

---

## Maintenance

### Regular Tasks

```bash
# Weekly: VACUUM and ANALYZE
VACUUM ANALYZE;

# Monthly: Check index usage
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;

# Monthly: Backup integrity check
npm run cli -- verify-backups

# Quarterly: Archive old audit logs
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

### Monitoring Alerts

- Database CPU > 80% for 5 minutes
- Disk usage > 85%
- Connection pool exhaustion
- Backup failure
- Redis connection loss
- Replication lag > 1 second

---

## Conclusion

This architecture provides:

✅ **Complete tenant isolation** via per-schema strategy
✅ **Flexible data modeling** with Postgres + MongoDB hybrid
✅ **High performance** with Redis caching layer
✅ **Data protection** with automated backups to S3
✅ **Compliance ready** with comprehensive audit logging
✅ **Scalability** for thousands of tenants

For questions or issues, refer to the implementation files or contact the DevOps team.
