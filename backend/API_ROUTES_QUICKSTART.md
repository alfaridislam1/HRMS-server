# API Routes Quick Integration Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install jsonwebtoken cors helmet express-rate-limit
```

### Step 2: Update Your app.ts

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import APIRouter from './routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize API routes
const apiRouter = new APIRouter(app);
apiRouter.initialize();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: GET /api/routes (dev only)`);
});

export default app;
```

### Step 3: Update .env

```env
JWT_SECRET=your-super-secret-key-min-32-chars
ROUTE_OBFUSCATION_SALT=your-obfuscation-salt
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
NODE_ENV=development
PORT=3000
```

### Step 4: Generate JWT Token (for testing)

```typescript
import { generateToken } from './middleware/jwtAuth';

// In your auth controller
const token = generateToken(
  {
    userId: 'user-uuid',
    tenantId: 'tenant-uuid',
    role: 'admin',
    email: 'admin@company.com',
    permissions: ['read_all', 'write_all'],
  },
  '24h'
);
```

---

## 🔗 Frontend Integration

### Using obfuscated URLs from frontend

```typescript
// Don't hardcode obfuscated URLs - get them from API
async function getApiEndpoints() {
  const response = await fetch('/api/routes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

// Use the mappings
const mappings = await getApiEndpoints();
const listEmployeesUrl = mappings.mappings.find(
  (m) => m.internalPath === '/api/employees'
)?.externalPath;

// Call API
const employees = await fetch(listEmployeesUrl, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
```

### Or use a wrapper service

```typescript
// api-client.ts
class HRMSApiClient {
  private baseUrl = 'https://api.example.com';
  private token: string;
  private pathMappings: any = {};

  constructor(token: string) {
    this.token = token;
  }

  async init() {
    const response = await fetch(`${this.baseUrl}/api/routes`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    const data = await response.json();
    this.pathMappings = Object.fromEntries(
      data.mappings.map((m: any) => [m.internalPath, m.externalPath])
    );
  }

  private getExternalPath(internalPath: string): string {
    return this.pathMappings[internalPath] || internalPath;
  }

  async get<T>(path: string, query?: any): Promise<T> {
    const externalPath = this.getExternalPath(path);
    const url = new URL(`${this.baseUrl}${externalPath}`);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.append(k, String(v)));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return response.json();
  }

  async post<T>(path: string, data: any): Promise<T> {
    const externalPath = this.getExternalPath(path);
    const response = await fetch(`${this.baseUrl}${externalPath}`, {
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
const client = new HRMSApiClient(token);
await client.init();

const employees = await client.get('/api/employees', {
  page: 1,
  limit: 20,
});
```

---

## 🧪 Testing with cURL

### 1. Generate token

```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  userId: 'test-user',
  tenantId: 'test-tenant',
  role: 'admin',
  email: 'admin@test.com',
  permissions: ['*']
}, 'your-secret-key', { expiresIn: '24h' });
console.log(token);
"
```

### 2. List employees

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/yoiusalkasja/ausoiahs1896347ih2ewdkjags
```

### 3. Create employee

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "departmentId": "dept-123",
    "designationId": "des-456",
    "dateOfJoining": "2024-02-01",
    "phone": "+919876543210",
    "pan": "ABCDE1234F"
  }' \
  http://localhost:3000/poiqweuoisajd/129312893jksahjkhd123123
```

### 4. Request leave

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveTypeId": "leave-123",
    "startDate": "2024-02-15",
    "endDate": "2024-02-17",
    "reason": "Sick leave"
  }' \
  http://localhost:3000/tyuiopqwer/asdfghjklzxcvbnmasdfghjkl
```

### 5. Approve leave

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "remarks": "Approved"
  }' \
  http://localhost:3000/qwertyuiop/zxcvbnmasdfghjklqwertyui/approve
```

### 6. View route mappings (dev only)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/routes
```

---

## 📊 Rate Limiting Info

**Rate limit headers in responses**:

```bash
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645234560
```

**When rate limited (429 response)**:

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

## 🔐 Authentication Errors

### Missing token

```bash
HTTP 401
{
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authorization header is missing"
  }
}
```

### Invalid token

```bash
HTTP 401
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid token"
  }
}
```

### Insufficient permissions

```bash
HTTP 403
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "This action requires one of the following roles: hr, admin"
  }
}
```

---

## ✅ Validation Errors

**Example validation error**:

```bash
HTTP 400
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

---

## 🐛 Debug Mode

To see all request/response logs:

```bash
# Watch logs in real-time
tail -f logs/info-*.log | jq .
```

To get full request mappings in development:

```bash
curl http://localhost:3000/api/routes | jq .
```

---

## 📁 File Structure

```
src/
├── middleware/
│   ├── logger.ts              ✅ Structured logging
│   ├── jwtAuth.ts            ✅ JWT authentication
│   ├── routeObfuscator.ts    ✅ URL obfuscation
│   ├── rateLimiter.ts        ✅ Rate limiting
│   ├── validator.ts          ✅ Input validation
│   ├── rbac.ts               ✅ Role-based access
│   ├── errorHandler.ts       ✅ Error handling
│   └── routeHandler.ts       ✅ Route handlers
│
├── routes/
│   ├── index.ts              ✅ Main API router
│   ├── employees.ts          ✅ Employee endpoints
│   ├── leaveRoutes.ts        ✅ Leave endpoints
│   ├── payrollRoutes.ts      ✅ Payroll endpoints
│   ├── dashboardRoutes.ts    ✅ Dashboard endpoints
│   └── approvalsRoutes.ts    ✅ Approval endpoints
│
└── app.ts                    ✅ Express app setup
```

---

## 🚨 Important Notes

1. **Environment Variables**: Always set `JWT_SECRET` in production
2. **Database**: Connect your database in route handlers (marked with TODO)
3. **Logging**: Logs are auto-created in `logs/` directory
4. **Rate Limiting**: In production, consider using Redis instead of in-memory
5. **CORS**: Update `CORS_ORIGIN` for your frontend domain
6. **SSL/TLS**: Always use HTTPS in production

---

## 📖 Full Documentation

See [API_ROUTES_IMPLEMENTATION.md](./API_ROUTES_IMPLEMENTATION.md) for comprehensive documentation.

---

## Support

For issues or questions:

1. Check logs in `logs/` directory
2. Review validation rules in `middleware/validator.ts`
3. Check role requirements in route files
4. Verify JWT token format and expiration
