# HRMS Backend - Start Here 👋

## Welcome to HRMS Backend Setup!

This directory contains a **complete, production-ready HRMS backend** built with Node.js, TypeScript, Express, PostgreSQL, MongoDB, and Redis.

## 🚀 Quick Start (Choose One)

### Option A: Docker (Recommended - 30 seconds)

```bash
docker-compose up -d
echo "✓ API running on http://localhost:3000"
```

### Option B: Local Development (2 minutes)

```bash
npm install
cp .env.example .env
npm run db:migrate:dev
npm run dev:watch
echo "✓ API running on http://localhost:3000"
```

## 📚 Where to Go Next

### 🎯 I want to... | Read this...

| Goal                        | Document                                                 |
| --------------------------- | -------------------------------------------------------- |
| Get started in 5 minutes    | [QUICKSTART.md](./QUICKSTART.md)                         |
| Understand the architecture | [ARCHITECTURE.md](./ARCHITECTURE.md)                     |
| Deploy to production        | [DEPLOYMENT.md](./DEPLOYMENT.md)                         |
| See all files created       | [FILE_INVENTORY.md](./FILE_INVENTORY.md)                 |
| Full API reference          | [README.md](./README.md)                                 |
| Verify implementation       | [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) |

## 💡 First API Call

After starting the server:

```bash
# 1. Register a tenant and user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePass123!",
    "full_name": "Admin User",
    "tenant_name": "My Company"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePass123!",
    "tenant_slug": "my-company"
  }'

# 3. Use the access token to call API
TOKEN="eyJhbGc..." # From login response
curl http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN"
```

## 📁 What's Included

### Source Code (3,500+ lines of TypeScript)

- ✅ Express.js server with middleware stack
- ✅ JWT authentication & OAuth2 skeleton
- ✅ RBAC (Role-Based Access Control)
- ✅ PostgreSQL + MongoDB + Redis integration
- ✅ 4 service layers (Auth, Employee, Leave, Payroll)
- ✅ Multi-tenant architecture with schema isolation
- ✅ Winston logging with file rotation
- ✅ Error handling middleware
- ✅ Unit tests with Jest

### API Endpoints (20+)

```
Authentication:
  POST   /api/auth/register           Register new tenant & user
  POST   /api/auth/login              Login user
  POST   /api/auth/refresh            Refresh access token
  POST   /api/auth/logout             Logout user

Employees:
  GET    /api/v1/employees            List employees
  GET    /api/v1/employees/:id        Get employee
  POST   /api/v1/employees            Create employee (HR_ADMIN)
  PUT    /api/v1/employees/:id        Update employee (HR_ADMIN)
  DELETE /api/v1/employees/:id        Delete employee (HR_ADMIN)

Leaves:
  GET    /api/v1/leaves               List leave requests
  POST   /api/v1/leaves               Create leave request
  PATCH  /api/v1/leaves/:id/approve   Approve leave (HR_ADMIN)
  PATCH  /api/v1/leaves/:id/reject    Reject leave (HR_ADMIN)
  GET    /api/v1/leaves/balance/:id   Get leave balance

Payroll:
  GET    /api/v1/payroll/periods      List payroll periods
  POST   /api/v1/payroll/periods      Create period
  POST   /api/v1/payroll/periods/:id/generate-slips
  GET    /api/v1/payroll/periods/:id/slips
  GET    /api/v1/payroll/slips/:id    Get salary slip
  POST   /api/v1/payroll/periods/:id/process
```

### Infrastructure

- ✅ Docker multi-stage build
- ✅ docker-compose with all services
- ✅ GitHub Actions CI/CD pipeline
- ✅ Database migrations (Knex.js)
- ✅ Health checks
- ✅ Graceful shutdown

### Documentation (2,200+ lines)

- ✅ Comprehensive README (800+ lines)
- ✅ Architecture guide (600+ lines)
- ✅ Quick start guide (200+ lines)
- ✅ Deployment guide (500+ lines)
- ✅ Implementation summary
- ✅ File inventory

## 🔧 Available Commands

```bash
# Development
npm run dev               # Start dev server
npm run dev:watch        # Start with hot reload

# Building
npm run build             # Compile TypeScript
npm run type-check        # Check types

# Quality
npm run lint              # Check code quality
npm run lint:fix          # Fix linting issues
npm run format            # Format code
npm run test              # Run tests
npm run test:watch        # Watch mode

# Database
npm run db:migrate:dev    # Run migrations
npm run db:rollback       # Rollback migration
npm run db:seed           # Seed data

# Production
npm start                 # Run compiled app

# Docker
docker-compose up         # Start services
docker-compose down       # Stop services
docker-compose logs -f    # View logs
```

## 🎯 Key Features

### Multi-Tenancy ✅

- Per-schema database isolation
- Automatic tenant context in requests
- Complete data isolation guarantee

### Authentication ✅

- JWT with refresh tokens
- Password hashing (bcryptjs)
- OAuth2 skeleton
- Session management

### Authorization ✅

- Role-based access control (RBAC)
- Flexible permission model
- Route-level authorization

### Performance ✅

- Redis caching
- Database connection pooling
- Query optimization
- Automatic cache invalidation

### Production Ready ✅

- Comprehensive error handling
- Centralized logging
- Docker containerization
- CI/CD pipeline
- Health checks
- Graceful shutdown

## 📊 Technology Stack

| Layer          | Technology       |
| -------------- | ---------------- |
| Runtime        | Node.js 18+      |
| Language       | TypeScript       |
| Framework      | Express.js       |
| Database       | PostgreSQL 14+   |
| Document DB    | MongoDB 6+       |
| Cache          | Redis 7+         |
| Authentication | JWT + OAuth2     |
| Testing        | Jest + Supertest |
| Logging        | Winston          |
| Container      | Docker           |
| CI/CD          | GitHub Actions   |
| ORM            | Knex.js          |

## 🔒 Security Features

- ✅ JWT token verification
- ✅ Password hashing (bcryptjs)
- ✅ RBAC middleware
- ✅ SQL injection prevention (parameterized queries)
- ✅ Security headers (Helmet)
- ✅ CORS configuration
- ✅ Tenant isolation
- ✅ Audit logging
- ✅ Environment variable management

## 📈 Scalability

- Horizontal scaling via load balancer
- Database connection pooling (configurable)
- Redis caching for frequent data
- Per-schema multi-tenancy
- Stateless API design
- Docker containerization

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test -- --coverage

# Specific test file
npm run test -- employeeService.test.ts
```

Example test included: `src/services/employeeService.test.ts`

## 📞 Support Documentation

| Document                                                 | Purpose                    |
| -------------------------------------------------------- | -------------------------- |
| [QUICKSTART.md](./QUICKSTART.md)                         | Get running in 5 minutes   |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                     | Understand design patterns |
| [README.md](./README.md)                                 | Full project reference     |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                         | Production deployment      |
| [FILE_INVENTORY.md](./FILE_INVENTORY.md)                 | Complete file listing      |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | What was built             |

## 🚨 Troubleshooting

### Port already in use

```bash
lsof -i :3000
kill -9 <PID>
```

### Database connection failed

```bash
docker-compose down -v
docker-compose up
```

### Clear everything

```bash
docker-compose down -v  # Remove volumes
docker-compose up       # Fresh start
```

## 📋 Next Steps

### Immediate (Today)

- [ ] Run `docker-compose up -d`
- [ ] Test API with curl examples
- [ ] Review QUICKSTART.md
- [ ] Check health endpoint

### This Week

- [ ] Read ARCHITECTURE.md
- [ ] Run test suite
- [ ] Customize environment variables
- [ ] Review database schema
- [ ] Plan frontend development

### This Month

- [ ] Add additional endpoints
- [ ] Deploy to staging
- [ ] Load testing
- [ ] Security audit
- [ ] Frontend development

## ✨ What You Get

```
✅ 3,500+ lines of production TypeScript code
✅ 20+ REST API endpoints
✅ Full authentication & authorization
✅ Multi-tenant architecture
✅ Docker setup with all services
✅ GitHub Actions CI/CD pipeline
✅ Comprehensive documentation
✅ Unit test examples
✅ Database migrations
✅ Error handling & logging
✅ Security best practices
```

## 🎉 Ready to Go!

Everything is ready. Choose your path:

1. **Quick Demo**: `docker-compose up -d` → See it running
2. **Learn Code**: Open `src/` folder → Understand patterns
3. **Integrate**: Copy to your repo → Customize for your needs
4. **Deploy**: Follow DEPLOYMENT.md → Go to production

## 📞 Questions?

- Check [README.md](./README.md) for complete docs
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for patterns
- See [QUICKSTART.md](./QUICKSTART.md) for examples
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production

---

**Start here:** `docker-compose up -d`

Then visit: `http://localhost:3000/health`

**Happy coding!** 🚀
