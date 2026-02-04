# API Routes - Quick Reference Card

## 🚀 Setup (5 minutes)

```bash
# 1. Install dependencies
npm install express jsonwebtoken cors helmet

# 2. Copy files
# - Copy src/middleware/*
# - Copy src/routes/*
# - Copy exampleImplementation.ts

# 3. Set environment
export JWT_SECRET="your-secret-key"
export ROUTE_OBFUSCATION_SALT="your-salt"
export NODE_ENV="development"

# 4. Start server
npm start
```

---

## 📝 Core Usage

### Generate Token

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

### Use in Request

```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/yoiusalkasja/ausoiahs1896347ih2ewdkjags
```

### Initialize API

```typescript
import APIRouter from './routes';

const app = express();
const apiRouter = new APIRouter(app);
apiRouter.initialize();

app.listen(3000);
```

---

## 🔑 Endpoints Cheat Sheet

| Obfuscated                                 | Internal                  | Method | Role              |
| ------------------------------------------ | ------------------------- | ------ | ----------------- |
| `/yoiusalkasja/ausoiahs1896347ih2ewdkjags` | `/api/employees`          | GET    | HR/Admin/Manager  |
| `/poiqweuoisajd/129312893jksahjkhd123123`  | `/api/employees`          | POST   | HR/Admin          |
| `/tyuiopqwer/asdfghjklzxcvbnmasdfghjkl`    | `/api/leaves`             | POST   | Employee/HR/Admin |
| `/qwertyuiop/zxcvbnmasdfghjklqwertyui`     | `/api/leaves/:id/approve` | POST   | Manager/HR/Admin  |
| `/mnbvcxzasdf/sdfghjklmnbvcxzasdfghjkl`    | `/api/payroll`            | GET    | HR/Admin/Manager  |

See [ROUTE_MAPPINGS_REFERENCE.md](ROUTE_MAPPINGS_REFERENCE.md) for complete list.

---

## 🔐 Role Management

```typescript
// Require role
router.get('/', requireRole('admin', 'manager'), handler);

// Require permission
router.post('/', requirePermission('write_employees'), handler);

// Role hierarchy
router.get('/', requireRoleHierarchy('manager'), handler);

// Self-access only
router.get('/:id', requireSelfOrAdmin(), handler);
```

---

## ⚡ Rate Limiting

```typescript
import { createRateLimiters } from './middleware/rateLimiter';
const { authLimiter, apiLimiter, readLimiter, writeLimiter } = createRateLimiters();

// Apply to route
app.post('/login', authLimiter.middleware(), handler);
app.get('/api/data', readLimiter.middleware(), handler);
```

---

## ✅ Input Validation

```typescript
import { validateInput, ValidationSchemas } from './middleware/validator';

// Use pre-built schema
router.post('/', validateInput(ValidationSchemas.createEmployee), handler);

// Custom schema
const schema = {
  email: { type: 'email', required: true },
  name: { type: 'string', minLength: 1, maxLength: 100 },
};
router.post('/', validateInput(schema), handler);
```

---

## 🚨 Error Handling

```typescript
import { asyncHandler, AppError, NotFoundError } from './middleware/errorHandler';

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await db.find(req.params.id);
    if (!item) throw new NotFoundError('Item', req.params.id);
    res.json({ data: item });
  })
);
```

---

## 📊 Logging

```typescript
const logger = (req as any).logger;
logger.info('User logged in', { userId: 'user-123' });
logger.error('Database error', { error: err.message });

// Logs auto-created in logs/ directory
// - logs/info-YYYY-MM-DD.log
// - logs/error-YYYY-MM-DD.log
// - logs/warning-YYYY-MM-DD.log
```

---

## 🧪 Test Examples

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"password"}' \
  | jq -r '.data.token')

# List employees
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/yoiusalkasja/ausoiahs1896347ih2ewdkjags

# Create employee
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"new@company.com",
    "firstName":"John",
    "lastName":"Doe",
    "departmentId":"dept-123",
    "designationId":"des-456",
    "dateOfJoining":"2024-02-01"
  }' \
  http://localhost:3000/poiqweuoisajd/129312893jksahjkhd123123
```

---

## 📋 HTTP Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | OK                                   |
| 201  | Created                              |
| 400  | Bad Request (validation error)       |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient role)        |
| 404  | Not Found                            |
| 409  | Conflict (duplicate)                 |
| 429  | Too Many Requests (rate limited)     |
| 500  | Server Error                         |

---

## 🔧 Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "requestId": "1643723400000-abc123def456"
}
```

---

## 🗂️ Project Structure

```
src/
├── middleware/
│   ├── logger.ts
│   ├── jwtAuth.ts
│   ├── routeObfuscator.ts
│   ├── routeHandler.ts
│   ├── rateLimiter.ts
│   ├── validator.ts
│   └── errorHandler.ts
└── routes/
    ├── index.ts
    ├── employees.ts
    ├── leaveRoutes.ts
    ├── payrollRoutes.ts
    ├── dashboardRoutes.ts
    └── approvalsRoutes.ts
```

---

## 📚 Documentation

- **Quick Start**: [API_ROUTES_QUICKSTART.md](./API_ROUTES_QUICKSTART.md)
- **Full Docs**: [API_ROUTES_IMPLEMENTATION.md](./API_ROUTES_IMPLEMENTATION.md)
- **Route Map**: [ROUTE_MAPPINGS_REFERENCE.md](./ROUTE_MAPPINGS_REFERENCE.md)
- **Examples**: [exampleImplementation.ts](./src/exampleImplementation.ts)

---

## ⚙️ Environment Variables

```env
JWT_SECRET=min-32-chars-secret-key
ROUTE_OBFUSCATION_SALT=your-salt-value
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PORT=3000
```

---

## 🎯 Common Middleware Chain

```
Request
  ↓
[Request Logger]
  ↓
[Sanitize Input]
  ↓
[Rate Limiter]
  ↓
[JWT Auth]
  ↓
[Role Check]
  ↓
[Input Validation]
  ↓
[Route Handler]
  ↓
[Error Handler]
  ↓
Response
```

---

## 💡 Pro Tips

1. **Always use asyncHandler** for route handlers
2. **Check logs/** for debugging
3. **Use /api/routes** (dev only) to see mappings
4. **Store JWT in secure httpOnly cookie**
5. **Validate all inputs before use**
6. **Use try-catch in asyncHandler functions**
7. **Set strong JWT_SECRET** in production
8. **Enable HTTPS** in production
9. **Use Redis** for distributed rate limiting
10. **Monitor logs** for suspicious activity

---

## 🔄 Frontend Integration Example

```typescript
const client = new APIClient(baseUrl, token);

// List employees
const employees = await client.get('/api/employees');

// Create employee
await client.post('/api/employees', {
  email: 'new@company.com',
  firstName: 'John',
  lastName: 'Doe',
  departmentId: 'dept-123',
  designationId: 'des-456',
  dateOfJoining: '2024-02-01',
});

// Request leave
await client.post('/api/leaves', {
  leaveTypeId: 'leave-123',
  startDate: '2024-02-15',
  endDate: '2024-02-17',
  reason: 'Sick leave',
});
```

---

## 🚨 Common Issues & Solutions

| Issue | Cause      | Solution                 |
| ----- | ---------- | ------------------------ |
| 401   | No token   | Add Authorization header |
| 403   | Wrong role | Check user role in token |
| 429   | Rate limit | Wait for reset window    |
| 400   | Bad input  | Check validation schema  |
| 404   | Not found  | Verify resource exists   |

---

## 📞 Quick Help

```bash
# Check health
curl http://localhost:3000/health

# View routes (dev)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/routes

# Check metrics
curl http://localhost:3000/metrics

# View logs
tail -f logs/info-*.log
```

---

**Last Updated**: February 2024  
**Status**: ✅ Production Ready  
**Version**: 1.0
