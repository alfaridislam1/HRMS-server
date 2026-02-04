# PostgreSQL SQL Reference Guide

SQL scripts and queries for the HRMS system. Includes schema setup, common queries, and administrative tasks.

## Table of Contents

1. [Tenant Management](#tenant-management)
2. [Employee Queries](#employee-queries)
3. [Leave Management](#leave-management)
4. [Payroll Queries](#payroll-queries)
5. [Reporting](#reporting)
6. [Administrative Tasks](#administrative-tasks)
7. [Performance Tuning](#performance-tuning)

---

## Tenant Management

### List All Tenants

```sql
SELECT
  id,
  name,
  slug,
  database_schema,
  status,
  created_at,
  admin_email
FROM tenants
ORDER BY created_at DESC;
```

### Get Tenant Details

```sql
SELECT
  t.id,
  t.name,
  t.slug,
  t.database_schema,
  t.status,
  t.settings,
  count(tf.id) as feature_count,
  t.created_at
FROM tenants t
LEFT JOIN tenant_features tf ON t.id = tf.tenant_id AND tf.enabled = true
WHERE t.id = $1
GROUP BY t.id;
```

### Get Tenant Features

```sql
SELECT
  feature_name,
  enabled,
  config,
  created_at,
  updated_at
FROM tenant_features
WHERE tenant_id = $1
ORDER BY feature_name;
```

### Get Tenant Audit Trail

```sql
SELECT
  action,
  changes,
  changed_by,
  created_at
FROM tenant_audit
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT 50;
```

### Create New Tenant (Manual)

```sql
-- Insert tenant record
INSERT INTO tenants (id, name, slug, database_schema, admin_email, status)
VALUES (
  gen_random_uuid(),
  'New Company Ltd',
  'new-company',
  'tenant_new_company_abc12345',
  'admin@newcompany.com',
  'active'
);

-- Create schema
CREATE SCHEMA tenant_new_company_abc12345;

-- Run migrations (via application)
```

### Switch Tenant Context

```sql
-- When connecting to a tenant database
SET search_path TO "tenant_acme_abc12345", public;

-- Or in connection string
-- postgresql://user:pass@host:5432/hrms?options=-c%20search_path=tenant_acme_abc12345,public
```

---

## Employee Queries

### List All Employees

```sql
SELECT
  e.id,
  e.employee_code,
  CONCAT(u.first_name, ' ', u.last_name) as name,
  u.email,
  d.name as department,
  dsg.name as designation,
  e.employment_type,
  e.date_of_joining,
  e.status
FROM employees e
JOIN users u ON e.user_id = u.id
JOIN departments d ON e.department_id = d.id
JOIN designations dsg ON e.designation_id = dsg.id
WHERE e.status != 'deleted'
ORDER BY e.employee_code;
```

### Get Employee Details

```sql
SELECT
  e.id,
  e.employee_code,
  u.first_name,
  u.last_name,
  u.email,
  e.phone,
  e.date_of_birth,
  e.gender,
  e.date_of_joining,
  e.date_of_exit,
  e.employment_type,
  d.name as department,
  dsg.name as designation,
  mgr.first_name || ' ' || mgr.last_name as manager_name,
  e.pan,
  e.address,
  e.city,
  e.state,
  e.postal_code,
  e.country,
  e.status
FROM employees e
JOIN users u ON e.user_id = u.id
JOIN departments d ON e.department_id = d.id
JOIN designations dsg ON e.designation_id = dsg.id
LEFT JOIN users mgr ON e.manager_id = mgr.id
WHERE e.id = $1;
```

### Get Employees by Department

```sql
SELECT
  e.id,
  e.employee_code,
  u.first_name || ' ' || u.last_name as name,
  dsg.name as designation,
  e.date_of_joining,
  e.status
FROM employees e
JOIN users u ON e.user_id = u.id
JOIN designations dsg ON e.designation_id = dsg.id
WHERE e.department_id = $1 AND e.status = 'active'
ORDER BY u.first_name;
```

### Employee Count by Department

```sql
SELECT
  d.id,
  d.name as department,
  count(e.id) as employee_count,
  count(CASE WHEN e.status = 'active' THEN 1 END) as active_employees,
  count(CASE WHEN e.status = 'on_leave' THEN 1 END) as on_leave,
  count(CASE WHEN e.status = 'inactive' THEN 1 END) as inactive
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id
GROUP BY d.id, d.name
ORDER BY employee_count DESC;
```

### Get Manager's Direct Reports

```sql
SELECT
  e.id,
  e.employee_code,
  u.first_name || ' ' || u.last_name as name,
  dsg.name as designation,
  e.status
FROM employees e
JOIN users u ON e.user_id = u.id
JOIN designations dsg ON e.designation_id = dsg.id
WHERE e.manager_id = $1 AND e.status = 'active'
ORDER BY u.first_name;
```

### New Joiners This Month

```sql
SELECT
  e.id,
  e.employee_code,
  u.first_name || ' ' || u.last_name as name,
  dsg.name as designation,
  d.name as department,
  e.date_of_joining
FROM employees e
JOIN users u ON e.user_id = u.id
JOIN designations dsg ON e.designation_id = dsg.id
JOIN departments d ON e.department_id = d.id
WHERE e.date_of_joining >= date_trunc('month', CURRENT_DATE)
  AND e.date_of_joining < date_trunc('month', CURRENT_DATE) + interval '1 month'
ORDER BY e.date_of_joining DESC;
```

### Employees with Expiring Documents

```sql
SELECT
  e.id,
  e.employee_code,
  u.first_name || ' ' || u.last_name as name,
  e.pan,
  e.pan_expiry,
  e.aadhaar,
  e.aadhaar_expiry,
  CASE
    WHEN CURRENT_DATE + INTERVAL '30 days' >= e.pan_expiry THEN 'PAN'
    WHEN CURRENT_DATE + INTERVAL '30 days' >= e.aadhaar_expiry THEN 'Aadhaar'
  END as document_expiring_soon
FROM employees e
JOIN users u ON e.user_id = u.id
WHERE (e.pan_expiry IS NOT NULL AND e.pan_expiry <= CURRENT_DATE + INTERVAL '30 days')
   OR (e.aadhaar_expiry IS NOT NULL AND e.aadhaar_expiry <= CURRENT_DATE + INTERVAL '30 days')
ORDER BY LEAST(COALESCE(e.pan_expiry, '9999-12-31'), COALESCE(e.aadhaar_expiry, '9999-12-31'));
```

---

## Leave Management

### Employee Leave Balance

```sql
SELECT
  elb.id,
  lt.name as leave_type,
  elb.year,
  elb.opening_balance,
  elb.leaves_approved,
  elb.leaves_pending,
  elb.closing_balance,
  (elb.opening_balance - elb.leaves_approved - elb.leaves_pending) as available
FROM employee_leave_balance elb
JOIN leave_types lt ON elb.leave_type_id = lt.id
WHERE elb.employee_id = $1 AND elb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY lt.name;
```

### Leave Requests for Approval

```sql
SELECT
  l.id,
  e.employee_code,
  u.first_name || ' ' || u.last_name as employee_name,
  lt.name as leave_type,
  l.start_date,
  l.end_date,
  l.number_of_days,
  l.reason,
  l.status,
  l.created_at
FROM leaves l
JOIN employees e ON l.employee_id = e.id
JOIN users u ON e.user_id = u.id
JOIN leave_types lt ON l.leave_type_id = lt.id
WHERE l.status = 'pending'
  AND e.manager_id = $1
ORDER BY l.created_at DESC;
```

### Leave Summary by Type (Current Year)

```sql
SELECT
  lt.name as leave_type,
  count(CASE WHEN l.status = 'approved' THEN 1 END) as approved,
  count(CASE WHEN l.status = 'pending' THEN 1 END) as pending,
  count(CASE WHEN l.status = 'rejected' THEN 1 END) as rejected,
  sum(CASE WHEN l.status = 'approved' THEN l.number_of_days ELSE 0 END) as total_days_approved
FROM leaves l
JOIN leave_types lt ON l.leave_type_id = lt.id
WHERE EXTRACT(YEAR FROM l.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY lt.id, lt.name
ORDER BY lt.name;
```

### Employee's Leave History

```sql
SELECT
  l.id,
  lt.name as leave_type,
  l.start_date,
  l.end_date,
  l.number_of_days,
  l.status,
  COALESCE(u.first_name || ' ' || u.last_name, 'Not assigned') as approved_by,
  l.approved_at,
  l.reason
FROM leaves l
JOIN leave_types lt ON l.leave_type_id = lt.id
LEFT JOIN users u ON l.approved_by = u.id
WHERE l.employee_id = $1
ORDER BY l.start_date DESC;
```

### Overlapping Leaves (Same Department)

```sql
SELECT
  l1.id as leave_id,
  e1.employee_code,
  u1.first_name || ' ' || u1.last_name as employee,
  l1.start_date,
  l1.end_date,
  l1.number_of_days,
  count(DISTINCT l2.id) as overlapping_count
FROM leaves l1
JOIN employees e1 ON l1.employee_id = e1.id
JOIN users u1 ON e1.user_id = u1.id
LEFT JOIN leaves l2 ON l1.start_date <= l2.end_date
  AND l1.end_date >= l2.start_date
  AND l1.id != l2.id
  AND l2.status = 'approved'
  AND e1.department_id = (SELECT department_id FROM employees WHERE id = l2.employee_id)
WHERE l1.status = 'pending'
GROUP BY l1.id, e1.employee_code, u1.first_name, u1.last_name, l1.start_date, l1.end_date, l1.number_of_days
HAVING count(DISTINCT l2.id) > 2
ORDER BY overlapping_count DESC;
```

---

## Payroll Queries

### Current Month Payroll Status

```sql
SELECT
  'Processed' as status,
  count(*) as count,
  sum(net_salary) as total_amount
FROM payroll
WHERE month = to_char(CURRENT_DATE, 'YYYY-MM') AND status = 'processed'
UNION ALL
SELECT
  'Pending Approval',
  count(*),
  sum(net_salary)
FROM payroll
WHERE month = to_char(CURRENT_DATE, 'YYYY-MM') AND status = 'approved'
UNION ALL
SELECT
  'Draft',
  count(*),
  sum(net_salary)
FROM payroll
WHERE month = to_char(CURRENT_DATE, 'YYYY-MM') AND status = 'draft';
```

### Employee Salary Details

```sql
SELECT
  e.employee_code,
  u.first_name || ' ' || u.last_name as name,
  es.base_salary,
  es.allowances,
  es.deductions,
  es.gross_salary,
  es.effective_from,
  COALESCE(es.effective_to, 'Current') as effective_to
FROM employee_salaries es
JOIN employees e ON es.employee_id = e.id
JOIN users u ON e.user_id = u.id
WHERE e.id = $1
ORDER BY es.effective_from DESC;
```

### Payroll Processing Report

```sql
SELECT
  p.month,
  count(p.id) as total_employees,
  sum(p.gross_salary) as total_gross,
  sum(p.net_salary) as total_net,
  avg(p.net_salary) as avg_salary,
  max(p.net_salary) as max_salary,
  min(p.net_salary) as min_salary,
  count(CASE WHEN p.status = 'processed' THEN 1 END) as processed_count,
  count(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count
FROM payroll p
WHERE p.month >= to_char(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM')
GROUP BY p.month
ORDER BY p.month DESC;
```

### Payroll by Department

```sql
SELECT
  d.name as department,
  count(p.id) as employee_count,
  sum(p.gross_salary) as total_gross_salary,
  sum(p.net_salary) as total_net_salary,
  avg(p.net_salary) as avg_salary
FROM payroll p
JOIN employees e ON p.employee_id = e.id
JOIN departments d ON e.department_id = d.id
WHERE p.month = $1
GROUP BY d.id, d.name
ORDER BY total_gross_salary DESC;
```

### Deduction Analysis

```sql
SELECT
  p.month,
  p.deductions -> 'pf' as provident_fund,
  p.deductions -> 'tax' as income_tax,
  p.deductions -> 'insurance' as insurance,
  sum((p.deductions -> 'pf')::numeric) as total_pf,
  sum((p.deductions -> 'tax')::numeric) as total_tax
FROM payroll p
WHERE p.month >= to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')
GROUP BY p.month
ORDER BY p.month DESC;
```

---

## Reporting

### Organizational Hierarchy

```sql
WITH RECURSIVE org_tree AS (
  SELECT
    id,
    name,
    parent_department_id,
    0 as level,
    name as path
  FROM departments
  WHERE parent_department_id IS NULL

  UNION ALL

  SELECT
    d.id,
    d.name,
    d.parent_department_id,
    ot.level + 1,
    ot.path || ' > ' || d.name
  FROM departments d
  JOIN org_tree ot ON d.parent_department_id = ot.id
)
SELECT
  repeat('  ', level) || name as department_name,
  path,
  level
FROM org_tree
ORDER BY path;
```

### Reporting Lines

```sql
WITH RECURSIVE reporting_chain AS (
  SELECT
    e.id,
    e.employee_code,
    u.first_name || ' ' || u.last_name as name,
    e.manager_id,
    1 as level,
    e.employee_code || ' - ' || u.first_name || ' ' || u.last_name as path
  FROM employees e
  JOIN users u ON e.user_id = u.id
  WHERE e.manager_id IS NULL

  UNION ALL

  SELECT
    e.id,
    e.employee_code,
    u.first_name || ' ' || u.last_name,
    e.manager_id,
    rc.level + 1,
    rc.path || ' > ' || e.employee_code || ' - ' || u.first_name || ' ' || u.last_name
  FROM employees e
  JOIN users u ON e.user_id = u.id
  JOIN reporting_chain rc ON e.manager_id = rc.id
)
SELECT
  repeat('  ', level - 1) || name as employee_name,
  path,
  level
FROM reporting_chain
ORDER BY path;
```

### Resignation Analysis

```sql
SELECT
  EXTRACT(MONTH FROM date_of_exit) as month,
  EXTRACT(YEAR FROM date_of_exit) as year,
  count(*) as resignations,
  count(*) * 100.0 / (SELECT count(*) FROM employees WHERE date_of_exit IS NOT NULL) as percentage,
  avg(EXTRACT(YEAR FROM date_of_exit) - EXTRACT(YEAR FROM date_of_joining)) as avg_tenure_years
FROM employees
WHERE date_of_exit IS NOT NULL AND status = 'inactive'
GROUP BY year, month
ORDER BY year DESC, month DESC;
```

### Salary Analysis

```sql
SELECT
  dsg.name as designation,
  count(e.id) as employee_count,
  sum(es.base_salary) as total_base_salary,
  avg(es.base_salary) as avg_salary,
  min(es.base_salary) as min_salary,
  max(es.base_salary) as max_salary,
  stddev_pop(es.base_salary) as salary_stddev
FROM employees e
JOIN designations dsg ON e.designation_id = dsg.id
JOIN employee_salaries es ON e.id = es.employee_id
WHERE e.status = 'active' AND es.effective_to IS NULL
GROUP BY dsg.id, dsg.name
ORDER BY avg_salary DESC;
```

---

## Administrative Tasks

### Soft Delete Employee

```sql
UPDATE employees
SET status = 'inactive', deleted_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- Also mark user as inactive
UPDATE users
SET is_active = false
WHERE id = (SELECT user_id FROM employees WHERE id = $1);
```

### Bulk Update Employee Status

```sql
UPDATE employees
SET status = 'inactive', deleted_at = CURRENT_TIMESTAMP
WHERE id = ANY($1::uuid[])
RETURNING id, employee_code, status;
```

### Clone Salary Structure

```sql
INSERT INTO employee_salaries (id, employee_id, salary_structure_id, effective_from, base_salary, allowances, deductions, gross_salary, status)
SELECT
  gen_random_uuid(),
  $1, -- target_employee_id
  salary_structure_id,
  CURRENT_DATE,
  base_salary,
  allowances,
  deductions,
  gross_salary,
  'active'
FROM employee_salaries
WHERE employee_id = $2 -- source_employee_id
  AND effective_to IS NULL;
```

### Close Salary Revisions

```sql
UPDATE employee_salaries
SET effective_to = CURRENT_DATE - INTERVAL '1 day'
WHERE employee_id = $1 AND effective_to IS NULL;
```

### Audit Log Cleanup (Archive Old Logs)

```sql
-- Archive logs older than 2 years
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < CURRENT_DATE - INTERVAL '2 years';

DELETE FROM audit_logs
WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
```

### Reset Employee Leave Balance

```sql
UPDATE employee_leave_balance
SET
  opening_balance = lt.max_days_per_year,
  leaves_taken = 0,
  leaves_approved = 0,
  leaves_pending = 0,
  closing_balance = lt.max_days_per_year,
  year = EXTRACT(YEAR FROM CURRENT_DATE)
FROM leave_types lt
WHERE employee_leave_balance.leave_type_id = lt.id
  AND employee_leave_balance.year = EXTRACT(YEAR FROM CURRENT_DATE) - 1;
```

---

## Performance Tuning

### Create Essential Indexes

```sql
-- Employee queries
CREATE INDEX idx_employees_department ON employees(department_id) WHERE status != 'deleted';
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_code ON employees(employee_code);

-- Leave queries
CREATE INDEX idx_leaves_employee_status ON leaves(employee_id, status);
CREATE INDEX idx_leaves_dates ON leaves(start_date, end_date);
CREATE INDEX idx_leaves_period ON leaves(created_at) WHERE status = 'pending';

-- Payroll queries
CREATE INDEX idx_payroll_month_status ON payroll(month, status);
CREATE INDEX idx_payroll_employee_month ON payroll(employee_id, month);

-- Approval queries
CREATE INDEX idx_approvals_entity ON approvals(entity_type, entity_id);
CREATE INDEX idx_approvals_status_assigned ON approvals(status, assigned_to);

-- Audit queries
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);
```

### Check Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Find Missing Indexes

```sql
SELECT
  t.tablename,
  a.attname,
  count(*) as column_used
FROM pg_stat_user_tables t
JOIN pg_stat_user_indexes i ON t.tableoid = i.relid
JOIN pg_attribute a ON a.attrelid = t.tableoid
WHERE i.idx_scan = 0
GROUP BY t.tablename, a.attname
ORDER BY count(*) DESC;
```

### Table Size Analysis

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Vacuum and Analyze

```sql
-- Full maintenance
VACUUM ANALYZE;

-- Specific table
VACUUM ANALYZE employees;

-- Check vacuum progress
SELECT
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY last_vacuum DESC;
```

### Long Running Queries

```sql
SELECT
  pid,
  usename,
  query_start,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start;
```

---

## Monitoring Queries

### Database Statistics

```sql
SELECT
  datname as database,
  numbackends as active_connections,
  xact_commit + xact_rollback as total_transactions,
  blks_read,
  blks_hit,
  (blks_hit::float / (blks_hit + blks_read)) * 100 as cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();
```

### Connection Pool Health

```sql
SELECT
  client_addr,
  usename,
  application_name,
  state,
  count(*) as connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY client_addr, usename, application_name, state;
```

### Replication Status

```sql
SELECT
  client_addr,
  state,
  sync_state,
  flush_lsn,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication;
```

---

This SQL reference provides common queries and administrative tasks for the HRMS system. Adapt queries as needed for your specific requirements.
