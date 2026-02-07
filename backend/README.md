# HRMS Backend - Node.js + Express + TypeScript

Production-ready Human Resource Management System backend built with Node.js, Express, TypeScript, PostgreSQL, MongoDB, and Redis.

## 🎯 Features

- **Multi-Tenancy**: Per-schema isolation with PostgreSQL
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **RBAC**: Role-Based Access Control middleware
- **PostgreSQL**: Relational data (employees, departments, leaves, payroll)
- **MongoDB**: Document storage for audit logs and notifications
- **Redis**: Session caching and frequent data caching
- **Type-Safe**: Full TypeScript support
- **Error Handling**: Comprehensive error handling with custom middleware
- **Logging**: Winston logger with file rotation
- **Docker**: Multi-stage Docker build with docker-compose
- **Migrations**: Knex.js database migrations

## 📋 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files (db, redis, logger, env)
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth, RBAC, error handling
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Utility functions (auth, validation)
│   ├── migrations/      # Database migrations
│   ├── app.ts           # Express app setup
│   └── server.ts        # Entry point
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Local development stack
├── knexfile.js          # Knex configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies
└── .env.example         # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation (Local Development)

1. **Clone and navigate**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run migrations**

   ```bash
   npm run db:migrate:dev
   ```

5. **Start development server**
   ```bash
   npm run dev:watch
   ```

Server will start on `http://localhost:3000`

### Installation (Docker)

1. **Setup environment**

   ```bash
   cp .env.example .env
   ```

2. **Start services**

   ```bash
   docker-compose up -d
   ```

3. **Run migrations inside container**

   ```bash
   docker-compose exec backend npm run db:migrate:dev
   ```

4. **Access services**
   - API: `http://localhost:3000`
   - pgAdmin: `http://localhost:5050`
   - MongoDB Express: `http://localhost:8081`

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new tenant + user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Employees

- `GET /api/v1/employees` - List employees
- `GET /api/v1/employees/:id` - Get employee
- `POST /api/v1/employees` - Create employee (HR_ADMIN)
- `PUT /api/v1/employees/:id` - Update employee (HR_ADMIN)
- `DELETE /api/v1/employees/:id` - Delete employee (HR_ADMIN)

### Leaves

- `GET /api/v1/leaves` - List leave requests
- `POST /api/v1/leaves` - Create leave request
- `PATCH /api/v1/leaves/:id/approve` - Approve leave (HR_ADMIN)
- `PATCH /api/v1/leaves/:id/reject` - Reject leave (HR_ADMIN)
- `GET /api/v1/leaves/balance/:employee_id` - Get leave balance

### Payroll

- `GET /api/v1/payroll/periods` - List payroll periods
- `POST /api/v1/payroll/periods` - Create period
- `POST /api/v1/payroll/periods/:id/generate-slips` - Generate salary slips
- `GET /api/v1/payroll/periods/:period_id/slips` - Get slips for period
- `GET /api/v1/payroll/slips/:slip_id` - Get salary slip
- `POST /api/v1/payroll/periods/:id/process` - Process payroll

## 🔐 Authentication

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!",
    "full_name": "Admin User",
    "tenant_name": "My Company"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!",
    "tenant_slug": "my-company"
  }'
```

### Using Access Token

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/api/v1/employees
```

## 📦 Database Schema

### Public Schema (Multi-tenancy)

- **tenants**: Tenant information
- **users**: User accounts
- **roles**: User roles per tenant

### Tenant Schema (Per-tenant tables)

- **employees**: Employee records
- **departments**: Department hierarchy
- **leave_types**: Leave categories
- **leave_requests**: Leave applications
- **attendance**: Daily attendance records
- **payroll_periods**: Monthly/weekly payroll cycles
- **salary_slips**: Individual salary details
- **audit_log**: All data changes


## 📝 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run dev:watch       # Start with hot reload

# Production
npm run build           # Compile TypeScript
npm run start           # Start production server

# Quality
npm run lint            # Check code quality
npm run lint:fix        # Fix linting issues
npm run format          # Format code with Prettier
npm run type-check      # TypeScript type checking

# Database
npm run db:migrate:dev  # Run migrations (dev)
npm run db:migrate:prod # Run migrations (prod)
npm run db:seed         # Seed database
npm run db:rollback     # Rollback last migration

# Docker
npm run docker:build    # Build Docker image
npm run docker:run      # Run Docker container
```

## 🐳 Docker Commands

```bash
# Build and start
docker-compose up --build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend

# Run migrations
docker-compose exec backend npm run db:migrate:dev

# Shell into container
docker-compose exec backend sh
```

## 📊 Monitoring & Logs

Logs are stored in `logs/` directory:

- `combined.log` - All logs
- `error.log` - Errors only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled rejections

In Docker:

```bash
# View backend logs
docker-compose logs -f backend

# View all service logs
docker-compose logs -f
```

## 🔒 Environment Variables

See `.env.example` for all available variables:

- Database credentials
- Redis configuration
- JWT secrets
- OAuth2 credentials
- AWS integration
- CORS settings

**⚠️ Important**: Change JWT secrets and database passwords in production!

## 🛠️ Configuration

### PostgreSQL Connection Pooling

Configure in `.env`:

```
DB_POOL_MIN=5    # Minimum connections
DB_POOL_MAX=20   # Maximum connections (increase for production)
```

### Redis Caching

```
REDIS_URL=redis://localhost:6379
REDIS_DB=0
```

### JWT Expiry

```
JWT_EXPIRY=3600              # Access token: 1 hour
JWT_REFRESH_EXPIRY=604800    # Refresh token: 7 days
```

## 🚨 Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields",
    "details": {}
  }
}
```

Common error codes:

- `UNAUTHORIZED` - Authentication failed
- `FORBIDDEN` - Authorization failed (RBAC)
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input
- `INTERNAL_ERROR` - Server error
- `TENANT_NOT_FOUND` - Tenant doesn't exist

## 📚 API Response Format

Success response:

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error response:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## 🔄 Multi-Tenancy Architecture

Each tenant has its own PostgreSQL schema:

- Public schema: Shared tenant & user data
- `tenant_{id}`: Tenant-specific data
- Automatic schema selection via middleware
- Data isolation guaranteed by PostgreSQL

## 🔐 RBAC Roles

Default roles:

- `SUPER_ADMIN` - System administrator
- `HR_ADMIN` - HR department admin
- `PAYROLL_MANAGER` - Payroll processing
- `MANAGER` - Department manager
- `EMPLOYEE` - Regular employee

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change JWT secrets
- [ ] Set strong database passwords
- [ ] Enable SSL for PostgreSQL
- [ ] Configure Redis password
- [ ] Setup environment variables securely
- [ ] Run database migrations
- [ ] Enable CORS appropriately
- [ ] Setup monitoring/logging
- [ ] Configure backups

### Production Build

```bash
# Build image
docker build -t hrms-backend:1.0.0 .

# Run container
docker run -d \
  --env-file .env.prod \
  -p 3000:3000 \
  --name hrms-api \
  hrms-backend:1.0.0
```

## 📖 API Documentation

### OpenAPI/Swagger

API documentation is available via Swagger UI (can be added):

```
GET /api/docs - OpenAPI specification
GET /api/api-docs - Swagger UI
```

### Generate TypeScript Client

```bash
npx openapi-generator-cli generate \
  -i http://localhost:3000/api/swagger.json \
  -g typescript-axios \
  -o ./generated-client
```

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/xyz`
2. Commit changes: `git commit -am 'Add xyz'`
3. Push to branch: `git push origin feature/xyz`
4. Create Pull Request

Code standards:

- Use TypeScript strictly
- Write unit tests
- Follow ESLint rules
- Format with Prettier
- Document complex logic

## 📄 License

PROPRIETARY - Masirat Al Ibda

## 🆘 Support

For issues and questions:

1. Check logs in `logs/` directory
2. Review error responses
3. Check `.env` configuration
4. Verify database connectivity
5. Check Redis/MongoDB availability

## 📞 Contact

Email: support@hrms.masirat.com
Slack: #hrms-backend
