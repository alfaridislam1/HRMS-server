# HRMS Backend - Architecture & Development Guide

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────┐
│        REST API Routes                   │
│   /api/v1/{resource}/{action}            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Controllers (Request Handlers)      │
│  - Parse input, call services            │
│  - Format responses                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Services (Business Logic)           │
│  - Database queries                      │
│  - Data transformations                  │
│  - Complex operations                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Data Access (PostgreSQL/MongoDB)      │
│  - Knex queries                          │
│  - Mongoose models                       │
└─────────────────────────────────────────┘
```

### Middleware Stack

1. **Helmet** - Security headers
2. **CORS** - Cross-origin requests
3. **Morgan** - Request logging
4. **Express JSON** - Body parsing
5. **Auth Middleware** - JWT verification
6. **Tenant Middleware** - Tenant context
7. **RBAC Middleware** - Authorization
8. **Error Handler** - Error responses

## Multi-Tenancy Implementation

### Database Schema Strategy

```sql
-- Public schema (shared)
public.tenants          -- Tenant info
public.users            -- User accounts
public.roles            -- User-tenant-role mapping

-- Tenant schema (isolated)
tenant_001.employees
tenant_001.departments
tenant_001.leaves
tenant_001.payroll
tenant_001.audit_log
...

tenant_002.employees
tenant_002.departments
...
```

### Tenant Isolation Flow

```
Client Request
    ↓
JWT Token contains tenant_id
    ↓
Auth Middleware verifies token
    ↓
Tenant Middleware:
  1. Fetches tenant info from public schema
  2. Sets PostgreSQL search_path to tenant schema
  3. All queries automatically use tenant schema
    ↓
Services execute queries
    ↓
Results belong only to that tenant
```

## Authentication Flow

### User Registration

```
User Registration Request
    ↓
Create Tenant in public schema
    ↓
Create User in public schema
    ↓
Assign initial role (e.g., SUPER_ADMIN)
    ↓
Return tenant info & credentials
```

### User Login

```
Login Request (email, password, tenant_slug)
    ↓
Verify tenant exists & is active
    ↓
Fetch user & verify password
    ↓
Get user roles for tenant
    ↓
Generate JWT Token:
  {
    user_id: "...",
    tenant_id: "...",
    email: "...",
    roles: ["SUPER_ADMIN"],
    permissions: [...]
  }
    ↓
Generate Refresh Token & store in Redis
    ↓
Return Access + Refresh tokens
```

## Role-Based Access Control (RBAC)

### Role Structure

```typescript
interface Role {
  code: 'HR_ADMIN' | 'PAYROLL_MANAGER' | 'MANAGER' | 'EMPLOYEE';
  name: string;
  permissions: string[];
}
```

### Permission Model

```typescript
interface Permission {
  resource: 'employees' | 'leaves' | 'payroll' | ...
  action: 'create' | 'read' | 'update' | 'delete'
  // Combined: "employees:create", "payroll:read"
}
```

### Middleware Usage

```typescript
// Example: Only HR_ADMIN can create employees
router.post(
  '/employees',
  authMiddleware, // Verify token
  tenantMiddleware, // Set tenant context
  rbacMiddleware(['HR_ADMIN']), // Check role
  employeeController.create
);

// Example: Any PAYROLL role can approve payroll
rbacMiddleware(['PAYROLL_MANAGER', 'HR_ADMIN']);
```

## Service Layer Pattern

### EmployeeService Example

```typescript
class EmployeeService {
  // Constructor injects database
  constructor(private db: Pool) {}

  // Query building
  async listEmployees(tenantId, filters) {
    // 1. Build query with filters
    // 2. Add pagination
    // 3. Execute query (auto-uses tenant schema)
    // 4. Return with metadata
  }

  // Caching pattern
  async getEmployee(tenantId, id) {
    // 1. Try Redis cache
    // 2. If miss, query database
    // 3. Cache result
    // 4. Return
  }

  // Write operation + cache invalidation
  async updateEmployee(tenantId, id, data) {
    // 1. Validate input
    // 2. Update database
    // 3. Invalidate relevant caches
    // 4. Return updated entity
  }
}
```

## Error Handling Strategy

### Custom Error Class

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {}
}

// Usage
throw new AppError(400, 'VALIDATION_ERROR', 'Invalid email', { field: 'email' });
```

### Error Handler Middleware

```typescript
// Catches all errors and formats response
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  res.status(status).json({
    error: { code, message, details },
  });
});
```

### Async Handler Wrapper

```typescript
// Wraps async route handlers to catch promise rejections
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Usage
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await service.getData();
    res.json(data);
  })
);
```

## Caching Strategy

### Cache Keys

```typescript
// Pattern: {resource}:{tenant_id}:{identifier}
'employee:tenant-123:emp-456';
'employees:tenant-123:list';
'leave:balance:tenant-123:emp-456';
```

### Cache Invalidation

```typescript
// When data changes, delete related caches
async updateEmployee(id, data) {
  await db.update(id, data);

  // Invalidate all related caches
  await redis.del(`employee:${tenantId}:${id}`);
  await redis.del(`employees:${tenantId}:list`);
  await redis.del(`departments:${tenantId}:*`); // Pattern delete
}
```

### TTL (Time To Live)

```typescript
// Short TTL for frequently changing data
redis.setex('attendance:today', 300, data); // 5 minutes

// Longer TTL for stable data
redis.setex('employee:profile', 3600, data); // 1 hour

// No expiry for reference data (invalidate on change)
redis.set('company:settings', data);
```

## Database Migrations

### Creating a Migration

```bash
npx knex migrate:make add_user_preferences
```

### Migration Structure

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema('tenant_001').createTable('preferences', (t) => {
    t.uuid('id').primary();
    t.uuid('employee_id').references('employees.id');
    t.string('key', 100);
    t.text('value');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('tenant_001').dropTableIfExists('preferences');
}
```

### Running Migrations

```bash
# Development
npm run db:migrate:dev

# Production
npm run db:migrate:prod

# Rollback
npm run db:rollback
```

## Logging & Monitoring

### Winston Logger

```typescript
import { logger } from '@config/logger';

// Different levels
logger.info('User logged in');
logger.warn('High memory usage');
logger.error('Database connection failed', err);

// Structured logging
logger.info('Payment processed', {
  user_id: '123',
  amount: 1000,
  status: 'success',
});
```

### Log Files

```
logs/
├── combined.log      # All logs
├── error.log         # Errors only
├── exceptions.log    # Uncaught exceptions
└── rejections.log    # Unhandled rejections
```

## Testing

### Unit Test Structure

```typescript
describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockDb: jest.Mock;

  beforeEach(() => {
    mockDb = jest.fn();
    service = new EmployeeService(mockDb);
  });

  it('should create employee', async () => {
    mockDb.mockResolvedValue({ rows: [{ id: '1' }] });
    const result = await service.create(data);
    expect(result.id).toBe('1');
  });
});
```

### Integration Test Structure

```typescript
describe('Employee API', () => {
  let app: Express;
  let db: Pool;

  beforeAll(async () => {
    db = await initializePostgres();
    app = createApp();
  });

  it('POST /employees should create employee', async () => {
    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        first_name: 'John',
        ...
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
  });
});
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    ...
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email"
    }
  }
}
```

## Development Workflow

### 1. Create Feature

```bash
git checkout -b feature/add-salary-breakdown
```

### 2. Write Service

```typescript
// src/services/salaryService.ts
class SalaryService {
  async calculateBreakdown(employeeId: string) {
    // Business logic
  }
}
```

### 3. Write Tests

```typescript
// src/services/salaryService.test.ts
describe('SalaryService', () => {
  it('should calculate salary breakdown', async () => {
    // Test
  });
});
```

### 4. Create Controller

```typescript
// src/controllers/salaryController.ts
export const getSalaryBreakdown = async (req, res) => {
  const service = new SalaryService();
  const result = await service.calculateBreakdown(req.params.id);
  res.json({ success: true, data: result });
};
```

### 5. Add Routes

```typescript
// src/routes/payroll.ts
router.get(
  '/salary/:id/breakdown',
  authMiddleware,
  tenantMiddleware,
  asyncHandler(salaryController.getSalaryBreakdown)
);
```

### 6. Test & Commit

```bash
npm run test
npm run lint:fix
git commit -m "feat: add salary breakdown calculation"
git push origin feature/add-salary-breakdown
```

## Performance Optimization

### Database Indexes

```sql
-- Created automatically by migrations
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_leaves_employee ON leave_requests(employee_id, status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, attendance_date);
```

### Query Optimization

```typescript
// ❌ N+1 query problem
const employees = await db.query('SELECT * FROM employees');
for (const emp of employees) {
  emp.leaves = await db.query('SELECT * FROM leaves WHERE employee_id = ?', emp.id);
}

// ✅ Single query with join
const employees = await db.query(`
  SELECT e.*, COUNT(l.id) as leave_count
  FROM employees e
  LEFT JOIN leaves l ON e.id = l.employee_id
  GROUP BY e.id
`);
```

### Pagination Best Practices

```typescript
// Always paginate large datasets
const limit = Math.min(parseInt(req.query.limit), 100); // Cap at 100
const offset = (page - 1) * limit;

const result = await db.query('SELECT * FROM employees LIMIT ? OFFSET ?', [limit, offset]);
```

## Security Considerations

### SQL Injection Prevention

```typescript
// ❌ Vulnerable
db.query(`SELECT * FROM employees WHERE id = ${userId}`);

// ✅ Safe (parameterized queries)
db.query('SELECT * FROM employees WHERE id = $1', [userId]);
```

### Password Security

```typescript
// Hashing
const hash = await bcryptjs.hash(password, 10);

// Verification
const isValid = await bcryptjs.compare(password, hash);
```

### JWT Token Security

```typescript
// Secrets must be strong
const secret = process.env.JWT_SECRET; // Min 32 chars

// Always use HTTPS in production
if (config.env === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
  });
}
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL/TLS enabled
- [ ] CORS configured properly
- [ ] Logging enabled
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Rate limiting enabled
- [ ] Security headers set (Helmet)
- [ ] Redis password set
- [ ] Database passwords strong
- [ ] API documentation generated
