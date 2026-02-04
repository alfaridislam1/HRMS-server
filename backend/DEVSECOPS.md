# DevSecOps Implementation Guide - HRMS

## Overview

This document outlines the complete DevSecOps implementation for HRMS, including security scanning, monitoring, and compliance.

## Security Components

### 1. Authentication & Authorization

#### JWT Authentication
- **Location**: `src/middleware/auth.ts`, `src/middleware/jwtAuth.ts`
- **Features**:
  - Access tokens (1 hour expiry)
  - Refresh tokens (7 days expiry)
  - Token rotation
  - Secure token validation

#### OAuth2 Integration
- **Location**: `src/middleware/oauth2.ts`
- **Providers**: Google, Microsoft, GitHub
- **Usage**: See `src/middleware/oauth2.ts` for initialization

#### RBAC (Role-Based Access Control)
- **Location**: `src/middleware/rbac.ts`
- **Usage**:
```typescript
import { rbacMiddleware } from '@middleware/rbac';

router.get('/employees', 
  authMiddleware,
  rbacMiddleware(['hr', 'admin'], ['employees:read']),
  getEmployees
);
```

#### ABAC (Attribute-Based Access Control)
- **Location**: `src/middleware/abac.ts`
- **Usage**:
```typescript
import { abacMiddleware, CommonABACPolicies } from '@middleware/abac';

router.get('/employees/:id',
  authMiddleware,
  abacMiddleware([CommonABACPolicies.sameDepartment()]),
  getEmployee
);
```

### 2. API Security

#### Route Obfuscation
- **Location**: `src/middleware/routeObfuscator.ts`
- **Purpose**: Hide internal API structure from external clients
- **Configuration**: Routes mapped in `DEFAULT_ROUTE_MAPPINGS`

#### API Gateway
- **Location**: `infrastructure/api-gateway.yaml`
- **Features**:
  - WAF rules (rate limiting, SQL injection, XSS protection)
  - API keys management
  - Usage plans
  - Throttling

### 3. Secrets Management

#### AWS Secrets Manager Integration
- **Location**: `src/utils/secretsManager.ts`
- **Usage**:
```typescript
import { loadHRMSSecrets, getSecret, getSecretJSON } from '@utils/secretsManager';

// Load all secrets at startup
await loadHRMSSecrets();

// Get specific secret
const dbPassword = await getSecret('hrms/db/password');

// Get JSON secret
const config = await getSecretJSON<{apiKey: string}>('hrms/config');
```

#### Secret Names
- Database password: `hrms/db/password`
- JWT secrets: `hrms/jwt/secret`, `hrms/jwt/refresh-secret`
- OAuth2 secrets: `hrms/oauth/{provider}/client-secret`
- AWS credentials: `hrms/aws/s3/access-key`, `hrms/aws/s3/secret-key`

### 4. Container Security

#### Docker Image Scanning
- **CI/CD**: Trivy scans in GitHub Actions
- **Scans**:
  - Filesystem scan (source code)
  - Container image scan
  - Dependency scan (npm audit)
- **Blocking**: Critical and High severity vulnerabilities

#### Dockerfile Security
- Multi-stage builds
- Non-root user
- Minimal base images (Alpine)
- Health checks
- Resource limits

### 5. Monitoring & Logging

#### Prometheus Metrics
- **Location**: `src/middleware/metrics.ts`
- **Endpoint**: `/metrics`
- **Metrics**:
  - HTTP request count
  - HTTP request duration
  - Error count
  - Custom business metrics

#### Grafana Dashboards
- **Location**: `monitoring/grafana/`
- **Setup**: See `docker-compose.monitoring.yml`
- **Access**: http://localhost:3001 (admin/admin)

#### CloudWatch Integration
- **Location**: `src/utils/cloudwatch.ts`
- **Features**:
  - Log streaming
  - Custom metrics
  - Alarms
- **Usage**:
```typescript
import { CloudWatchMetrics } from '@utils/cloudwatch';

// Track API request
await CloudWatchMetrics.trackRequest('GET', '/api/employees', 200, 0.5);

// Track error
await CloudWatchMetrics.trackError('DatabaseError', 'CONNECTION_FAILED');
```

### 6. Backup & Restore

#### RDS Backup
- **Script**: `scripts/backup-rds.sh`
- **Usage**:
```bash
chmod +x scripts/backup-rds.sh
./scripts/backup-rds.sh
```
- **Features**:
  - Automated daily backups
  - S3 storage
  - Integrity verification
  - Retention management (30 days)

#### RDS Restore
- **Script**: `scripts/restore-rds.sh`
- **Usage**:
```bash
./scripts/restore-rds.sh rds_backup_hrms_prod_20240204_120000.sql.gz
```

#### S3 Backup
- **Script**: `scripts/backup-s3.sh`
- **Usage**:
```bash
./scripts/backup-s3.sh
```
- **Features**:
  - Bucket sync
  - Integrity verification
  - Restore testing

## CI/CD Security Pipeline

### Security Checks in CI/CD

1. **Code Quality**
   - ESLint
   - TypeScript type checking
   - Prettier formatting

2. **Dependency Scanning**
   - npm audit (high severity)
   - Trivy filesystem scan

3. **Container Scanning**
   - Trivy container image scan
   - Critical/High vulnerabilities block deployment

4. **Code Analysis**
   - CodeQL SAST analysis
   - SARIF reports uploaded to GitHub Security

5. **Testing**
   - Unit tests
   - Integration tests
   - Security tests (if applicable)

## Setup Instructions

### 1. AWS Secrets Manager Setup

```bash
# Create secrets
aws secretsmanager create-secret \
  --name hrms/db/password \
  --secret-string "your-db-password"

aws secretsmanager create-secret \
  --name hrms/jwt/secret \
  --secret-string "your-jwt-secret-min-32-chars"

# Load secrets at startup (in application)
import { loadHRMSSecrets } from '@utils/secretsManager';
await loadHRMSSecrets();
```

### 2. Prometheus + Grafana Setup

```bash
# Start monitoring stack
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Access Grafana
# URL: http://localhost:3001
# Username: admin
# Password: admin (change on first login)
```

### 3. CloudWatch Setup

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/hrms-backend

# Create log stream
aws logs create-log-stream \
  --log-group-name /ecs/hrms-backend \
  --log-stream-name backend-$(date +%Y%m%d)
```

### 4. API Gateway Deployment

```bash
# Deploy API Gateway
aws cloudformation deploy \
  --template-file infrastructure/api-gateway.yaml \
  --stack-name hrms-api-gateway \
  --parameter-overrides \
    AllowedIPs=0.0.0.0/0 \
    BackendLoadBalancer=your-alb-dns-name
```

### 5. Backup Automation

```bash
# Add to crontab for daily backups
0 2 * * * /path/to/scripts/backup-rds.sh >> /var/log/rds-backup.log 2>&1
0 3 * * * /path/to/scripts/backup-s3.sh >> /var/log/s3-backup.log 2>&1
```

## Security Checklist

See `SECURITY_CHECKLIST.md` for comprehensive security validation checklist.

## Monitoring Dashboards

### Grafana Dashboards

1. **API Performance**
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate
   - Throughput

2. **System Resources**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

3. **Database Metrics**
   - Connection pool usage
   - Query performance
   - Slow queries
   - Connection errors

4. **Security Metrics**
   - Authentication failures
   - Authorization failures
   - Rate limit hits
   - Suspicious activity

## Alerting

### Prometheus Alerts

- High error rate (>5% for 5 minutes)
- High response time (p95 > 2s)
- Database connection failure
- Redis connection failure
- High memory usage (>90%)
- High CPU usage (>80%)
- Low disk space (<10%)
- Service down

### CloudWatch Alarms

- API error rate
- Database connection errors
- High latency
- Unusual traffic patterns

## Compliance

### Audit Logging

- All authentication events logged
- Authorization failures logged
- Data access logged
- Administrative actions logged
- Audit logs retained for 7 years

### Data Protection

- Encryption at rest (RDS, S3)
- Encryption in transit (TLS 1.2+)
- Data retention policies
- Data deletion procedures

## Incident Response

### Security Incident Procedure

1. **Detection**: Automated alerts + manual monitoring
2. **Containment**: Isolate affected systems
3. **Investigation**: Review logs, identify root cause
4. **Remediation**: Fix vulnerability, restore service
5. **Post-Incident**: Review, update procedures

### Contacts

- Security Team: security@hrms.masirat.com
- On-Call Engineer: oncall@hrms.masirat.com
- Escalation: escalation@hrms.masirat.com

## Regular Maintenance

### Weekly
- Review security alerts
- Check backup status
- Review access logs
- Update dependencies

### Monthly
- Security audit
- Penetration testing (if applicable)
- Review and rotate secrets
- Update security policies

### Quarterly
- Disaster recovery drill
- Security training
- Compliance review
- Architecture review

---

**Last Updated**: February 4, 2026
**Version**: 1.0.0
