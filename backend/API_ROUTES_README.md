# 🚀 HRMS Monolithic Backend - API Routes

Complete production-ready API routes implementation with security, obfuscation, rate limiting, and comprehensive logging.

## 📦 What's Included

### ✅ Core Features

- **URL Obfuscation**: Map external obfuscated URLs to internal readable paths
- **JWT Authentication**: Secure token-based authentication with role support
- **Role-Based Access Control (RBAC)**: Fine-grained permission management
- **Rate Limiting**: Prevent abuse with configurable per-endpoint limits
- **Input Validation**: Comprehensive validation with custom rules
- **Error Handling**: Consistent error responses with request tracking
- **Structured Logging**: Complete request/response logging with file rotation
- **Async Error Handling**: Safe handling of async route handlers

### 📁 File Structure

```
src/
├── middleware/
│   ├── logger.ts              - Structured request logging
│   ├── jwtAuth.ts             - JWT token handling & verification
│   ├── routeObfuscator.ts     - URL obfuscation mapper
│   ├── routeHandler.ts        - Route translation middleware
│   ├── rateLimiter.ts         - Rate limiting (in-memory, Redis ready)
│   ├── validator.ts           - Input validation & sanitization
│   ├── rbac.ts                - Role-based access control
│   └── errorHandler.ts        - Error handling & custom errors
│
├── routes/
│   ├── index.ts               - Main API router setup
│   ├── employees.ts           - Employee management (CRUD)
│   ├── leaveRoutes.ts         - Leave request handling
│   ├── payrollRoutes.ts       - Payroll processing
│   ├── dashboardRoutes.ts     - Dashboard endpoints
│   └── approvalsRoutes.ts     - Approval workflow
│
├── exampleImplementation.ts    - Complete working example
└── app.ts                      - Express app initialization
```

---

## 🔐 Security Features

### URL Obfuscation

**External URL** → **Internal Path**

```
POST /yoiusalkasja/ausoiahs1896347ih2ewdkjags  →  /api/employees (GET)
POST /poiqweuoisajd/129312893jksahjkhd123123  →  /api/employees (POST)
POST /tyuiopqwer/asdfghjklzxcvbnmasdfghjkl    →  /api/leaves (POST)
```

**Benefits:**

- Hide internal API structure
- Rotate URLs without code changes
- Security through obscurity
- Prevent direct API access

### JWT Authentication

```typescript
// Token payload includes
{
  userId: "uuid",
  tenantId: "uuid",
  role: "admin|manager|hr|employee",
  email: "user@example.com",
  permissions: ["read_employees", "write_payroll"],
  iat: 1643723400,
  exp: 1643809800
}
```

### Role-Based Access Control

```typescript
// Supported role checks
requireRole('admin', 'manager', 'hr'); // ANY role
requireAllPermissions('write', 'approve'); // ALL permissions
requireRoleHierarchy('manager'); // Role hierarchy
requireSelfOrAdmin(); // Self-access
requireTenantAccess(); // Tenant isolation
```

### Rate Limiting

```typescript
// Built-in limiters
authLimiter:   5 requests/minute (login)
apiLimiter:    100 requests/15min (general)
readLimiter:   1000 requests/15min (GET)
writeLimiter:  50 requests/15min (POST/PUT/DELETE)
```

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install express jsonwebtoken cors helmet
```

### 2. Setup Express App

```typescript
import express from 'express';
import APIRouter from './routes';

const app = express();
app.use(express.json());

// Initialize routes
const apiRouter = new APIRouter(app);
apiRouter.initialize();

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));
```

### 3. Environment Variables

```env
JWT_SECRET=your-secret-key-min-32-chars
ROUTE_OBFUSCATION_SALT=your-salt-value
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PORT=3000
```

### 4. Generate JWT Token

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

---

## 📚 API Routes

### Employee Management

```
GET    /api/employees                    - List employees
GET    /api/employees/:id                - Get employee
POST   /api/employees                    - Create employee
PUT    /api/employees/:id                - Update employee
DELETE /api/employees/:id                - Delete employee
GET    /api/employees/:id/salary         - Get salary details
```

### Leave Management

```
GET    /api/leaves                       - List leaves
POST   /api/leaves                       - Request leave
POST   /api/leaves/:id/approve           - Approve/reject leave
GET    /api/leave-balance/:employeeId    - Get leave balance
```

### Payroll Management

```
GET    /api/payroll                      - List payroll
POST   /api/payroll                      - Create payroll
GET    /api/payroll/:id                  - Get payroll details
PUT    /api/payroll/:id                  - Update payroll
POST   /api/payroll/:id/approve          - Approve payroll
POST   /api/payroll/:id/finalize         - Finalize payment
```

### Dashboard

```
GET    /api/dashboard/executive          - Executive dashboard
GET    /api/dashboard/employee/:id       - Employee dashboard
GET    /api/dashboard/manager/:id        - Manager dashboard
```

### Approvals

```
GET    /api/approvals                    - List pending approvals
GET    /api/approvals/:id                - Get approval details
POST   /api/approvals/:id/action         - Approve/reject
GET    /api/approvals/pending/count      - Count pending
GET    /api/approvals/history            - Approval history
```

---

## 💻 Usage Examples

### Example 1: Get All Employees

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/yoiusalkasja/ausoiahs1896347ih2ewdkjags?page=1&limit=20
```

**Response:**

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

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
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
  http://localhost:3000/poiqweuoisajd/129312893jksahjkhd123123
```

### Example 3: Request Leave

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveTypeId": "leave-type-123",
    "startDate": "2024-02-15",
    "endDate": "2024-02-17",
    "reason": "Sick leave"
  }' \
  http://localhost:3000/tyuiopqwer/asdfghjklzxcvbnmasdfghjkl
```

### Example 4: Approve Leave

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "remarks": "Approved by manager"
  }' \
  http://localhost:3000/qwertyuiop/zxcvbnmasdfghjklqwertyui/approve
```

---

## 📊 Response Format

### Success Response (200)

```json
{
  "data": {
    /* response data */
  },
  "pagination": {
    /* optional */
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {
      /* optional */
    }
  },
  "requestId": "1643723400000-abc123def456"
}
```

### Validation Error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "email",
        "message": "email must be of type email"
      }
    ]
  }
}
```

---

## 🔑 Authentication

### Generate Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123"
  }'
```

**Response:**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "admin@company.com",
      "role": "admin"
    }
  }
}
```

### Use Token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     http://localhost:3000/api/endpoint
```

---

## 🛡️ Rate Limiting

**Rate limit headers in response:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1645234560
```

**When rate limited (429):**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": 45
  }
}
```

---

## ✅ Input Validation

**Supported types:**

- `string` - Text string
- `number` - Integer or float
- `boolean` - true/false
- `email` - Valid email format
- `uuid` - Valid UUID
- `date` - Valid date string
- `array` - Array type

**Example schema:**

```typescript
{
  email: {
    type: 'email',
    required: true
  },
  firstName: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100
  },
  salary: {
    type: 'number',
    required: true,
    min: 0,
    max: 10000000
  },
  phone: {
    type: 'string',
    pattern: /^\+?[1-9]\d{1,14}$/
  }
}
```

---

## 📝 Logging

**Logs are stored in:**

```
logs/
├── info-2024-02-01.log       (all requests)
├── error-2024-02-01.log      (errors only)
└── warning-2024-02-01.log    (warnings only)
```

**Log entry format:**

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
  "ipAddress": "192.168.1.100"
}
```

---

## 🔍 Development Tools

### View All Route Mappings

```bash
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/api/routes
```

### Health Check

```bash
curl http://localhost:3000/health
```

### Metrics

```bash
curl http://localhost:3000/metrics
```

---

## 🧪 Testing

### Using Jest

```typescript
describe('GET /api/employees', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  it('should return 200 with valid token', async () => {
    const token = generateToken({
      userId: 'test',
      role: 'admin',
      tenantId: 'test',
    });
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

---

## 🚨 Error Codes

| Code                       | HTTP | Description                  |
| -------------------------- | ---- | ---------------------------- |
| `MISSING_TOKEN`            | 401  | Authorization header missing |
| `INVALID_TOKEN`            | 401  | Token is invalid or expired  |
| `NOT_AUTHENTICATED`        | 401  | User not authenticated       |
| `INSUFFICIENT_PERMISSIONS` | 403  | User lacks required role     |
| `FORBIDDEN`                | 403  | Access denied                |
| `NOT_FOUND`                | 404  | Resource not found           |
| `VALIDATION_ERROR`         | 400  | Input validation failed      |
| `DUPLICATE_RECORD`         | 409  | Record already exists        |
| `RATE_LIMIT_EXCEEDED`      | 429  | Too many requests            |
| `DATABASE_ERROR`           | 500  | Database error               |
| `INTERNAL_SERVER_ERROR`    | 500  | Server error                 |

---

## 🔄 Integration with Frontend

### Using API Client

```typescript
class APIClient {
  constructor(
    private baseUrl: string,
    private token: string
  ) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return response.json();
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}

// Usage
const api = new APIClient('http://api.example.com', token);
const employees = await api.get('/yoiusalkasja/ausoiahs1896347ih2ewdkjags');
```

---

## 📖 Documentation Files

- **[API_ROUTES_IMPLEMENTATION.md](./API_ROUTES_IMPLEMENTATION.md)** - Comprehensive feature documentation
- **[API_ROUTES_QUICKSTART.md](./API_ROUTES_QUICKSTART.md)** - Quick start guide
- **[src/exampleImplementation.ts](./src/exampleImplementation.ts)** - Complete working example

---

## ⚙️ Configuration

### Environment Variables

```env
# JWT
JWT_SECRET=your-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Route Obfuscation
ROUTE_OBFUSCATION_SALT=your-salt

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

### Customizing Rate Limits

```typescript
const customLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
});

app.use('/api/sensitive', customLimiter.middleware());
```

---

## 🐛 Debugging

### Enable Verbose Logging

```bash
export DEBUG=hrms:*
npm start
```

### Check Request Logs

```bash
tail -f logs/info-*.log | jq .
```

### View Error Logs

```bash
tail -f logs/error-*.log
```

---

## 📊 Performance

- **Request Logging**: ~1-2ms overhead
- **JWT Verification**: ~0.5-1ms
- **Input Validation**: ~0.5-2ms (depends on complexity)
- **Rate Limiting**: ~0.1-0.5ms

**Total typical overhead: 2-5ms per request**

---

## 🔒 Security Checklist

- ✅ JWT tokens have expiration
- ✅ Passwords never logged
- ✅ Input sanitization enabled
- ✅ Rate limiting active
- ✅ CORS configured
- ✅ Error messages don't leak data
- ✅ Request IDs for tracking
- ✅ Async error handling
- ✅ SQL injection protected (ORM)
- ✅ Multi-tenant isolation

---

## 🤝 Contributing

To add new routes:

1. Create route file in `src/routes/`
2. Define endpoints with middleware
3. Register in `src/routes/index.ts`
4. Add obfuscation mapping
5. Document in README

---

## 📞 Support

For issues:

1. Check logs in `logs/` directory
2. Review validation rules
3. Verify JWT token
4. Check rate limiting status
5. Test with cURL first

---

## 📄 License

This implementation is part of the HRMS project.

---

**Status**: ✅ Production Ready | **Last Updated**: February 2024
