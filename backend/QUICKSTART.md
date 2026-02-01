# HRMS Backend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Docker (Recommended)

```bash
# Navigate to backend directory
cd backend

# Start all services
docker-compose up -d

# Wait for services to be healthy (30 seconds)
docker-compose ps

# View logs
docker-compose logs -f backend
```

**API will be available at:** `http://localhost:3000`

### Option 2: Local Development

**Prerequisites:**

- Node.js 18+
- PostgreSQL 14+ running
- MongoDB 6+ running
- Redis 7+ running

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npm run db:migrate:dev

# Start dev server
npm run dev:watch
```

## 📝 First Steps

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Register Tenant & User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mycompany.com",
    "password": "SecurePass123!",
    "full_name": "Admin User",
    "tenant_name": "My Company"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "user_id": "uuid...",
    "email": "admin@mycompany.com",
    "tenant_id": "uuid..."
  }
}
```

### 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mycompany.com",
    "password": "SecurePass123!",
    "tenant_slug": "my-company"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 3600,
    "user": {
      "id": "uuid...",
      "email": "admin@mycompany.com",
      "roles": ["SUPER_ADMIN"]
    }
  }
}
```

### 4. Create an Employee

```bash
TOKEN="eyJhbGc..."  # From login response

curl -X POST http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email_company": "john.doe@mycompany.com",
    "job_title": "Software Engineer",
    "department_id": "uuid...",
    "employment_type": "full_time",
    "start_date": "2024-01-01"
  }'
```

### 5. List Employees

```bash
curl http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN"
```

## 📚 Available Services

Once containers are running:

| Service         | URL                   | Default Credentials      |
| --------------- | --------------------- | ------------------------ |
| API             | http://localhost:3000 | N/A                      |
| pgAdmin         | http://localhost:5050 | admin@hrms.local / admin |
| MongoDB Express | http://localhost:8081 | N/A                      |
| PostgreSQL      | localhost:5432        | hrms_dev / dev_password  |
| Redis           | localhost:6379        | redis_dev_password       |

## 🧪 Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test -- --coverage

# Integration tests
npm run test:integration
```

## 🐛 Debugging

### View Logs

```bash
# Docker logs
docker-compose logs -f backend

# Local logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Database Access

**PostgreSQL:**

```bash
# Via pgAdmin: http://localhost:5050
# Via psql:
psql -h localhost -U hrms_dev -d hrms_dev
```

**MongoDB:**

```bash
# Via MongoDB Express: http://localhost:8081
# Via mongosh:
mongosh "mongodb://localhost:27017"
```

**Redis:**

```bash
redis-cli -h localhost -p 6379
```

## 🔧 Common Commands

```bash
# Build TypeScript
npm run build

# Format code
npm run format

# Lint
npm run lint:fix

# Database migrations
npm run db:migrate:dev
npm run db:rollback

# Docker operations
docker-compose up -d              # Start
docker-compose down               # Stop
docker-compose logs -f            # View logs
docker-compose exec backend sh    # Shell access
```

## 🚨 Troubleshooting

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database connection failed

```bash
# Check PostgreSQL is running
docker-compose exec postgres pg_isready

# Check Redis is running
docker-compose exec redis redis-cli ping

# Check MongoDB is running
docker-compose exec mongo mongosh --eval "db.runCommand('ping')"
```

### Clear everything and restart

```bash
# Stop and remove all containers
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

## 📖 Documentation

- **[README.md](./README.md)** - Project overview & setup
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture & patterns
- **[Package.json Scripts](./package.json)** - Available npm scripts

## 🆘 Need Help?

1. Check `logs/` directory for error messages
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for patterns
3. Check [README.md](./README.md) for API documentation
4. Verify `.env` configuration
5. Run `npm run type-check` for TypeScript errors

## 📞 Support

Email: support@hrms.masirat.com
