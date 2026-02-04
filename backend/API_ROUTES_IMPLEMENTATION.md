# HRMS API Routes Implementation Guide

## Overview

Complete production-ready API routes with:

- **URL Obfuscation**: External obfuscated URLs → Internal readable endpoints
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Authorization**: Fine-grained access control
- **Rate Limiting**: Prevent abuse and ensure fair usage
- **Input Validation**: Sanitize and validate all inputs
- **Structured Logging**: Comprehensive request/response logging
- **Error Handling**: Consistent error responses

---

## Architecture

```
Request Flow:
┌─────────────────────────────────────────────────────────┐
│ 1. External Request                                     │
│    POST /yoiusalkasja/ausoiahs1896347ih2ewdkjags      │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 2. Route Obfuscation Middleware                         │
│    Maps obfuscated path → /api/employees               │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 3. Rate Limiting Middleware                             │
│    Check request limit for IP/User                      │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 4. Input Sanitization                                   │
│    Remove malicious characters                          │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 5. JWT Authentication                                   │
│    Verify token, extract user info                      │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 6. Role-Based Authorization                             │
│    Check user roles/permissions                         │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 7. Input Validation                                     │
│    Validate request body/params                         │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 8. Route Handler                                        │
│    Process request, interact with database              │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 9. Structured Logging                                   │
│    Log request/response with duration                   │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│ 10. Response                                            │
│     Return JSON response to client                      │
└─────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Route Obfuscation

**External URL** (what clients see):

```
POST /yoiusalkasja/ausoiahs1896347ih2ewdkjags
```

**Maps to Internal Path** (what code uses):

```
POST /api/employees
```

**Benefits:**

- Hide internal API structure from external users
- Change internal paths without affecting clients
- Security through obscurity layer
- Easy to revoke/rotate external URLs

**Configuration**:

```typescript
// Add new mapping
obfuscator.registerRoute('/random-obfuscated-path', '/api/internal-path', {
  method: 'GET',
  requiredRole: ['admin', 'hr'],
  description: 'Get all employees',
});
```

### 2. JWT Authentication

**Token Structure**:

```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "role": "admin|manager|hr|employee",
  "email": "user@example.com",
  "permissions": ["read_employees", "write_payroll"],
  "iat": 1643723400,
  "exp": 1643809800
}
```

**Usage**:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     https://api.example.com/yoiusalkasja/ausoiahs1896347ih2ewdkjags
```

**Generate Token**:

```typescript
import { generateToken } from './middleware/jwtAuth';

const token = generateToken(
  {
    userId: 'user-123',
    tenantId: 'tenant-456',
    role: 'admin',
    email: 'admin@company.com',
    permissions: ['*'],
  },
  '24h'
);
```

### 3. Role-Based Access Control

**Supported Role Checks**:

```typescript
// Require ANY of the roles
router.get('/endpoint', requireRole('admin', 'manager', 'hr'), handler);

// Require ALL permissions
router.post('/endpoint', requireAllPermissions('write_employees', 'write_payroll'), handler);

// Role hierarchy (admin > manager > employee)
router.get('/endpoint', requireRoleHierarchy('manager'), handler);

// Self-access only (can view own data)
router.get('/users/:id', requireSelfOrAdmin(), handler);

// Tenant isolation
router.get('/endpoint', requireTenantAccess(), handler);
```

**Role Definitions**:

```typescript
const roleHierarchy = {
  admin: 100, // Full access
  manager: 50, // Team management
  hr: 50, // HR operations
  employee: 10, // Self-service
  guest: 0, // Limited access
};
```

### 4. Rate Limiting

**Pre-configured Limiters**:

```typescript
const limiters = {
  authLimiter: {
    requests: 5,
    window: '1 minute',
    use: 'Login/signup endpoints',
  },
  apiLimiter: {
    requests: 100,
    window: '15 minutes',
    use: 'General API endpoints',
  },
  readLimiter: {
    requests: 1000,
    window: '15 minutes',
    use: 'GET/read operations',
  },
  writeLimiter: {
    requests: 50,
    window: '15 minutes',
    use: 'POST/PUT/DELETE operations',
  },
};
```

**Custom Rate Limiter**:

```typescript
const customLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many requests',
  keyGenerator: (req) => req.user?.userId || req.ip,
});

app.use('/api/sensitive', customLimiter.middleware());
```

**Rate Limit Headers**:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1643809800
```

### 5. Input Validation

**Validation Schema**:

```typescript
const createEmployeeSchema = {
  email: {
    type: 'email',
    required: true,
  },
  firstName: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  departmentId: {
    type: 'uuid',
    required: true,
  },
  phone: {
    type: 'string',
    required: false,
    pattern: /^\+?[1-9]\d{1,14}$/,
  },
  baseSalary: {
    type: 'number',
    required: true,
    min: 0,
    max: 10000000,
  },
  custom: (value) => {
    // Custom validation logic
    return true; // or error message
  },
};
```

**Usage in Routes**:

```typescript
router.post(
  '/',
  requireAuth(),
  validateInput(createEmployeeSchema, 'body'),
  asyncHandler(async (req, res) => {
    // All data guaranteed to be valid here
    const employee = req.body;
  })
);
```

**Validation Error Response**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "email",
        "message": "email must be of type email"
      },
      {
        "field": "firstName",
        "message": "firstName must be at least 1 characters long"
      }
    ]
  }
}
```

### 6. Error Handling

**Error Types**:

```typescript
// Validation error
throw new ValidationError('Invalid input', [{ field: 'email', message: 'Invalid email' }]);

// Not found
throw new NotFoundError('Employee', 'emp-123');

// Unauthorized
throw new UnauthorizedError('Invalid credentials');

// Forbidden
throw new ForbiddenError('You do not have access');

// Duplicate
throw new DuplicateError('Employee', 'email', 'user@company.com');

// Database error
throw new DatabaseError('Connection failed');

// External service error
throw new ExternalServiceError('Payment Service', 'Timeout');
```

**Error Response Format**:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Employee with id emp-123 not found"
  },
  "requestId": "1643723400000-abc123def456"
}
```

### 7. Structured Logging

**Request Log Entry**:

```json
{
  "timestamp": "2024-02-01T10:30:45.123Z",
  "requestId": "1643723400000-abc123def456",
  "method": "GET",
  "path": "/api/employees",
  "statusCode": 200,
  "duration": 145,
  "userId": "user-123",
  "userRole": "admin",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Log Files** (auto-rotated daily):

```
logs/
├── info-2024-02-01.log
├── error-2024-02-01.log
└── warning-2024-02-01.log
```

**Access Logger**:

```typescript
const logger = (req as any).logger;
logger.info('Employee created', { employeeId: 'emp-123' });
logger.error('Database connection failed', { error: err.message });
logger.warning('High API usage detected', { rps: 450 });
```

---

## Usage Examples

### Example 1: List Employees

**Request**:

```bash
curl -X GET \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://api.example.com/yoiusalkasja/ausoiahs1896347ih2ewdkjags
```

**Route Mapping**:

```
External: /yoiusalkasja/ausoiahs1896347ih2ewdkjags (GET)
Internal: /api/employees (GET)
Required Roles: ['hr', 'admin', 'manager']
```

**Handler**:

```typescript
router.get(
  '/',
  requireAuth(),
  requireRole('hr', 'admin', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    // Fetch from database
    res.json({
      data: employees,
      pagination: { page, limit, total },
    });
  })
);
```

**Response**:

```json
{
  "data": [
    {
      "id": "emp-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@company.com",
      "departmentId": "dept-456"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Example 2: Create Employee

**Request**:

```bash
curl -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "departmentId": "dept-456",
    "designationId": "des-789",
    "dateOfJoining": "2024-02-01",
    "phone": "+919876543210",
    "pan": "ABCDE1234F"
  }' \
  https://api.example.com/poiqweuoisajd/129312893jksahjkhd123123
```

**Route Mapping**:

```
External: /poiqweuoisajd/129312893jksahjkhd123123 (POST)
Internal: /api/employees (POST)
Required Roles: ['hr', 'admin']
```

**Validation**:

```
✓ email is valid
✓ firstName is string with length 1-100
✓ departmentId is valid UUID
✓ phone matches pattern /^\+?[1-9]\d{1,14}$/
✓ pan matches pattern /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
```

**Response**:

```json
{
  "data": {
    "id": "emp-new-123",
    "email": "jane@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "message": "Employee created successfully"
  }
}
```

### Example 3: Request Leave

**Request**:

```bash
curl -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "leaveTypeId": "leave-type-123",
    "startDate": "2024-02-15",
    "endDate": "2024-02-17",
    "reason": "Personal emergency"
  }' \
  https://api.example.com/tyuiopqwer/asdfghjklzxcvbnmasdfghjkl
```

**Route Mapping**:

```
External: /tyuiopqwer/asdfghjklzxcvbnmasdfghjkl (POST)
Internal: /api/leaves (POST)
Required Roles: ['hr', 'admin', 'employee']
```

**Handler**:

```typescript
router.post(
  '/',
  requireAuth(),
  requireRole('employee', 'hr', 'admin'),
  validateInput(ValidationSchemas.requestLeave),
  asyncHandler(async (req, res) => {
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    const employeeId = (req as any).userId;

    // Create leave request
    const leaveId = await createLeave({
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      status: 'pending',
    });

    res.status(201).json({
      data: { id: leaveId },
      message: 'Leave request submitted',
    });
  })
);
```

### Example 4: Approve Leave (Manager Only)

**Request**:

```bash
curl -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "remarks": "Approved by manager"
  }' \
  https://api.example.com/qwertyuiop/zxcvbnmasdfghjklqwertyui/approve
```

**Route Mapping**:

```
External: /qwertyuiop/zxcvbnmasdfghjklqwertyui (POST)
Internal: /api/leaves/:id/approve (POST)
Required Roles: ['hr', 'admin', 'manager']
```

---

## Implementation in Express App

**main.ts / app.ts**:

```typescript
import express from 'express';
import APIRouter from './routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize API routes
const apiRouter = new APIRouter(app);
apiRouter.initialize();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('API Documentation: GET /api/routes (development only)');
});

export default app;
```

---

## Security Best Practices

1. **JWT Secrets**
   - Use strong, randomly generated secrets
   - Rotate secrets periodically
   - Never commit secrets to version control
   - Use environment variables

2. **Rate Limiting**
   - Implement per-user and per-IP limits
   - Adjust limits based on endpoint sensitivity
   - Monitor for brute force attempts
   - Use Redis for distributed systems

3. **Input Validation**
   - Validate all inputs (body, params, query)
   - Sanitize user input
   - Use whitelisting, not blacklisting
   - Validate file uploads

4. **CORS**
   - Configure appropriate CORS policies
   - Only allow trusted domains
   - Avoid overly permissive settings

5. **HTTPS**
   - Always use HTTPS in production
   - Use valid SSL certificates
   - Implement HSTS headers

6. **Logging**
   - Never log sensitive data
   - Implement log rotation
   - Monitor logs for suspicious activity
   - Use centralized logging

---

## Testing

```typescript
// Example test
describe('GET /api/employees', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/yoiusalkasja/ausoiahs1896347ih2ewdkjags');
    expect(res.status).toBe(401);
  });

  it('should return 403 for insufficient role', async () => {
    const token = generateToken({
      userId: 'user-123',
      role: 'employee',
      tenantId: 'tenant-456',
    });

    const res = await request(app)
      .get('/yoiusalkasja/ausoiahs1896347ih2ewdkjags')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should return 200 with valid token and role', async () => {
    const token = generateToken({
      userId: 'user-123',
      role: 'admin',
      tenantId: 'tenant-456',
    });

    const res = await request(app)
      .get('/yoiusalkasja/ausoiahs1896347ih2ewdkjags')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

---

## Configuration

**.env**:

```
# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Route Obfuscation
ROUTE_OBFUSCATION_SALT=your-salt-value

# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgres://...
MONGO_URL=mongodb://...
REDIS_URL=redis://...
```

---

## Monitoring & Debugging

**Development Mode**:

```bash
# View all route mappings
curl http://localhost:3000/api/routes
```

**Logs**:

```bash
# Watch error logs
tail -f logs/error-*.log

# Search for specific user
grep "user-123" logs/info-*.log
```

---

## Summary

✅ Complete production-ready API routes
✅ URL obfuscation for security
✅ JWT authentication & RBAC
✅ Rate limiting (per-user, per-IP)
✅ Comprehensive input validation
✅ Structured logging with request tracking
✅ Consistent error handling
✅ Async error wrapping
✅ Multi-tenant support
✅ Fully extensible architecture

All files are ready to use - just integrate with your database layer!
