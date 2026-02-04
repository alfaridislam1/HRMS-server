# HRMS Database - Developer Quick Reference

Fast lookup guide for common development tasks.

## Table of Contents

- [Setting Up Your Environment](#setting-up-your-environment)
- [Common Commands](#common-commands)
- [Working with Tenants](#working-with-tenants)
- [Database Queries](#database-queries)
- [Caching](#caching)
- [Troubleshooting](#troubleshooting)

---

## Setting Up Your Environment

### 1. Install Dependencies

```bash
npm install knex pg mongoose redis ioredis aws-sdk bcrypt uuid
npm install --save-dev typescript ts-node @types/node
```

### 2. Configure Environment

```bash
cp CONFIG.env.template .env

# Edit .env with your values
# Required:
# - DATABASE_URL
# - MONGODB_URI
# - REDIS_HOST
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
```

### 3. Initialize Databases

```bash
# Create database
createdb hrms

# Run migrations
npx knex migrate:latest

# Create first tenant
npm run script -- tenants/create-tenant.js \
  --name "Test Company" \
  --slug "test-co" \
  --email "admin@test.co"
```

---

## Common Commands

### Development

```bash
# Start dev server
npm run dev

# Run migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:rollback

# Create new migration
npm run db:migrate:make --name=add_field_to_employees
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific file
npm test src/services/employeeService.test.ts

# Run with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration
```

### Database Operations

```bash
# Backup database
npm run backup:full

# List backups
npm run backup:list

# Restore from backup
npm run backup:restore --s3-key=backups/2024/1/backup_full_....sql.gz

# Database health check
npm run health:db

# View tenant status
npm run cli -- status-tenant --id=tenant-id
```

---

## Working with Tenants

### Get Tenant Manager

```typescript
import { TenantManager } from './database/tenantManager';
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

const tenantManager = new TenantManager(db);
```

### Create Tenant

```typescript
const { tenantId, schemaName } = await tenantManager.createTenant({
  name: 'ACME Corp',
  slug: 'acme-corp',
  adminEmail: 'admin@acme.com',
  description: 'Manufacturing company',
  settings: {
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
  },
});

console.log(`Created tenant: ${tenantId} in schema: ${schemaName}`);
```

### Get Tenant Info

```typescript
// By ID
const tenant = await tenantManager.getTenant(tenantId);

// By slug
const tenant = await tenantManager.getTenantBySlug('acme-corp');

// List all active tenants
const tenants = await tenantManager.listTenants('active');

console.log(tenant.name); // 'ACME Corp'
console.log(tenant.database_schema); // 'tenant_acme_abc12345'
```

### Enable Features

```typescript
// Enable payroll feature
await tenantManager.setFeature(tenantId, 'payroll', true, {
  paymentMethod: 'bank_transfer',
  paymentFrequency: 'monthly',
  ctc: {
    baseSalary: 60,
    hra: 15,
    da: 20,
    allowances: 5,
  },
});

// Check if enabled
const enabled = await tenantManager.isFeatureEnabled(tenantId, 'payroll');

// Get feature config
const config = await tenantManager.getFeatureConfig(tenantId, 'payroll');
```

### Connect to Tenant Database

```typescript
function getTenantKnex(tenantId: string) {
  const tenant = await tenantManager.getTenant(tenantId);

  return knex({
    client: 'pg',
    connection: {
      ...url.parse(process.env.DATABASE_URL),
      search_path: `"${tenant.database_schema}", public`,
    },
  });
}

// Usage
const db = getTenantKnex(tenantId);
const employees = await db('employees').select('*');
```

---

## Database Queries

### Quick Query Examples

#### List All Employees

```typescript
const db = getTenantKnex(tenantId);

const employees = await db('employees')
  .join('users', 'employees.user_id', '=', 'users.id')
  .join('departments', 'employees.department_id', '=', 'departments.id')
  .select(
    'employees.id',
    'employees.employee_code',
    'users.first_name',
    'users.last_name',
    'users.email',
    'departments.name as department',
    'employees.status'
  )
  .where('employees.status', '=', 'active')
  .orderBy('employees.employee_code');

console.log(`Found ${employees.length} employees`);
```

#### Get Employee with Salary

```typescript
const employee = await db('employees')
  .join('users', 'employees.user_id', '=', 'users.id')
  .join('employee_salaries', 'employees.id', '=', 'employee_salaries.employee_id')
  .select('*')
  .where('employees.id', tenantId)
  .where('employee_salaries.effective_to', null)
  .first();

console.log(`${employee.first_name} salary: ${employee.base_salary}`);
```

#### Count by Department

```typescript
const counts = await db('employees')
  .join('departments', 'employees.department_id', '=', 'departments.id')
  .select('departments.name', db.raw('count(*) as employee_count'))
  .where('employees.status', 'active')
  .groupBy('departments.id', 'departments.name')
  .orderBy('employee_count', 'desc');

counts.forEach((row) => {
  console.log(`${row.name}: ${row.employee_count} employees`);
});
```

#### Get Leave Balance

```typescript
const balance = await db('employee_leave_balance')
  .join('leave_types', 'employee_leave_balance.leave_type_id', '=', 'leave_types.id')
  .select(
    'leave_types.name',
    'employee_leave_balance.opening_balance',
    'employee_leave_balance.leaves_approved',
    'employee_leave_balance.closing_balance'
  )
  .where('employee_leave_balance.employee_id', employeeId)
  .where('employee_leave_balance.year', new Date().getFullYear());

balance.forEach((row) => {
  const available = row.opening_balance - row.leaves_approved;
  console.log(`${row.name}: ${available} days available`);
});
```

#### Check Pending Approvals

```typescript
const pending = await db('approvals')
  .join('leaves', 'approvals.entity_id', '=', 'leaves.id')
  .join('employees', 'leaves.employee_id', '=', 'employees.id')
  .join('users', 'employees.user_id', '=', 'users.id')
  .select(
    'approvals.id',
    'employees.employee_code',
    db.raw("users.first_name || ' ' || users.last_name as employee_name"),
    'leaves.start_date',
    'leaves.end_date',
    'leaves.number_of_days',
    'leaves.reason'
  )
  .where('approvals.status', 'pending')
  .where('approvals.assigned_to', managerId)
  .orderBy('leaves.created_at', 'asc');

console.log(`Manager has ${pending.length} pending approvals`);
```

---

## Caching

### Get Cache Service

```typescript
import { CacheService } from './cache/CacheService';

const cache = CacheService.getInstance();
```

### Cache Organization Data

```typescript
const orgCache = cache.getOrganizationCache();

// Get departments with caching
let departments = await orgCache.getDepartments(tenantId);
if (!departments) {
  const db = getTenantKnex(tenantId);
  departments = await db('departments').select('*').where('status', 'active');
  await orgCache.cacheDepartments(tenantId, departments, 3600);
}

// Invalidate when departments change
await orgCache.invalidateDepartments(tenantId);
```

### Cache Permissions

```typescript
const permCache = cache.getPermissionsCache();

// Check if user has permission
let has = await permCache.hasPermission(tenantId, userId, 'view:payroll');
if (has === null) {
  // Not cached
  const perms = await computeUserPermissions(userId);
  await permCache.cacheUserPermissions(tenantId, userId, perms, 1800);
  has = perms.includes('view:payroll');
}

console.log(`User ${has ? 'has' : 'does not have'} permission`);
```

### Cache Dashboards

```typescript
const dashCache = cache.getDashboardCache();

// Get executive dashboard
let metrics = await dashCache.getExecutiveDashboard(tenantId);
if (!metrics) {
  metrics = await computeExecutiveMetrics(tenantId);
  await dashCache.cacheExecutiveDashboard(tenantId, metrics, 900);
}

console.log(`Total employees: ${metrics.totalEmployees}`);
```

### Clear Cache

```typescript
// Clear specific cache
await cache.getOrganizationCache().invalidateDepartments(tenantId);

// Clear all dashboards for tenant
await cache.getDashboardCache().invalidateAllDashboards(tenantId);

// Clear entire Redis (be careful!)
await cache.getRedisCache().flushAll();
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;"

# Test MongoDB connection
npm run script -- test-mongo.js

# Test Redis connection
redis-cli -h $REDIS_HOST ping
```

### Slow Queries

```sql
-- Find slow queries (> 1 second)
SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;

-- Explain slow query
EXPLAIN ANALYZE SELECT * FROM employees WHERE department_id = $1;

-- Get missing indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

### Cache Issues

```typescript
// Check if Redis is connected
const cache = CacheService.getInstance();
const isHealthy = await cache.healthCheck();
console.log(`Redis healthy: ${isHealthy}`);

// Get cache value
const value = await cache.getRedisCache().get('some:key');
console.log(`Cached value: ${value}`);

// Clear specific key
await cache.getRedisCache().delete('some:key');
```

### Tenant-Specific Issues

```typescript
// Check tenant schema exists
const tenant = await tenantManager.getTenant(tenantId);
const schemaName = tenant.database_schema;

// Verify schema exists
const exists = await db.raw(
  `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?`,
  [schemaName]
);

if (!exists.rows.length) {
  console.error(`Schema ${schemaName} does not exist!`);
}

// Check tables in schema
const tables = await db.raw(
  `
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = ?
`,
  [schemaName]
);

console.log(`Schema contains ${tables.rows.length} tables`);
```

### Backup Issues

```bash
# List all backups
aws s3 ls s3://hrms-backups/ --recursive

# Check backup size
aws s3 ls s3://hrms-backups/backups/2024/1/ --human-readable --summarize

# Validate backup before restore
npm run backup:validate --s3-key=backups/2024/1/backup_full_....sql.gz

# Check backup metadata
npm run script -- check-backup.js --s3-key=backups/2024/1/backup_full_....sql.gz
```

### Performance Tuning

```sql
-- Get table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Get cache hit ratio
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;

-- Run vacuum and analyze
VACUUM ANALYZE;
```

---

## Useful TypeScript Patterns

### Type-Safe Tenant Queries

```typescript
interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'active' | 'inactive' | 'on_leave';
}

async function getEmployees(tenantId: string): Promise<Employee[]> {
  const db = getTenantKnex(tenantId);
  return db('employees')
    .join('users', 'employees.user_id', '=', 'users.id')
    .select<
      Employee[]
    >('employees.id', 'employees.employee_code', 'users.first_name', 'users.last_name', 'users.email', 'employees.status');
}
```

### Error Handling

```typescript
async function safeQuery<T>(query: Promise<T>, context: string): Promise<T | null> {
  try {
    return await query;
  } catch (error) {
    console.error(`Error in ${context}:`, error);
    // Log to Sentry or monitoring service
    return null;
  }
}

// Usage
const employees = await safeQuery(db('employees').select('*'), 'fetch employees');
```

### Caching Pattern

```typescript
async function getOrCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await cache.getRedisCache().get<T>(key);
  if (cached) return cached;

  const data = await fetcher();
  await cache.getRedisCache().set(key, data, ttl);
  return data;
}

// Usage
const departments = await getOrCached(
  `org:${tenantId}:departments`,
  () => db('departments').select('*'),
  3600 // 1 hour
);
```

---

## Quick Reference Card

```
TENANT OPERATIONS:
  Create:    await tenantManager.createTenant({...})
  Get:       await tenantManager.getTenant(tenantId)
  List:      await tenantManager.listTenants()
  Feature:   await tenantManager.setFeature(id, name, enabled, config)

DATABASE:
  Connect:   getTenantKnex(tenantId)
  Query:     db('table').select().where(...)
  Insert:    db('table').insert({...})
  Update:    db('table').where(...).update({...})
  Delete:    db('table').where(...).del()

CACHE:
  Get:       cache.getOrganizationCache().getDepartments(tenantId)
  Set:       await cache.set(key, value, ttl)
  Delete:    await cache.delete(key)
  Pattern:   await cache.deletePattern(`pattern:*`)
  Check:     await cache.exists(key)

BACKUP:
  Full:      await backupManager.createFullBackup()
  Schema:    await backupManager.createSchemaBackup(schemaName)
  List:      await backupManager.listBackups()
  Restore:   await restoreManager.restoreFullDatabase(s3Key)
  Validate:  await restoreManager.validateBackup(s3Key)

HEALTH:
  DB:        await healthCheck.checkPostgres()
  MongoDB:   await healthCheck.checkMongo()
  Redis:     await healthCheck.checkRedis()
  All:       await healthCheck.checkAll()
```

---

## Resources

| Need          | File                                                                 |
| ------------- | -------------------------------------------------------------------- |
| Architecture  | [SCHEMA_AND_MULTITENANCY.md](SCHEMA_AND_MULTITENANCY.md)             |
| Code Examples | [DATABASE_USAGE_GUIDE.md](DATABASE_USAGE_GUIDE.md)                   |
| SQL Queries   | [SQL_REFERENCE.md](SQL_REFERENCE.md)                                 |
| Setup         | [DATABASE_README.md](DATABASE_README.md)                             |
| Configuration | [CONFIG.env.template](CONFIG.env.template)                           |
| File Index    | [DATABASE_IMPLEMENTATION_INDEX.md](DATABASE_IMPLEMENTATION_INDEX.md) |

---

**Updated**: February 2, 2026
