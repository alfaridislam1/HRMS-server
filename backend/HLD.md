# HRMS SaaS - High Level Design (HLD)

**Project:** Monolithic HRMS (Human Resource Management System) SaaS Platform  
**Target Market:** Oman & GCC Region  
**Date:** February 2, 2026  
**Version:** 1.0

---

## 1. Executive Summary

This document outlines the architecture for a multi-tenant HRMS SaaS platform designed to serve organizations across the Oman and GCC regions. The system is built as a monolith with clear separation of concerns, supporting 100s of organizations with per-schema multi-tenancy isolation.

**Key Metrics:**

- **Tenants:** Scalable to 1000+ organizations
- **Users per tenant:** 10K+ concurrent users
- **Availability:** 99.9% SLA
- **Compliance:** GCC Labor Law, Oman Labor Law, Data Protection

---

## 2. Technology Stack Rationale

### 2.1 Frontend: React + Redux (RTK Query)

**Why React?**

- Component-driven architecture → easy to maintain and scale
- Virtual DOM → high performance for data-heavy HRMS forms
- Ecosystem maturity (RTK Query, React Router, Vite)

**Why Redux Toolkit (RTK) Query?**

- Built-in data fetching & caching → eliminates extra libraries
- Normalized state management → easy to sync with server
- Automatically handles loading/error states
- HRMS requires complex state (employees, payroll, attendance) → RTK ideal

**Alternative considered:** Vue 3 / Angular → Rejected (React's ecosystem stronger for enterprise)

### 2.2 Backend: Node.js + Express

**Why Node.js?**

- Non-blocking I/O → handles concurrent HTTP requests from many tenants
- JavaScript fullstack → shared types (TypeScript) between frontend & backend
- Mature ecosystem (libraries, monitoring tools)
- Fast startup time → suitable for containerized workloads

**Why Express?**

- Minimal framework → explicit control over middleware
- Middleware ecosystem mature (auth, validation, logging)
- Good performance for CRUD-heavy operations
- Alternative frameworks (Nest.js, Hapi) add unnecessary complexity for monolith

**Not chosen:** Go, Python FastAPI (would require separate teams; JS fullstack preferred)

### 2.3 Database: PostgreSQL + MongoDB

**PostgreSQL (Primary)**

- **Structured data:** Employees, payroll, policies, compliance logs, audit trails
- **Transactions:** ACID guarantees for payroll calculations
- **Per-schema multi-tenancy:** Each tenant gets isolated schema in same DB
- **Full-text search:** Employee records, document search
- **JSONB support:** Store flexible org structures, custom fields

**MongoDB (Secondary)**

- **Unstructured/time-series data:** Activity logs, audit events, real-time dashboards
- **High write throughput:** Logs ingestion from multiple tenants
- **TTL indexes:** Auto-expire old logs after 90 days
- **Scalability:** Sharding by tenant ID for future horizontal growth

**Not chosen:** Single SQL DB (would require row-level security; schemas cleaner). NoSQL-only (would need strong schema for payroll).

### 2.4 Cache: Redis

**Why Redis?**

- Sub-millisecond response for frequently accessed data (org settings, user roles, leave balances)
- Pub/Sub → real-time notifications (leave approvals, payroll completion)
- Session storage → distribute sessions across multiple backend instances
- Distributed lock → prevent concurrent payroll runs

**Use cases:**

- User authentication tokens (15-min TTL)
- Organization settings cache (1-hour TTL)
- Leave balance snapshot (refreshed on update)
- Real-time notification channels

### 2.5 CI/CD: GitHub Actions

**Why GitHub Actions?**

- Native integration with GitHub repos
- Free for public repos; reasonable pricing for private
- YAML config stored with code → version controlled
- Good ecosystem of Actions (Docker, AWS, testing)

**Pipeline stages:**

1. **Lint & Format:** ESLint, Prettier
2. **Unit Tests:** Jest (backend), Vitest (frontend)
3. **Integration Tests:** Supertest (API), RTL (components)
4. **Security Scan:** Snyk, npm audit
5. **Build:** Docker image for backend, bundle frontend
6. **Push to ECR:** AWS Elastic Container Registry
7. **Deploy to ECS:** Trigger CloudFormation stack update

### 2.6 Container: Docker

**Why Docker?**

- Reproducible environments across dev/staging/prod
- Easy horizontal scaling with orchestration
- Small image size (Node.js ~150MB base)
- Security scanning during build

**Strategy:**

- **Multi-stage builds:** Separate build and runtime stages → smaller final image
- **Image registry:** AWS ECR (no cost for storage, pay for transfer)
- **Image tagging:** `hrms-backend:v1.2.3-prod`, `hrms-frontend:v1.2.3-prod`

### 2.7 Cloud: AWS

**Why AWS?**

- **ECS/Fargate:** Managed container orchestration (no Kubernetes overhead)
- **RDS:** Managed PostgreSQL with automated backups, failover
- **ElastiCache:** Managed Redis with Multi-AZ
- **S3:** Scalable object storage for documents, payslips, backups
- **CloudFront:** CDN for frontend assets, documents
- **CloudWatch:** Monitoring & logging (integrated with AWS services)
- **Regional presence:** AWS has Middle East region (Bahrain)

**Not chosen:** Azure (less regional presence), GCP (higher costs for this workload)

---

## 3. Multi-Tenant Architecture (Per-Schema Isolation)

### 3.1 Isolation Strategy: Database Schema Isolation

**Approach:**

- **One PostgreSQL database** → all tenants
- **One schema per tenant:** `tenant_001`, `tenant_002`, etc.
- **Shared application server:** Single Node.js app serves all tenants
- **Tenant context:** Extracted from JWT token (e.g., `tenant_id: "tenant_001"`)

**Pros:**

- Strong isolation (schema-level)
- Easy to backup/restore individual tenants
- Easy to query across tenants (admin dashboards)
- Cost-efficient (one DB instance)

**Cons:**

- Moderate scaling limit (~1000 schemas before performance degrades)
- Schema migrations must run on all schemas
- Requires disciplined SQL patterns (schema prefixing)

### 3.2 Tenant Context Flow

```
Request (JWT: tenant_id=tenant_001, user_id=user_123)
    ↓
[Auth Middleware] Extract tenant_id from JWT
    ↓
[Tenant Middleware] Set PostgreSQL search_path to tenant_001
    ↓
[Request Handler] Queries automatically scoped to tenant_001 schema
    ↓
Response (data only from tenant_001)
```

### 3.3 Schema Structure

```
Database: hrms_prod
├── Schema: public (shared)
│   ├── tenants (org metadata: name, plan, status)
│   ├── tenant_settings (customization per org)
│   └── audit_log (cross-tenant audit)
├── Schema: tenant_001 (Org A)
│   ├── employees
│   ├── payroll
│   ├── leave_requests
│   ├── attendance
│   └── [other tables]
├── Schema: tenant_002 (Org B)
│   ├── employees
│   ├── payroll
│   ├── leave_requests
│   ├── attendance
│   └── [other tables]
└── ... more tenant schemas
```

---

## 4. Box-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           End Users (Browser)                        │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTPS
                                   ↓
                    ┌──────────────────────────┐
                    │   AWS CloudFront CDN     │
                    │  (Frontend Assets Cache) │
                    └──────────┬───────────────┘
                               │ HTTPS
                               ↓
    ┌─────────────────────────────────────────────────────┐
    │         Application Load Balancer (ALB)             │
    │  (Routes /api → backend, / → frontend)             │
    └──────────────────┬────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │ Backend    │ │ Backend    │ │ Backend    │
    │ ECS Task 1 │ │ ECS Task 2 │ │ ECS Task 3 │
    │(Node+Exp) │ │(Node+Exp) │ │(Node+Exp) │
    └────────────┘ └────────────┘ └────────────┘
        │              │              │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │  RDS      │ │ElastiCache │ │    S3      │
    │PostgreSQL │ │   Redis    │ │(Documents) │
    │Multi-AZ   │ │ Multi-AZ   │ │            │
    └────────────┘ └────────────┘ └────────────┘
        │              │              │
        └──────────────┴──────────────┘
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
    ┌────────────┐           ┌──────────────┐
    │   MongoDB  │           │  CloudWatch  │
    │(Logs/Audit)│           │(Monitoring)  │
    └────────────┘           └──────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ↓                ↓                ↓
             ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
             │ Prometheus  │  │   Grafana   │  │   Alarms    │
             │  (Metrics)  │  │ (Dashboards)│  │  (SNS/PagerDuty)
             └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

**Flow:**

```
User Login (email + password)
    ↓
[Backend] Validate credentials against PostgreSQL
    ↓
[JWT Creation] Issue JWT with claims: { user_id, tenant_id, roles, permissions, exp }
    ↓
[Frontend] Store JWT in httpOnly cookie + memory
    ↓
[Subsequent Requests] Include JWT in Authorization header
    ↓
[Backend Auth Middleware] Verify JWT signature (RS256 - asymmetric)
    ↓
[Request Allowed/Denied] Based on JWT claims
```

**JWT Structure:**

```json
{
  "user_id": "usr_123",
  "tenant_id": "tenant_001",
  "email": "alfarid@masirat.com",
  "roles": ["HR_ADMIN", "PAYROLL"],
  "permissions": ["read:employees", "write:payroll", "approve:leave"],
  "iat": 1707000000,
  "exp": 1707003600
}
```

**Why RS256?**

- Asymmetric: Backend signs with private key, frontend/mobile verifies with public key
- Scales across microservices (if needed later)
- Revocation: Invalid token list (Redis blacklist) checked on each request

### 5.2 RBAC + ABAC (Attribute-Based Access Control)

**RBAC Levels (Per Tenant):**

- `SUPER_ADMIN` → All operations
- `HR_ADMIN` → Employee records, reports (no payroll)
- `PAYROLL_MANAGER` → Payroll processing, salary slips
- `EMPLOYEE` → Own records, leave apply, attendance view
- `MANAGER` → Team's attendance, leave approvals

**ABAC (Attribute-based):**

- Attribute: `department` → HR manager can only see HR dept employees
- Attribute: `cost_center` → Finance manager sees related payroll
- Attribute: `salary_grade` → Senior staff cannot see junior's salaries
- Implementation: PostgreSQL row-level security (RLS) policies

**Example RLS Policy:**

```sql
CREATE POLICY emp_department_isolation ON tenant_001.employees
  USING (department_id IN (
    SELECT department_id FROM tenant_001.employee_assignments
    WHERE user_id = current_user_id()
  ));
```

### 5.3 Data Encryption

**In Transit:**

- TLS 1.3 for all HTTP connections
- AWS ALB enforces HTTPS only
- Certificate managed by AWS ACM

**At Rest:**

- **PostgreSQL:** AWS RDS encryption (AES-256) via KMS
- **S3 documents:** Server-side encryption (SSE-S3)
- **Redis:** Encryption at rest via ElastiCache parameter group
- **Sensitive fields:** Salary, SSN → encrypted at DB layer using PGCrypto

**Example PostgreSQL Encryption:**

```sql
CREATE TABLE tenant_001.employees (
  id UUID PRIMARY KEY,
  name TEXT,
  ssn_encrypted BYTEA,
  salary_encrypted NUMERIC
);

INSERT INTO employees (name, ssn_encrypted) VALUES
  ('Ahmed', pgp_sym_encrypt('123-45-6789', 'secret_key'));

SELECT name, pgp_sym_decrypt(ssn_encrypted, 'secret_key') as ssn
FROM employees;
```

### 5.4 API Security

**Mechanisms:**

1. **Rate Limiting:** 1000 req/min per IP (AWS WAF)
2. **CORS:** Allow only frontend domain
3. **CSRF Protection:** Double-submit cookie token
4. **Input Validation:** JSON schema validation on all endpoints
5. **SQL Injection Prevention:** Parameterized queries (knex.js)
6. **XSS Prevention:** Content Security Policy headers
7. **API Key for integrations:** Separate API keys (read/write scopes)

**Security Headers:**

```
Strict-Transport-Security: max-age=31536000
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'
X-XSS-Protection: 1; mode=block
```

---

## 6. Backup & Restore Strategy

### 6.1 PostgreSQL Backups

**Automated Backups:**

- **Frequency:** Hourly incremental, daily full backup
- **Retention:** 30-day retention (AWS RDS backup)
- **Disaster recovery:** Multi-AZ failover (automatic)
- **Cross-region backup:** Weekly copy to another AWS region

**Backup Strategy:**

```
Day 0: Full backup (5 GB)
Day 1: Incremental (200 MB)
Day 2: Incremental (150 MB)
...
Day 7: Full backup (5.2 GB) + previous incrememtals removed
```

**Restore Scenarios:**

| Scenario                 | RTO    | RPO           | Method                      |
| ------------------------ | ------ | ------------- | --------------------------- |
| Single row delete        | 1 min  | Point-in-time | SQL restore                 |
| Tenant schema corruption | 15 min | 1 hour        | Schema restore from backup  |
| Full DB failure          | 5 min  | 1 hour        | Multi-AZ failover           |
| Regional failure         | 30 min | 24 hour       | Cross-region backup restore |

**Point-in-Time Recovery:**

```bash
# Restore to specific time (e.g., before accidental DELETE)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier hrms-prod-restore \
  --db-snapshot-identifier hrms-prod-snap-2026-02-01 \
  --restore-time 2026-02-01T15:30:00Z
```

### 6.2 S3 Backups (Documents, Payslips)

**Versioning:**

- S3 versioning enabled on all buckets
- Retain 90-day version history
- Lifecycle policy: Move old versions to Glacier after 30 days

**Replication:**

- Same-region replication: For accidental deletion protection
- Cross-region replication: For disaster recovery

**Example S3 Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "s3.amazonaws.com" },
      "Action": "s3:GetReplicationConfiguration",
      "Resource": "arn:aws:s3:::hrms-documents"
    }
  ]
}
```

### 6.3 MongoDB Backup (Logs, Audit)

**Strategy:**

- **Sharded replica sets** with automatic backups
- **Daily snapshots** to S3 via AWS DataBrew
- **TTL index:** Auto-delete logs older than 90 days
- **Not mission-critical:** Logs are for audit/debugging, not business data

**MongoDB TTL Example:**

```javascript
db.audit_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
```

---

## 7. Monitoring & Observability

### 7.1 Metrics (Prometheus)

**Collection Method:** Backend exports Prometheus metrics at `/metrics` endpoint

**Key Metrics:**

- **Application:** Request count, latency, error rate, throughput
- **Database:** Query execution time, connection pool utilization
- **Cache:** Hit/miss ratio, eviction rate
- **Infrastructure:** CPU, memory, disk I/O, network

**Example Prometheus Config:**

```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: "backend"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/metrics"
```

**Custom Metrics (via Prom Client):**

```javascript
const http_request_duration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// In route handler:
http_request_duration.observe(
  { method: "GET", route: "/employees", status: 200 },
  responseTime,
);
```

### 7.2 Dashboards (Grafana)

**Dashboards:**

1. **System Health:** CPU, memory, disk, network
2. **Application Performance:** Request rate, latency, error rate by endpoint
3. **Database:** Query latency, connection count, slow queries
4. **Business Metrics:** Active tenants, active users, payroll runs completed

**Alert Rules:**

- **CPU > 80%** → Scale up ECS tasks
- **Error rate > 1%** → Page on-call engineer
- **DB connection pool > 90%** → Investigate long transactions
- **Payroll job latency > 5 min** → Alert operations team

### 7.3 Logs (CloudWatch + MongoDB)

**Log Aggregation:**

- **ECS task logs → CloudWatch** (application logs, errors)
- **MongoDB → CloudWatch Insights** (audit, business events)
- **S3 access logs → CloudWatch** (file access audit)

**Log Levels:**

- `ERROR` → Security events, failures
- `WARN` → Unusual operations (bulk deletes, schema migrations)
- `INFO` → Standard operations (login, leave approval)
- `DEBUG` → Performance profiling (only in staging)

**Log Structure (JSON):**

```json
{
  "timestamp": "2026-02-01T10:30:45.123Z",
  "level": "INFO",
  "tenant_id": "tenant_001",
  "user_id": "usr_123",
  "action": "leave_approved",
  "resource": "leave_request_456",
  "result": "success",
  "duration_ms": 234
}
```

### 7.4 Distributed Tracing (Optional: X-Ray)

**Use Case:** Trace multi-service requests (if microservices added later)

**Trace Flow:**

```
Frontend request
→ Backend /employees endpoint
  → PostgreSQL query
  → Redis cache lookup
  → S3 fetch (if documents)
→ Response to frontend
```

**X-Ray Sampling:**

- Sample 100% of errors
- Sample 1% of successful requests
- Unsampled requests still logged to CloudWatch

---

## 8. DevSecOps Flow

### 8.1 Secure Development Lifecycle (SDL)

```
1. Code Commit → GitHub
2. Pre-commit hooks (local):
   - ESLint, Prettier
   - Git secrets (detect API keys)
3. GitHub Actions CI:
   - Unit tests, integration tests
   - SAST (Snyk, npm audit)
   - Dependency scanning (vulnerable packages)
4. Code Review:
   - Require 2 approvals for main branch
   - Check branch protection rules
5. Build & Push:
   - Docker image build
   - Container image scanning (Trivy)
   - Push to ECR with tag
6. Deploy:
   - Terraform/CloudFormation validation
   - Automated rollout to ECS
   - Smoke tests on deployment
7. Post-Deploy:
   - DAST (Burp Suite automated)
   - Security group validation
   - Compliance check (CIS benchmarks)
```

### 8.2 GitHub Actions Workflow Example

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test

      - name: Security audit
        run: npm audit --audit-level=moderate

  build-push:
    needs: lint-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t hrms-backend:${{ github.sha }} .

      - name: Scan image (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: hrms-backend:${{ github.sha }}
          format: "sarif"

      - name: Push to ECR
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws ecr get-login-password --region us-east-1 | \
          docker login --username AWS --password-stdin $ECR_REGISTRY
          docker tag hrms-backend:${{ github.sha }} \
            $ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }}
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }}

  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster hrms-prod \
            --service backend \
            --force-new-deployment
```

### 8.3 Secrets Management

**Tools:**

- GitHub Secrets (for CI/CD tokens)
- AWS Secrets Manager (for production secrets: DB password, API keys)
- AWS KMS (encryption keys)

**Rotation Policy:**

- Database passwords: Rotate every 90 days
- API keys: Rotate every 6 months
- Temporary credentials: Rotate every 1 hour (STS)

---

## 9. Disaster Recovery Plan

### 9.1 RTO & RPO Targets

| Scenario                   | RTO     | RPO           | Priority |
| -------------------------- | ------- | ------------- | -------- |
| Application crash          | 5 min   | 1 min         | Critical |
| DB corruption (single row) | 15 min  | Point-in-time | High     |
| Tenant data loss           | 30 min  | 1 hour        | High     |
| Full region failure        | 2 hours | 24 hours      | Medium   |

### 9.2 Failover Procedure

**Application Failover (ECS Multi-AZ):**

```
Normal state: Tasks running in AZ-a, AZ-b, AZ-c (3 replicas)
AZ-a goes down → ALB automatically routes to AZ-b, AZ-c
ECS launches replacement task in AZ-d (within 2 minutes)
No downtime (unless all AZs fail)
```

**Database Failover (RDS Multi-AZ):**

```
Primary DB in AZ-a fails → Automatic failover to standby in AZ-b
Failover time: 1-2 minutes
DNS updated automatically
Connection string unchanged
```

**Manual Restore from Backup:**

```bash
# If automated failover unavailable (catastrophic scenario)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier hrms-prod-restored \
  --db-snapshot-identifier hrms-prod-latest-snapshot
# Takes ~10-15 minutes for large databases
```

---

## 10. Compliance & Data Protection

### 10.1 Oman Labor Law

**Requirements:**

- **Contract Management:** Store signed employment contracts with version history
- **Leave Entitlements:** Oman law mandates 30 days annual leave + public holidays
- **Overtime Tracking:** Maintain detailed overtime records
- **Termination Notice:** Enforce 30-day notice period rules
- **Remittance:** Track employee remittance amounts (withheld from salary)

**Implementation:**

- Leave calculator integrated with Omani calendar (Islamic holidays)
- Overtime auto-calculation based on working hours policy
- Termination workflow with mandatory notice period validation

### 10.2 GCC Data Protection

**Data Residency:**

- All data hosted in Middle East region (AWS Bahrain)
- No cross-border data transfer without explicit consent
- Backup copy in another GCC country (optional)

**Data Rights:**

- Right to access: Data export in CSV/JSON format
- Right to deletion: Soft-delete with 30-day recovery window
- Right to rectification: Edit personal data

**Implementation:**

```sql
-- GDPR-like soft delete
ALTER TABLE tenant_001.employees ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE tenant_001.employees ADD COLUMN deletion_reason TEXT;

-- Archive before hard delete
CREATE TABLE tenant_001.employees_archive (LIKE tenant_001.employees);
```

### 10.3 Data Protection Measures

**Classification:**

- **Confidential:** Salary, SSN, passport → Encrypted at DB layer
- **Internal:** Employee records → Access via RBAC
- **Public:** Company policies → No special protection

**Audit Trail:**

- Every change to employee/payroll data logged to MongoDB
- Who changed what, when, why
- Immutable audit log (cannot be deleted)

---

## 11. Cost Estimation (AWS)

### 11.1 Monthly Cost Breakdown (100 Tenants, 10K Users)

| Component             | Unit                   | Quantity                | Monthly Cost |
| --------------------- | ---------------------- | ----------------------- | ------------ |
| **Compute (ECS)**     | vCPU-hour              | 2 vCPU × 730h × 3 tasks | $146         |
| **RDS PostgreSQL**    | Multi-AZ db.r6i.xlarge | 1                       | $1,200       |
| **ElastiCache Redis** | cache.r6g.xlarge       | 1                       | $380         |
| **S3 Storage**        | GB                     | 1,000 GB documents      | $23          |
| **S3 Requests**       | 1M requests            | 50M/month               | $250         |
| **CloudFront**        | GB transfer            | 50 GB/month             | $60          |
| **MongoDB Atlas**     | M20 cluster            | 1                       | $300         |
| **CloudWatch Logs**   | GB ingested            | 10 GB/month             | $50          |
| **NAT Gateway**       | GB transferred         | 50 GB/month             | $45          |
| **Data transfer**     | Inter-AZ               | ~10% of traffic         | $25          |
| **Load Balancer**     | ALB                    | 1                       | $16          |
| **Route53**           | Hosted zone            | 1                       | $0.50        |
| **Backup storage**    | GB                     | 100 GB                  | $20          |
| **Miscellaneous**     | -                      | -                       | $100         |
| **TOTAL MONTHLY**     | -                      | -                       | **$2,615**   |
| **TOTAL YEARLY**      | -                      | -                       | **$31,380**  |

**Per-Tenant Cost:** $31,380 / 100 = **$314/month** (@ 100 tenants)

### 11.2 Cost Optimization

**Recommendations:**

1. **Reserved instances:** Save 30% on RDS/ElastiCache if committed
2. **Spot instances:** Use for non-critical batch jobs (payroll reports)
3. **S3 Lifecycle:** Move old documents to Glacier → 90% savings
4. **Auto-scaling:** Scale down during off-peak hours

**Optimized Cost (with commitments):** ~$2,000/month

---

## 12. Performance & Scalability

### 12.1 Expected Performance

| Operation                    | Latency (p99) | Notes                           |
| ---------------------------- | ------------- | ------------------------------- |
| Login                        | 500 ms        | Database + JWT generation       |
| Fetch employees list         | 200 ms        | Cached org settings             |
| Submit leave request         | 800 ms        | Validation + email notification |
| Payroll run (1000 employees) | 5 min         | Batch job, async                |
| Employee search              | 300 ms        | Full-text search on PostgreSQL  |

### 12.2 Scaling Strategy

**Horizontal Scaling:**

- Add more ECS tasks (behind ALB) → Handle more concurrent users
- PostgreSQL read replicas → Separate read-heavy dashboards
- Redis cluster mode → Handle larger datasets

**Vertical Scaling:**

- Upgrade ECS task size (2vCPU → 4vCPU)
- Upgrade RDS instance type (db.r6i.xlarge → db.r6i.2xlarge)
- Upgrade ElastiCache node size (cache.r6g.xlarge → cache.r6g.2xlarge)

**Limits Before Redesign:**

- **5000+ tenants** → Move to row-level multi-tenancy (requires schema redesign)
- **50K+ concurrent users** → Add Kubernetes (EKS) for auto-scaling
- **100+ GB database** → Shard by tenant_id or business domain

---

## 13. Technology Stack Summary

| Layer         | Technology                     | Rationale                                       |
| ------------- | ------------------------------ | ----------------------------------------------- |
| Frontend      | React 18 + Redux Toolkit Query | Component-based, RTK for state + data fetching  |
| Backend       | Node.js 18 + Express           | Non-blocking I/O, JS fullstack, ecosystem       |
| Primary DB    | PostgreSQL 15                  | ACID, multi-tenancy (schemas), JSONB            |
| Cache         | Redis 7                        | Sub-ms latency, pub/sub, session storage        |
| Document DB   | MongoDB 7                      | Time-series logs, high write throughput         |
| Container     | Docker + ECR                   | Reproducibility, image scanning, registry       |
| Orchestration | AWS ECS Fargate                | Managed, serverless containers, no K8s overhead |
| CI/CD         | GitHub Actions                 | Native GitHub integration, workflow yaml        |
| Monitoring    | Prometheus + Grafana           | CNCF standards, visualization                   |
| Logging       | CloudWatch + MongoDB           | Aggregation, retention, searchability           |
| Cloud         | AWS                            | ECS, RDS, ElastiCache, S3, CloudFront, IAM      |

---

## Next Steps

1. **Detailed Architecture Review:** Validate design with security team
2. **Create LLD Document:** Database schema, API specs, deployment details
3. **Infrastructure as Code:** Terraform for ECS, RDS, networking
4. **Prototype:** Build login + employee dashboard (frontend + backend)
5. **Security Assessment:** Penetration testing, compliance audit

---

**Document Author:** AI Assistant  
**Last Updated:** February 2, 2026  
**Status:** Draft (Ready for stakeholder review)
