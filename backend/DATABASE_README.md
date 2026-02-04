# HRMS Database Architecture - Complete Implementation Guide

## Overview

This repository contains a production-ready HRMS (Human Resource Management System) with:

✅ **Multi-tenant PostgreSQL** with per-schema isolation  
✅ **MongoDB** for unstructured data (appraisals, documents, settings)  
✅ **Redis** caching layer for high-performance data access  
✅ **S3 backups** with automated restore capabilities  
✅ **Complete audit logging** for compliance  
✅ **Feature flags** for gradual rollout

## Quick Start

### 1. Prerequisites

```bash
# Required
- Node.js 18+
- PostgreSQL 14+
- MongoDB 5.0+
- Redis 6.0+
- AWS Account (for S3 backups)

# Install Node dependencies
npm install
npm install --save-dev ts-node typescript
```

### 2. Environment Setup

```bash
# Copy and configure
cp CONFIG.env.template .env

# Edit with your values
nano .env
```

Key configuration:

- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` - Redis endpoint
- `AWS_*` - AWS credentials for S3

### 3. Initialize Database

```bash
# Create PostgreSQL databases
npm run db:create

# Run migrations
npm run migrate:up

# Create first tenant
npm run cli -- create-tenant \
  --name "Your Company" \
  --slug "your-company" \
  --email "admin@yourcompany.com"

# Verify setup
npm run db:health-check
```

## Project Structure

```
backend/
├── src/
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_create_tenants.ts
│   │   │   └── 002_create_tenant_schema.ts
│   │   ├── tenantManager.ts          # Multi-tenancy coordinator
│   │   └── MigrationRunner.ts        # Migration executor
│   │
│   ├── models/
│   │   └── mongo/
│   │       ├── AppraisalForm.ts      # Performance appraisals
│   │       ├── DocumentMetadata.ts   # Document tracking
│   │       └── TenantSettings.ts     # Settings & features
│   │
│   ├── cache/
│   │   ├── RedisCacheManager.ts      # Base cache layer
│   │   ├── OrganizationCacheManager.ts # Org structure caching
│   │   ├── PermissionsCacheManager.ts  # RBAC caching
│   │   ├── DashboardCacheManager.ts    # Analytics caching
│   │   └── CacheService.ts           # Unified cache service
│   │
│   ├── backup/
│   │   ├── DatabaseBackupManager.ts  # RDS → S3 backups
│   │   └── DatabaseRestoreManager.ts # S3 → RDS restore
│   │
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   └── middleware/
│
├── SCHEMA_AND_MULTITENANCY.md    # Architecture deep-dive
├── DATABASE_USAGE_GUIDE.md        # Code examples
├── SQL_REFERENCE.md               # SQL queries
└── CONFIG.env.template            # Configuration template
```

## Database Architecture

### PostgreSQL Schema

**Tenant Metadata** (public schema):

```
tenants              - Tenant organizations
tenant_features      - Feature flags per tenant
tenant_audit         - Change tracking
```

**Per-Tenant Schemas** (e.g., `tenant_acme_abc12345`):

```
users                - Authentication
departments          - Organization structure
designations         - Job titles
employees            - Employee records
employee_salaries    - Salary configurations
salary_structures    - Salary templates
payroll              - Monthly payroll records
leave_types          - Leave type definitions
leaves               - Leave requests
employee_leave_balance - Annual leave balance
approval_workflows   - Approval process definitions
approvals            - Individual approval tasks
audit_logs           - All data changes
organization_settings - Tenant configurations
```

### MongoDB Collections

```
AppraisalForm        - Performance appraisal forms with dynamic fields
DocumentMetadata     - Document upload tracking with S3 metadata
TenantSettings       - Versioned tenant configurations
FeatureFlag          - Feature toggles with rollout percentages
SettingsAudit        - Configuration change history
```

### Redis Cache Keys

```
org:{tenantId}:departments           - Department list
org:{tenantId}:designations          - Job titles
org:{tenantId}:hierarchy             - Org tree structure
perms:{tenantId}:user:{userId}       - User permissions
perms:{tenantId}:role:{roleName}     - Role permissions
dashboard:{tenantId}:executive       - Executive metrics
dashboard:{tenantId}:employee:{id}   - Employee dashboard
stats:{tenantId}:payroll:{month}     - Payroll statistics
```

## Multi-Tenancy Strategy

### Per-Schema Isolation

Each tenant gets a dedicated PostgreSQL schema:

```
Tenant 1: schema tenant_acme_abc12345
  ├─ All employees
  ├─ All payroll records
  ├─ All leaves
  └─ Isolated data at DB level

Tenant 2: schema tenant_globex_def67890
  ├─ All employees
  ├─ All payroll records
  ├─ All leaves
  └─ Isolated data at DB level
```

**Benefits:**

- Complete data isolation at database level
- Easy per-tenant backups
- Different compliance policies per tenant
- Simple tenant migration
- No risk of cross-tenant data leaks

### Connecting to Tenant

```typescript
// Get tenant schema
const tenant = await tenantManager.getTenant(tenantId);

// Create connection for tenant schema
const tenantKnex = getKnexForTenant(tenant.database_schema);

// All queries run in tenant schema
const employees = await tenantKnex('employees').select('*');
```

## Caching Strategy

### Cache Layers

```
1. Request → Redis Cache (10-15ms)
              ↓ (miss)
2. Redis Cache → PostgreSQL (50-200ms)
                 ↓ (hit on subsequent requests)
3. Results cached in Redis
```

### Cache TTLs

| Data          | TTL       | Reason                   |
| ------------- | --------- | ------------------------ |
| Org structure | 1 hour    | Changes infrequently     |
| Permissions   | 30 min    | Security-sensitive       |
| Dashboards    | 10-15 min | Should be fresh          |
| Statistics    | 30 min    | Balance load & freshness |

### Cache Invalidation

```typescript
// When employee joins
await cacheService.getOrganizationCache().invalidateDepartments(tenantId);

// When permissions change
await cacheService.getPermissionsCache().invalidateTenantPermissions(tenantId);

// When payroll updates
await cacheService.getDashboardCache().invalidatePayrollStats(tenantId);
```

## Backup & Restore

### Automated Backups

```bash
# Run daily backup (scheduled in cron)
npm run backup:full

# Schema-specific backup
npm run backup:schema --tenant=acme-corp

# List backups
npm run backup:list

# Cleanup old backups (30-day retention)
npm run backup:cleanup
```

### Backup to S3

```
s3://hrms-backups/
├── backups/2024/1/backup_full_2024-01-01T02-00-00.sql.gz
├── backups/2024/1/backup_full_2024-01-02T02-00-00.sql.gz
└── backups/schemas/
    ├── tenant_acme_abc12345/backup_schema_2024-01-01T15-30-00.sql.gz
    └── tenant_globex_def/backup_schema_2024-01-01T15-30-00.sql.gz
```

### Restore Process

```typescript
// Validate backup integrity
const isValid = await restoreManager.validateBackup(s3Key);

// Restore full database
await restoreManager.restoreFullDatabase(s3Key);

// Restore specific tenant
await restoreManager.restoreSchema(s3Key, 'tenant_acme_abc12345');
```

## Common Operations

### Create New Tenant

```typescript
const { tenantId, schemaName } = await tenantManager.createTenant({
  name: 'ACME Corporation',
  slug: 'acme-corp',
  adminEmail: 'admin@acme.com',
  description: 'Manufacturing company',
  settings: {
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
  },
});

console.log(`Tenant created: ${tenantId}`);
console.log(`Schema: ${schemaName}`);
```

### Add Employee

```typescript
const { employeeId } = await createEmployee(tenantId, {
  email: 'john.doe@acme.com',
  firstName: 'John',
  lastName: 'Doe',
  departmentId: dept_id,
  designationId: desig_id,
  dateOfJoining: new Date('2024-01-01'),
  phone: '+1-555-0123',
  pan: 'ABCDE1234F',
  aadhaar: '1234-5678-9012',
});

// Initialize leave balance
await initializeLeaveBalance(tenantId, employeeId);
```

### Process Payroll

```typescript
// Process payroll for month
await processPayroll(tenantId, '2024-01');

// Creates draft payroll records
// Initiates approval workflow
// Updates statistics cache

// Approve payroll
await approvePayroll(tenantId, payrollId, approverId);

// Mark as processed
await markPayrollProcessed(tenantId, payrollId);
```

### Submit Leave Request

```typescript
const leaveId = await requestLeave(tenantId, employeeId, {
  leaveTypeId: leave_type_id,
  startDate: new Date('2024-02-05'),
  endDate: new Date('2024-02-09'),
  reason: 'Personal time off',
});

// Creates approval task for manager
// Updates leave balance (pending)

// Manager approves
await approveLeave(tenantId, leaveId, managerId, true);

// Updates leave balance (approved)
// Deducts from annual balance
```

## Monitoring & Health

### Database Health

```bash
# Check all databases
npm run health:db

# Output:
# ✓ PostgreSQL: connected (52 connections)
# ✓ MongoDB: connected (5 sessions)
# ✓ Redis: connected (ping 2ms)
```

### Tenant Status

```bash
# List all tenants
npm run cli -- list-tenants

# Check tenant health
npm run cli -- check-tenant --id=tenant-id

# Output:
# Tenant: ACME Corporation (acme-corp)
# Status: active
# Schema: tenant_acme_abc12345
# Created: 2024-01-01
# Employees: 145
# Last activity: 2 minutes ago
```

### Performance Metrics

```sql
-- Slow queries
SELECT query, calls, mean_time FROM pg_stat_statements
WHERE mean_time > 1000 ORDER BY mean_time DESC LIMIT 10;

-- Index usage
SELECT indexname, idx_scan FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Cache hit ratio
SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

## Troubleshooting

### Common Issues

**Tenant creation fails**

```bash
# Check schema creation permissions
psql -c "CREATE SCHEMA test_schema;"

# Check tenant manager logs
LOG_LEVEL=debug npm start
```

**Slow queries**

```sql
-- Find missing indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM employees WHERE department_id = $1;

-- Run VACUUM
VACUUM ANALYZE employees;
```

**Cache inconsistency**

```typescript
// Flush entire cache (be careful!)
await cacheService.getRedisCache().flushAll();

// Or specific tenant cache
await cacheService.getOrganizationCache().invalidateTenantPermissions(tenantId);
```

**Backup issues**

```bash
# List backups in S3
aws s3 ls s3://hrms-backups/ --recursive

# Validate backup
npm run backup:validate --s3-key=backups/2024/1/backup_full_...sql.gz

# Test restore in staging
npm run backup:restore --s3-key=... --target=staging
```

## Performance Optimization

### Database Optimization

```bash
# Create indexes
npm run db:create-indexes

# Analyze tables
npm run db:analyze

# Vacuum databases
npm run db:vacuum
```

### Caching Strategy

```typescript
// Cache organization structure on app startup
async function preloadCache() {
  for (const tenant of tenants) {
    const departments = await db.getDepartments(tenant.id);
    await cache.cacheDepartments(tenant.id, departments, 3600);

    const designations = await db.getDesignations(tenant.id);
    await cache.cacheDesignations(tenant.id, designations, 3600);
  }
}

app.on('ready', preloadCache);
```

### Connection Pooling

```typescript
const knex = require('knex')({
  client: 'pg',
  connection: {
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

## Deployment

### Production Checklist

- [ ] RDS with Multi-AZ enabled
- [ ] PostgreSQL 14+ with SSL
- [ ] MongoDB Atlas or self-managed with replication
- [ ] ElastiCache Redis in cluster mode
- [ ] S3 bucket with versioning & encryption
- [ ] Daily automated backups enabled
- [ ] CloudWatch monitoring configured
- [ ] Sentry error tracking setup
- [ ] Application load balancer
- [ ] Auto-scaling groups configured
- [ ] VPC and security groups locked down
- [ ] Secrets manager for credentials

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production

CMD ["npm", "start"]
```

```bash
# Build
docker build -t hrms-api .

# Run
docker run -e DATABASE_URL=... -e MONGODB_URI=... hrms-api
```

## Documentation Files

| File                                                     | Purpose                                  |
| -------------------------------------------------------- | ---------------------------------------- |
| [SCHEMA_AND_MULTITENANCY.md](SCHEMA_AND_MULTITENANCY.md) | Complete architecture & design decisions |
| [DATABASE_USAGE_GUIDE.md](DATABASE_USAGE_GUIDE.md)       | Code examples for all operations         |
| [SQL_REFERENCE.md](SQL_REFERENCE.md)                     | SQL queries & administration             |
| [CONFIG.env.template](CONFIG.env.template)               | Environment configuration                |

## Support & Contact

For issues or questions:

1. Check [SQL_REFERENCE.md](SQL_REFERENCE.md) for common queries
2. Review [DATABASE_USAGE_GUIDE.md](DATABASE_USAGE_GUIDE.md) for code examples
3. See [SCHEMA_AND_MULTITENANCY.md](SCHEMA_AND_MULTITENANCY.md) for architecture details
4. Check logs: `LOG_LEVEL=debug npm start`

## License

Copyright 2024 - All Rights Reserved

---

## Summary

This HRMS system provides:

✅ **Enterprise-grade multi-tenancy** with per-schema isolation  
✅ **Hybrid database approach** (PostgreSQL + MongoDB + Redis)  
✅ **Automated backup & disaster recovery** to S3  
✅ **High-performance caching** layer  
✅ **Comprehensive audit logging** for compliance  
✅ **Feature flags** for gradual rollout  
✅ **Production-ready** with monitoring & observability

Ready to deploy and scale to thousands of tenants!
