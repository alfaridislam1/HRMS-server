# HRMS SaaS - Architecture Diagrams & Compliance

---

## 1. System Architecture Diagram (Box Level)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              MULTI-TENANT HRMS SaaS PLATFORM                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER (Frontend)                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  React SPA       │  │  Redux Toolkit   │  │  RTK Query       │                   │
│  │  (Components)    │  │  (State Mgmt)    │  │  (Data Fetching) │                   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                   │
│         │                      │                      │                              │
│         └──────────────────────┴──────────────────────┘                              │
│                                │                                                     │
│                       HTTP/HTTPS (Port 80/443)                                       │
│                                │                                                     │
└────────────────────────────────┬─────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
         ┌──────────┴──────────┐   ┌───────────┴────────────┐
         │  CloudFront CDN     │   │   AWS WAF              │
         │  (Asset Caching)    │   │   (DDoS Protection)    │
         │                     │   │                        │
         └──────────┬──────────┘   └───────────┬────────────┘
                    │                          │
         ┌──────────┴──────────┐   ┌───────────┴────────────┐
         │  SSL/TLS Cert       │   │   Rate Limiting        │
         │  (AWS ACM)          │   │   (1000 req/min)       │
         └──────────┬──────────┘   └───────────┬────────────┘
                    │                          │
                    └──────────────┬───────────┘
                                   │
┌──────────────────────────────────┴────────────────────────────────────────────────────┐
│                   Application Load Balancer (ALB)                                     │
│                   ├─ HTTP/2 Support                                                   │
│                   ├─ Cross-AZ Load Distribution                                       │
│                   └─ Security Groups (Inbound: 80, 443; Outbound: ALL)                │
└──────────────────────────────────┬────────────────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────┴────────┐       ┌─────────┴────────┐       ┌────────┴──────┐
│  ECS Task 1    │       │  ECS Task 2      │       │  ECS Task 3   │
│  (Fargate)     │       │  (Fargate)       │       │  (Fargate)    │
│  ┌──────────┐  │       │  ┌──────────┐   │       │  ┌──────────┐ │
│  │ Node.js  │  │       │  │ Node.js  │   │       │  │ Node.js  │ │
│  │ Express  │  │       │  │ Express  │   │       │  │ Express  │ │
│  │ API      │  │       │  │ API      │   │       │  │ API      │ │
│  └──────────┘  │       │  └──────────┘   │       │  └──────────┘ │
└───────┬────────┘       └─────────┬────────┘       └────────┬──────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
┌──────────────────────────────────┴────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER (Microservices Architecture)                  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Auth Service   │  │ Employee       │  │ Leave Service  │  │ Payroll Service   │  │
│  │ • JWT Token    │  │ Service        │  │ • Approvals    │  │ • Calculations    │  │
│  │ • OAuth2       │  │ • CRUD         │  │ • Leave Type   │  │ • Salary Slips    │  │
│  │ • 2FA          │  │ • Org Hierarchy│  │  Entitlements  │  │ • Tax Deductions  │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └───────────────────┘  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Attendance     │  │ Report Service │  │ Notification   │  │ Audit Service     │  │
│  │ Service        │  │ • Dashboards   │  │ Service        │  │ • Logging         │  │
│  │ • Check-in/out │  │ • Data Export  │  │ • Email        │  │ • Compliance      │  │
│  │ • Tracking     │  │ • Analytics    │  │ • SMS          │  │ • Change History  │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └───────────────────┘  │
└──────────────────────────────────┬────────────────────────────────────────────────────┘
                                   │
        ┌──────────────┬───────────┼──────────────┬─────────────┐
        │              │           │              │             │
        ↓              ↓           ↓              ↓             ↓
┌──────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐
│ PostgreSQL   │ │  Redis   │ │ MongoDB   │ │    S3    │ │ SES (Email) │
│ (Primary DB) │ │ (Cache)  │ │(Log/Audit)│ │(Documents)│ │             │
│              │ │          │ │           │ │          │ │             │
│ Multi-AZ     │ │ Multi-AZ │ │ Sharded   │ │ Versioned│ │ Rate Limits │
│ Read Replica │ │ Sentinel │ │ Replica   │ │ Lifecycle│ │ Bounce Hndl │
│ Encrypted    │ │ Failover │ │ TTL Index │ │ Replicat │ │             │
└──────────────┘ └──────────┘ └───────────┘ └──────────┘ └─────────────┘
        │              │           │              │
        └──────────────┴───────────┴──────────────┴─────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────────────────────────────┐
│                    MONITORING & OBSERVABILITY LAYER                                 │
├───────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ CloudWatch  │  │  Prometheus  │  │   Grafana    │  │  X-Ray Tracing   │       │
│  │  • Logs     │  │  • Metrics   │  │ • Dashboards │  │  • Distributed   │       │
│  │  • Events   │  │  • Scraping  │  │ • Alerts     │  │    Tracing       │       │
│  │  • Alarms   │  │  • Retention │  │ • Thresholds │  │  • Performance   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘       │
│                                 │                                                 │
│                    ┌────────────┴──────────────┐                                  │
│                    │                           │                                  │
│           ┌────────┴──────┐         ┌──────────┴───────┐                         │
│           │  PagerDuty    │         │  Slack Alerts    │                         │
│           │  (Incidents)  │         │  (Notifications) │                         │
│           └───────────────┘         └──────────────────┘                         │
└───────────────────────────────────────────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────────────────────┐
        │                 BACKUP & DISASTER RECOVERY                  │
        ├─────────────────────────────────────────────────────────────┤
        │  • RDS Automated Backups (30-day retention, Multi-AZ)        │
        │  • PostgreSQL Point-in-Time Recovery                         │
        │  • Cross-Region Replication (Weekly)                        │
        │  • S3 Versioning & Lifecycle Policies                       │
        │  • Immutable Audit Logs (MongoDB TTL)                       │
        │  • Database Snapshots (Daily, Encrypted)                    │
        │  • RTO: 5 min | RPO: 1 hour                                  │
        └─────────────────────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────────────────────┐
        │              SECURITY & COMPLIANCE LAYER                    │
        ├─────────────────────────────────────────────────────────────┤
        │  ┌─────────────────────────────────────────────────────────┐│
        │  │ IAM Roles & Policies                                    ││
        │  │  • ECS Task Role (S3, RDS, Secrets Manager)            ││
        │  │  • EC2 Instance Role (ECR access, CloudWatch)          ││
        │  │  • User/Cross-Account Roles                            ││
        │  └─────────────────────────────────────────────────────────┘│
        │  ┌─────────────────────────────────────────────────────────┐│
        │  │ Encryption                                              ││
        │  │  • In Transit: TLS 1.3, HTTPS only                      ││
        │  │  • At Rest: KMS (PostgreSQL, S3, Redis)                ││
        │  │  • Field-level: PGCrypto (Salary, SSN, Passport)      ││
        │  │  • Rotation: 90-day DB password, 6-month API keys     ││
        │  └─────────────────────────────────────────────────────────┘│
        │  ┌─────────────────────────────────────────────────────────┐│
        │  │ Compliance & Auditing                                   ││
        │  │  • OAuth2 for SSO (Google Workspace, Microsoft AD)      ││
        │  │  • RBAC/ABAC enforcement via RLS policies              ││
        │  │  • Immutable audit logs (all changes tracked)          ││
        │  │  • GDPR: Data export, right to deletion, DPO contact  ││
        │  │  • Oman/GCC: Leave rules, labor law compliance         ││
        │  │  • SOC2 Type II ready (audit trail, change log)        ││
        │  └─────────────────────────────────────────────────────────┘│
        └─────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT REQUEST FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

Client Request (Browser)
    │
    ├─ URL: https://masirat-al-ibda.hrms.com/employees  (Subdomain-based tenant routing)
    │        OR
    │  https://hrms.com/app/employees  (Path-based with tenant context from token)
    │
    ↓
[1. Route Handler]
    │
    ├─ Extract tenant_slug from subdomain or JWT token
    │  Example: tenant_slug = "masirat-al-ibda"
    │
    ↓
[2. Auth Middleware]
    │
    ├─ Validate JWT token
    ├─ Extract claims: { user_id, tenant_id, roles, permissions }
    │
    ↓
[3. Tenant Context Middleware]
    │
    ├─ Query public.tenants WHERE slug = $1
    ├─ Get schema_name (e.g., "tenant_001")
    ├─ Store in request object: req.tenantId = "tenant_001", req.userId = "usr_123"
    │
    ↓
[4. RBAC Middleware]
    │
    ├─ Check user roles/permissions against endpoint requirements
    ├─ Example: Route requires ["HR_ADMIN", "PAYROLL"] role
    │
    ↓
[5. Controller Logic]
    │
    ├─ Call Service with tenant context
    │
    ↓
[6. Service Layer - Database Query]
    │
    ├─ PostgreSQL: SET search_path TO tenant_001;
    │  (All subsequent queries in this connection scoped to tenant_001 schema)
    │
    ├─ Query: SELECT * FROM employees WHERE deleted_at IS NULL;
    │  (Implicitly queries tenant_001.employees, not tenant_002.employees)
    │
    ├─ Additional filtering by RLS policies based on user roles:
    │  Example: HR Manager can only see their department's employees
    │
    ↓
[7. Response]
    │
    ├─ Return data only from tenant_001
    ├─ No data leakage between tenants
    │
    ↓
Client Response


┌─────────────────────────────────────────────────────────────────────────────┐
│              DATABASE SCHEMA ISOLATION - PER-TENANT SCHEMAS                  │
└─────────────────────────────────────────────────────────────────────────────┘

PostgreSQL Instance: hrms_prod

    ├─ Schema: public (Shared, cross-tenant)
    │   ├─ tenants (all organizations)
    │   ├─ feature_flags (feature toggles per org)
    │   ├─ audit_log_global (system events)
    │   └─ tenant_admins (platform admins)
    │
    ├─ Schema: tenant_001 (Organization A: Masirat Al Ibda)
    │   ├─ employees (145 records)
    │   ├─ departments (3 records)
    │   ├─ payroll_periods (12 records)
    │   ├─ salary_slips (1,740 records)
    │   ├─ leave_requests (284 records)
    │   ├─ attendance (15K records)
    │   ├─ users (150 records)
    │   ├─ roles (5 predefined roles)
    │   └─ audit_log (all changes)
    │
    ├─ Schema: tenant_002 (Organization B: Tech Company LLC)
    │   ├─ employees (300 records)
    │   ├─ departments (8 records)
    │   ├─ payroll_periods (12 records)
    │   ├─ salary_slips (3,600 records)
    │   ├─ leave_requests (650 records)
    │   ├─ attendance (42K records)
    │   ├─ users (350 records)
    │   ├─ roles (5 predefined roles)
    │   └─ audit_log (all changes)
    │
    ├─ Schema: tenant_003 (Organization C: Healthcare Group)
    │   └─ [Similar structure]
    │
    └─ ... (More tenant schemas)


Data Access Example:

User A from tenant_001 logs in
    │
    ├─ JWT: { user_id: "usr_A", tenant_id: "tenant_001", email: "user.a@masirat.com" }
    │
    ├─ Makes request: GET /api/v1/employees
    │
    ├─ Backend: SET search_path TO tenant_001;
    │
    ├─ Query: SELECT * FROM employees;
    │   (Retrieves tenant_001.employees only, ~145 records)
    │
    └─ Response: 145 employee records from tenant_001


User B from tenant_002 logs in
    │
    ├─ JWT: { user_id: "usr_B", tenant_id: "tenant_002", email: "user.b@techcompany.com" }
    │
    ├─ Makes request: GET /api/v1/employees
    │
    ├─ Backend: SET search_path TO tenant_002;
    │
    ├─ Query: SELECT * FROM employees;
    │   (Retrieves tenant_002.employees only, ~300 records)
    │
    └─ Response: 300 employee records from tenant_002


NO DATA LEAKAGE:
    • Same backend instance, same application
    • Different schema context enforced by PostgreSQL search_path
    • User A never sees tenant_002 data even if they tamper with JWT
    • RLS policies provide additional row-level security layer
```

---

## 3. Security Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION & AUTHORIZATION FLOW                  │
└─────────────────────────────────────────────────────────────────────────────┘

[1. USER LOGIN]
    │
    Request: POST /api/auth/login
    Payload: { email: "alfarid@masirat.com", password: "SecurePass123!", tenant_slug: "masirat-al-ibda" }
    │
    ├─ Validation: Email format, password strength
    ├─ Lookup: Query public.tenants WHERE slug = 'masirat-al-ibda'
    ├─ Hash check: bcrypt.compare(password, user.password_hash)
    │
    ├─ If valid:
    │   ├─ Query roles from tenant_001.role_assignments
    │   ├─ Generate JWT:
    │   │  {
    │   │    "user_id": "usr_123",
    │   │    "email": "alfarid@masirat.com",
    │   │    "tenant_id": "tenant_001",
    │   │    "roles": ["HR_ADMIN"],
    │   │    "permissions": ["read:employees", "write:payroll", "approve:leave"],
    │   │    "iat": 1707000000,
    │   │    "exp": 1707003600,  # 1 hour expiry
    │   │    "iss": "hrms.masirat.com",
    │   │    "aud": "hrms-client"
    │   │  }
    │   │
    │   ├─ Sign JWT with private key (RS256 algorithm)
    │   ├─ Generate refresh token (longer-lived, 7-day expiry)
    │   │
    │   Response: { access_token, refresh_token, expires_in: 3600, user: {...} }
    │
    └─ If invalid: Return 401 Unauthorized


[2. SUBSEQUENT REQUESTS - TOKEN VALIDATION]
    │
    Request: GET /api/v1/employees
    Header: Authorization: Bearer <access_token>
    │
    ├─ Extract token from Authorization header
    ├─ Decode JWT (verify signature with public key)
    ├─ Check expiry: If expired → return 401, trigger refresh flow
    ├─ Extract claims: tenant_id, user_id, roles
    ├─ Store in req object: req.userId, req.tenantId, req.userRoles
    │
    Response: Request proceeds to route handler with tenant context


[3. RBAC ENFORCEMENT]
    │
    Request: POST /api/v1/employees (requires HR_ADMIN role)
    │
    ├─ Check req.userRoles includes "HR_ADMIN"
    │   ├─ If yes: Proceed to create employee
    │   └─ If no:  Return 403 Forbidden
    │
    Response: Employee created or access denied


[4. ABAC ENFORCEMENT - ROW-LEVEL SECURITY (RLS)]
    │
    Request: GET /api/v1/employees (manager viewing their department)
    │
    ├─ User has role: "MANAGER" (not HR_ADMIN)
    ├─ Query: SELECT * FROM employees;
    ├─ Applied RLS policy:
    │   WHERE department_id IN (
    │     SELECT department_id FROM employee_assignments
    │     WHERE user_id = current_user_id()
    │   )
    │
    ├─ Result: Only returns employees in manager's department
    │
    Response: Filtered employee list (ABAC applied)


[5. SENSITIVE DATA ENCRYPTION]
    │
    Request: GET /api/v1/employees/{id}  (includes salary)
    │
    ├─ Database query:
    │   SELECT id, name, salary_encrypted, pgp_sym_decrypt(salary_encrypted, 'secret_key') as salary
    │   FROM employees WHERE id = $1
    │
    ├─ Field decrypted only for display (if user has permission)
    ├─ Encryption key stored in AWS Secrets Manager (not in code)
    │
    Response: { id, name, salary: "2500.00" } (decrypted, sensitive)


[6. AUDIT LOGGING]
    │
    Action: HR Admin updates employee salary
    │
    ├─ Before update (old_values):
    │   { "id": "emp_001", "salary_encrypted": "..." }
    │
    ├─ After update (new_values):
    │   { "id": "emp_001", "salary_encrypted": "..." }
    │
    ├─ Log entry inserted:
    │   INSERT INTO audit_log (action, resource_type, old_values, new_values, performed_by, created_at)
    │   VALUES ('update', 'employee', {...}, {...}, 'usr_123', NOW())
    │
    ├─ Immutable log (cannot be deleted, only archived)
    │
    Response: Update successful + audit trail recorded


[7. TOKEN REFRESH]
    │
    Request: POST /api/auth/refresh
    Payload: { refresh_token: "ref_..." }
    │
    ├─ Validate refresh token
    ├─ Check if token in blacklist (Redis: hr ms:blacklisted_tokens)
    ├─ If valid: Generate new access token (same claims, new expiry)
    │
    Response: { access_token, expires_in: 3600 }


[8. LOGOUT - TOKEN INVALIDATION]
    │
    Request: POST /api/auth/logout
    │
    ├─ Add current token to blacklist (Redis)
    ├─ Redis key: hrms:blacklisted_tokens:{user_id}:{jti}
    ├─ TTL: Match token expiry time
    │
    Response: 200 OK

    Note: Future requests with blacklisted token rejected with 401


[9. 2FA (Two-Factor Authentication) - Optional]
    │
    After successful email/password login:
    │
    ├─ Check if user has MFA enabled
    ├─ If yes:
    │   ├─ Generate TOTP code (30-sec window)
    │   ├─ Send SMS/Email with code
    │   ├─ Require code in next request: POST /api/auth/verify-mfa
    │   ├─ Only after verification: Issue full JWT
    │
    └─ If no: Skip and issue JWT


[10. OAUTH2 LOGIN - Alternative Path]
    │
    Request: GET /api/auth/oauth/google/callback?code=abc123&state=xyz
    │
    ├─ Exchange code for token with Google OAuth2 endpoint
    ├─ Retrieve user info: { email, name, picture }
    ├─ Check if user exists: Query users WHERE oauth_provider = 'google' AND oauth_id = $1
    │
    ├─ If exists:
    │   └─ Generate JWT (standard flow)
    │
    ├─ If new user:
    │   ├─ Create user in tenant_001.users
    │   ├─ Auto-assign EMPLOYEE role
    │   ├─ Generate JWT
    │
    Response: Redirect to /app with JWT in URL/Cookie
```

---

## 4. CI/CD Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PIPELINE STAGES                             │
└─────────────────────────────────────────────────────────────────────────────┘

Developer Action
    │
    ├─ Git Push to feature branch
    │  Commits: "feat: add employee bulk upload"
    │
    ↓
[STAGE 1: GitHub Actions Trigger]
    │
    ├─ Event: push to develop branch
    ├─ Runner: ubuntu-latest
    │
    ↓
[STAGE 2: Checkout & Setup]
    │
    ├─ actions/checkout@v3
    ├─ actions/setup-node@v3 (Node 18)
    ├─ npm ci (clean install from package-lock.json)
    │
    ↓
[STAGE 3: Linting & Code Quality]
    │
    ├─ ESLint: npm run lint
    │   └─ Check code style, unused variables, etc.
    │
    ├─ Prettier: npm run format:check
    │   └─ Verify code formatting
    │
    ├─ TypeScript: npm run type-check
    │   └─ Compile TS, catch type errors
    │
    ├─ Result:
    │   ├─ If PASS: Continue
    │   └─ If FAIL: Reject PR, comment on GitHub
    │
    ↓
[STAGE 4: Unit Tests]
    │
    ├─ Jest: npm run test:unit -- --coverage
    │   ├─ Run all tests in /tests/unit
    │   ├─ Generate coverage report
    │   └─ Fail if coverage < 80%
    │
    ├─ Result:
    │   ├─ If PASS: Continue
    │   └─ If FAIL: Block merge, show failing tests
    │
    ↓
[STAGE 5: Security Scanning]
    │
    ├─ Snyk: snyk test --severity-threshold=high
    │   ├─ Scan dependencies for vulnerabilities
    │   └─ Check for high/critical CVEs
    │
    ├─ npm audit: npm audit --audit-level=moderate
    │   └─ Node package audit
    │
    ├─ SAST: sonarqube-scan (optional)
    │   └─ Static code analysis
    │
    ├─ Result:
    │   ├─ If PASS: Continue
    │   └─ If FAIL: Security team review required
    │
    ↓
[STAGE 6: Integration Tests]
    │
    ├─ Supertest: npm run test:integration
    │   ├─ Spin up test DB (PostgreSQL in Docker)
    │   ├─ Run API tests (login, employee CRUD, etc.)
    │   ├─ Verify end-to-end flows
    │
    ├─ Result:
    │   ├─ If PASS: Continue
    │   └─ If FAIL: Debug and fix
    │
    ↓
[STAGE 7: Build & Create Docker Image]
    │
    ├─ docker build -t hrms-backend:${{ github.sha }} .
    │  └─ Multi-stage build:
    │     ├─ Stage 1: Build (npm ci, npm run build, transpile TS)
    │     └─ Stage 2: Runtime (copy dist, node_modules, non-root user)
    │
    ├─ Result: Docker image ready (~350 MB)
    │
    ↓
[STAGE 8: Container Image Scanning]
    │
    ├─ Trivy: trivy image hrms-backend:${{ github.sha }}
    │   ├─ Scan for container vulnerabilities
    │   ├─ Check base image security
    │
    ├─ Result:
    │   ├─ If PASS: Continue
    │   └─ If FAIL: Fix Dockerfile, rebuild
    │
    ↓
[STAGE 9: Push to ECR]
    │
    ├─ AWS ECR Login: aws ecr get-login-password | docker login
    │
    ├─ Docker Tag:
    │   docker tag hrms-backend:${{ github.sha }} \
    │   $ECR_REGISTRY/hrms-backend:${{ github.sha }}
    │
    ├─ Docker Push:
    │   docker push $ECR_REGISTRY/hrms-backend:${{ github.sha }}
    │
    ├─ Also tag as 'latest' for main branch
    │
    ├─ Result: Image stored in AWS ECR
    │
    ↓
[STAGE 10: Deploy to Staging (Optional Gate)]
    │
    ├─ Require approval for main branch
    ├─ Manual trigger or auto-deploy to staging environment
    │
    ↓
[STAGE 11: Staging Tests]
    │
    ├─ DAST: Burp Suite automated scan (30 min)
    │   ├─ Dynamic security testing against live staging API
    │   ├─ Check for injection, XSS, authentication flaws
    │
    ├─ Smoke Tests: /health endpoint, core workflows
    │
    ├─ Performance Tests: k6/locust (basic load testing)
    │
    ├─ Result:
    │   ├─ If PASS: Ready for production
    │   └─ If FAIL: Roll back, investigate
    │
    ↓
[STAGE 12: Deploy to Production]
    │
    ├─ AWS ECS Update Service:
    │   aws ecs update-service \
    │     --cluster hrms-prod \
    │     --service hrms-backend-service \
    │     --force-new-deployment \
    │     --task-definition hrms-backend:$new_revision
    │
    ├─ Deployment Strategy:
    │   ├─ Blue/Green: Run new tasks in parallel, switch LB
    │   ├─ Canary: Route 10% traffic to new version
    │   ├─ Rolling: Update 1 task at a time (default ECS)
    │
    ├─ Health Checks:
    │   ├─ ALB target groups check /health endpoint
    │   ├─ If fails: Auto-rollback to previous task
    │   ├─ Monitors CPU, memory, network
    │
    ├─ Result:
    │   ├─ All tasks updated
    │   ├─ Zero downtime (ALB handles traffic during update)
    │
    ↓
[STAGE 13: Post-Deploy Verification]
    │
    ├─ CloudWatch Alarms:
    │   ├─ Monitor error rate (alert if > 1%)
    │   ├─ Monitor latency (p99 > 1s triggers investigation)
    │   ├─ Monitor database connections
    │
    ├─ Datadog/NewRelic (optional):
    │   ├─ Check APM metrics
    │   ├─ Verify all services healthy
    │
    ├─ Slack Notification:
    │   ├─ "✅ Production deployment successful (commit abc123)"
    │   ├─ "2 instances updated, 0 errors, 0.2s avg latency"
    │
    └─ Deployment Complete!


[ROLLBACK PROCEDURE - If Issues Detected]
    │
    ├─ Option 1: Automatic Rollback
    │   ├─ ALB health checks fail
    │   ├─ ECS auto-terminates new tasks
    │   ├─ Routes traffic back to old tasks
    │
    ├─ Option 2: Manual Rollback
    │   ├─ aws ecs update-service --task-definition hrms-backend:N-1
    │   ├─ Revert to previous task definition
    │
    └─ Incident Report → Post-Mortem
```

---

## 5. AWS Cost Estimation

### 5.1 Monthly Cost Breakdown (100 Tenants, 10K Concurrent Users)

| **Service**                    | **Tier/Size**              | **Unit**       | **Quantity**   | **Unit Cost**             | **Monthly Cost** | **Notes**                 |
| ------------------------------ | -------------------------- | -------------- | -------------- | ------------------------- | ---------------- | ------------------------- |
| **Compute**                    |
| ECS Fargate                    | 2 vCPU, 4GB RAM            | Task-Hour      | 3 tasks × 730h | $0.067                    | $146             | 3 replicas for HA         |
| **Database**                   |
| RDS PostgreSQL                 | db.r6i.xlarge, Multi-AZ    | Instance-Hour  | 730h           | $1.64                     | $1,196           | Primary + Standby         |
| RDS Data Transfer              | Inter-AZ                   | GB             | 50 GB          | $0.01                     | $0.50            | Within AZ                 |
| RDS Backup Storage             | 30-day retention           | GB             | 100 GB         | $0.20                     | $20              | Incremental backups       |
| **Cache**                      |
| ElastiCache Redis              | cache.r6g.xlarge, Multi-AZ | Node-Hour      | 3 nodes × 730h | $0.173                    | $379             | Replication group         |
| **Object Storage**             |
| S3 Storage                     | Standard                   | GB-Month       | 1,000 GB       | $0.023                    | $23              | Documents, payslips       |
| S3 Requests                    | PUT, GET, POST             | 1K requests    | 50,000         | $0.005                    | $250             | API calls, uploads        |
| S3 Data Transfer               | CloudFront                 | GB             | 50 GB          | $0.085                    | $4.25            | Outbound to CF            |
| S3 Versioning Storage          | GB-Month                   | 50 GB          | $0.023         | $1.15                     | Old versions     |
| **Content Delivery**           |
| CloudFront                     | Data Transfer Out          | GB             | 50 GB          | $0.085                    | $4.25            | Global edge caching       |
| **Networking**                 |
| ALB                            | Per LB-Hour                | 730h           | 1              | $0.022                    | $16.06           | Application Load Balancer |
| NAT Gateway                    | Data Processing            | GB             | 50 GB          | $0.045                    | $2.25            | Outbound traffic          |
| Data Transfer                  | Out (Internet)             | GB             | 50 GB          | $0.09                     | $4.50            | Egress charges            |
| **Database Services**          |
| MongoDB Atlas                  | M20 (Shared)               | Instance-Month | 1              | $300                      | $300             | Logs, audit events        |
| **Monitoring & Logging**       |
| CloudWatch Logs                | Data Ingested              | GB             | 10 GB          | $0.50                     | $5               | Application logs          |
| CloudWatch Metrics             | API Requests               | 1M Requests    | 2M             | $0.30                     | $0.60            | Prometheus metrics        |
| CloudWatch Alarms              | Per Alarm-Month            | 20 Alarms      | $0.10          | $2                        | Health checks    |
| X-Ray                          | Traced Requests            | 1M Requests    | 0.5M           | $0.50                     | $0.25            | Optional tracing          |
| **Domain & DNS**               |
| Route53                        | Hosted Zone                | Month          | 2 zones        | $0.50                     | $1               | Primary + backup          |
| Route53                        | Standard Queries           | 1M Queries     | 10M            | $0.40                     | $4               | DNS lookups               |
| **SSL/TLS Certificates**       |
| ACM Certificates               | Per Certificate            | -              | 2              | Free                      | $0               | AWS-managed               |
| **Email Delivery**             |
| SES (Simple Email Service)     | Sent Emails                | Per 10K        | 500K/month     | $0.10                     | $5               | Notifications, payslips   |
| **Secrets Management**         |
| AWS Secrets Manager            | Per Secret                 | Month          | 5 Secrets      | $0.40                     | $2               | DB password, API keys     |
| **Key Management**             |
| KMS                            | API Requests               | 1M Requests    | 5M             | $0.03                     | $0.15            | Encryption, decryption    |
| **Backup & Disaster Recovery** |
| AWS Backup                     | RDS Snapshots              | GB-Month       | 50 GB          | $0.05                     | $2.50            | Cross-region backup       |
| **Container Registry**         |
| ECR                            | Data Stored                | GB-Month       | 50 GB          | $0.10                     | $5               | Docker images             |
| ECR                            | Data Scanned (Trivy)       | Image          | 50 Images      | $0.15                     | $7.50            | Security scanning         |
| **Infrastructure as Code**     |
| CloudFormation                 | Template Change            | Per Change     | 5 Changes      | Free                      | $0               | No charge                 |
| **Miscellaneous**              |
| AWS Support                    | Basic                      | -              | 1              | Free                      | $0               | Free tier                 |
|                                |                            |                |                | **SUBTOTAL**              | **$2,362.80**    |                           |
|                                |                            |                |                | **AWS Free Tier Credits** | -$50             |                           |
|                                |                            |                |                | **ESTIMATED MONTHLY**     | **~$2,313**      | ~$27.7K/year              |

### 5.2 Cost Optimization Strategies

```
1. COMPUTE OPTIMIZATION
   ├─ Reserved Instances: Save 30-40% for predictable baseline
   │  └─ 3-year RDS commitment: $1,196/mo → $800/mo ($400/mo savings)
   │
   ├─ Spot Instances: 70% discount for batch jobs (payroll processing)
   │  └─ Off-peak payroll runs on Spot: 2 vCPU × 4h × $0.02 = $0.16 vs $0.27
   │
   ├─ Auto-Scaling: Scale down at night (7pm-7am)
   │  └─ Reduce from 3 tasks to 1 task: Save 66% compute during off-hours
   │  └─ Estimated savings: 10 hours/day × 30 days = $29/month
   │
   └─ Graviton2 Processors: Use Arm-based instances
      └─ 40% cost reduction vs x86

2. STORAGE OPTIMIZATION
   ├─ S3 Lifecycle Policies: Move to Glacier after 90 days
   │  └─ Current: $0.023/GB → Glacier: $0.004/GB (82% savings)
   │  └─ For 1TB documents: $23 → $4/month
   │
   ├─ S3 Intelligent-Tiering: Auto-move between Standard/Infrequent Access
   │  └─ Cost: $0.0025/1K objects monitored = ~$2.50/month
   │  └─ Savings potential: $100+/month for large datasets
   │
   └─ Compression: Gzip JSON responses
      └─ Reduce S3 PUT requests by 40%

3. DATABASE OPTIMIZATION
   ├─ Read Replicas: Use for analytics/reporting
   │  └─ Reduce primary load, secondary replica billing is 50%
   │
   ├─ Aurora instead of RDS: 40% cheaper at scale
   │  └─ Pay per second, not per hour
   │
   └─ Connection Pooling: Reduce database connections
      └─ CloudSQLProxy, PgBouncer reduce connection overhead

4. NETWORK OPTIMIZATION
   ├─ VPC Endpoints: Replace NAT Gateway for AWS service access
   │  └─ NAT Gateway: $0.045/GB → VPC Endpoint: $0.01/endpoint + $0.01/GB
   │
   ├─ CloudFront: Cache aggressively
   │  └─ Reduce origin requests by 80%, save on data transfer
   │
   └─ Data Transfer: Use S3 Transfer Acceleration sparingly
      └─ Only for high-latency uploads

5. MONITORING COST REDUCTION
   ├─ CloudWatch Metric Filters: Replace custom metrics
   │  └─ Free with logs ingestion
   │
   ├─ Sampling: Log 5% of requests instead of 100%
   │  └─ 90% reduction in CloudWatch costs
   │
   └─ Grafana instead of Datadog: $100/mo vs $500+/mo

OPTIMIZED MONTHLY COST: ~$2,000 (27% savings)
```

### 5.3 Cost by Tenant

```
Per-Tenant Breakdown (100 tenants sharing infrastructure)

Fixed Costs (Shared):
  ├─ ALB, Route53, ACM: $21.31 / 100 = $0.21/tenant
  ├─ Monitoring, Backup: $20 / 100 = $0.20/tenant
  └─ Subtotal: $0.41/tenant

Variable Costs (Scalable with tenant size):
  ├─ Database (per-schema cost):
  │  └─ PostgreSQL (amortized): $1,196 / 100 = $11.96/tenant
  │
  ├─ Cache (amortized): $379 / 100 = $3.79/tenant
  │
  ├─ Storage (based on usage):
  │  └─ Average 10GB per tenant: 10GB × $0.023 = $0.23/tenant
  │
  └─ Subtotal: $15.98/tenant

TOTAL PER TENANT: $16.39/month

For Pricing:
  ├─ Starter Plan (10 users): $10/month   [margin: -$6.39]
  ├─ Pro Plan (100 users): $30/month      [margin: +$13.61] ✓
  ├─ Enterprise (1000+ users): $100/month [margin: +$83.61] ✓
  │
  └─ Break-even at ~50 tenants, max profit at 500+ tenants
```

---

## 6. Oman & GCC Compliance Checklist

### 6.1 Labor Law Compliance

#### Oman Labor Law Requirements

```
┌─────────────────────────────────────────────────────────────────────┐
│ OMAN LABOR LAW COMPLIANCE CHECKLIST                                 │
├─────────────────────────────────────────────────────────────────────┤

✓ LEAVE ENTITLEMENTS
├─ Annual Leave: 30 calendar days (mandatory)
├─ Public Holidays: 15 days (Oman national holidays)
├─ Sick Leave: Typically unlimited (employer discretion)
├─ Maternity Leave: 50 days (full pay) + 100 days (half pay)
├─ Paternity Leave: 1 day paid
│
└─ Implementation:
   ├─ Database: Leave type entitlements per employee contract
   ├─ Calendar integration: Mark public holidays (Islamic + national)
   ├─ Validation: Prevent leave requests exceeding annual entitlement
   ├─ Carry-forward: Up to 10 days can carry to next year
   └─ Payout: On termination, unused leave must be paid

✓ EMPLOYMENT CONTRACTS
├─ Written contract required (signed by both parties)
├─ Must include: Job title, salary, start date, benefits, duration
├─ Contract term: Max 2 years (renewable)
│
└─ Implementation:
   ├─ Module: Contract management with version history
   ├─ Storage: S3 encrypted PDF (signed contracts)
   ├─ Audit: Track all contract changes
   └─ E-signature: Support digital signatures (DSC)

✓ OVERTIME
├─ Definition: Work beyond 48 hours/week
├─ Compensation: 1.5x to 2x salary (varies by law)
├─ Documentation: Must record all overtime hours
│
└─ Implementation:
   ├─ Tracking: Attendance module logs all work hours
   ├─ Calculation: Auto-calculate OT pay in payroll
   ├─ Reports: Generate monthly OT summaries
   └─ Limits: Enforce maximum daily work hours (10 hours)

✓ SALARY & DEDUCTIONS
├─ Salary: Payable monthly (not less than minimum wage)
├─ Deductions: Limited to taxes, insurance, loan repayment
├─ Minimum wage: Set by Ministry of Labor
├─ Transparency: Employee must see itemized salary slip
│
└─ Implementation:
   ├─ Salary slip: Display gross, deductions, net with details
   ├─ Tax calculation: Comply with Oman tax brackets
   ├─ Remittance: Calculate & track remittance deductions
   ├─ Compliance: No wage deductions except authorized items
   └─ Payment: Support bank transfer, verify receipt

✓ TERMINATION
├─ Notice period: 30 days (employer & employee)
├─ End of service benefit: Cumulative salary calculation
├─ Final settlement: Within 7 days of termination
├─ Documentation: Formal termination letter required
│
└─ Implementation:
   ├─ Workflow: Termination request → Approval → Final settlement
   ├─ Calculation: EOS = (Days worked / 365) × Final monthly salary
   ├─ Reports: Generate exit checklist, final payslip
   ├─ Audit: Log all termination data (immutable)
   └─ Export: Employee can request full records

✓ WORKING HOURS
├─ Standard week: 48 hours (typically 8 hours/day, 6 days/week)
├─ Weekend: Friday & Saturday (or Fri/Sun)
├─ Flexible scheduling: Employer can set (per agreement)
│
└─ Implementation:
   ├─ Configuration: Admin sets org work schedule
   ├─ Attendance: Track against configured schedule
   ├─ Reports: Daily/monthly work hour summaries
   └─ Compliance: Alert if over-working detected

✓ SAFETY & HEALTH
├─ Employer responsible for workplace safety
├─ Mandatory insurance: Health, work injury, life
├─ Incident reporting: All accidents must be logged
│
└─ Implementation:
   ├─ Incident module: Report accidents, injuries
   ├─ Insurance: Track employee insurance policies
   ├─ Audit trail: Immutable incident logs
   └─ Compliance: Export reports for labor ministry

✓ DISCRIMINATION & EQUALITY
├─ No discrimination by gender, religion, nationality
├─ Equal pay for equal work
├─ Women: Protected from harmful work (night shifts in hazardous roles)
│
└─ Implementation:
   ├─ Payroll: Verify no gender-based salary gaps
   ├─ Access: Ensure roles assigned fairly
   ├─ Reports: Diversity metrics (gender, nationality breakdown)
   └─ Audit: Flag any equity violations

✓ COLLECTIVE BARGAINING
├─ Right to form trade unions
├─ Collective agreement: If union exists, term in agreement
├─ Dispute resolution: Ministry of Labor mediation
│
└─ Implementation:
   ├─ Union module: Track union membership
   ├─ Agreements: Store collective agreement terms
   ├─ Audit: Log any disputes or grievances
   └─ Export: Reports for labor ministry inspections

✓ RECORD KEEPING
├─ Employer must maintain employee records for 3 years
├─ Records: Attendance, payroll, leave, incidents
├─ Inspection: Ministry of Labor can audit records
│
└─ Implementation:
   ├─ Database: Permanent audit log (cannot delete)
   ├─ Compliance: Auto-archive after 3+ years (S3 Glacier)
   ├─ Export: Generate formal records for inspection
   └─ Security: Encrypted, immutable records
```

#### GCC Common Requirements (UAE, Saudi Arabia, Kuwait)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GCC LABOR LAW COMMON PROVISIONS                                     │
├─────────────────────────────────────────────────────────────────────┤

✓ UAE (Emirates Labor Law)
├─ Annual leave: 30 days
├─ End of service benefit: Yes (cumulative)
├─ Probation period: Max 6 months
├─ Sick leave: With medical certificate after 3 days
├─ Diwali & Islamic holidays recognized
│
└─ Config: hrms/config/labor_laws/ae_uae.json

✓ Saudi Arabia (Labor Law)
├─ Annual leave: 30 days
├─ Friday: Mandatory rest day
├─ Overtime: 1.5x pay
├─ Women: Maternity 60 days
├─ Foreigners: Kafala system (sponsor dependent)
│
└─ Config: hrms/config/labor_laws/sa.json

✓ Kuwait (Labor Law)
├─ Annual leave: 30 days
├─ Public holidays: 10+ days
├─ End of service: Yes
├─ Overtime: 2x salary (nighttime), 1.5x (daytime)
├─ Non-Kuwaitis: Separate rules
│
└─ Config: hrms/config/labor_laws/kw.json

✓ Qatar, Bahrain, Oman (Harmonized)
├─ Similar frameworks across GCC
├─ COMMON: 30-day leave, EOS benefit, 48-hour week
├─ VARIED: Probation, overtime rates, holiday counts
│
└─ Configuration approach:
    ├─ Base: Shared GCC labor law templates
    ├─ Customization: Country-specific rules
    ├─ Admin override: Org-level customization (approved)
    └─ Compliance: Auto-validate against selected labor law
```

### 6.2 Data Protection & Privacy

```
┌─────────────────────────────────────────────────────────────────────┐
│ DATA PROTECTION REQUIREMENTS (Oman Personal Data Protection Law)   │
├─────────────────────────────────────────────────────────────────────┤

✓ DATA RESIDENCY
├─ Requirement: Personal data must remain in Oman/Middle East
├─ Exception: Temporary transfer with data controller consent
├─ Implementation:
│  ├─ Primary DB: AWS Bahrain region (ap-south-1)
│  ├─ Backup: Dubai region as failover
│  ├─ Restriction: No data to US/EU without explicit contract
│  └─ Audit: CloudTrail logs all cross-border access attempts
│
└─ Compliance check: Monthly report on data residency

✓ DATA PROCESSING AGREEMENT (DPA)
├─ Requirement: Must have written agreement with data processor
├─ Clauses: Purpose, duration, security, sub-processors
├─ Implementation:
│  ├─ Template: DPA provided to all customers
│  ├─ Signature: Electronic signature required
│  ├─ Storage: Audit log (immutable, encrypted)
│  └─ Update: Annual review and renewal
│
└─ Compliance check: DPA signed before data processing starts

✓ CONSENT & TRANSPARENCY
├─ Requirement: Explicit consent for data processing
├─ Information: Privacy policy, data usage must be clear
├─ Implementation:
│  ├─ Consent: Checkbox during employee registration
│  ├─ Withdrawal: Easy one-click withdrawal option
│  ├─ Audit: Log all consent changes with timestamp
│  ├─ Policy: Accessible on-site, PDF export
│  └─ Language: Available in Arabic & English
│
└─ Compliance check: Employee consent certificate per request

✓ DATA SUBJECT RIGHTS
├─ Right to Access: Employee can request their data (SAR)
├─ Right to Rectification: Correct inaccurate data
├─ Right to Erasure: "Right to be forgotten" (with limits)
├─ Right to Portability: Export personal data in CSV/JSON
├─ Right to Object: Opt-out of processing (if legal)
│
└─ Implementation:
   ├─ SAR Module: Automated data export (72-hour SLA)
   │  └─ Export includes: Personal, employment, payroll, audit
   │
   ├─ Correction: Self-service or admin approval
   │  └─ Audit: All corrections logged with reason
   │
   ├─ Deletion: Soft-delete with 30-day recovery window
   │  └─ After 30 days: Hard delete from production, keep in backup
   │
   ├─ Portability: Encrypted ZIP with JSON + supporting docs
   │  └─ Formats: JSON, CSV, PDF (flexible)
   │
   └─ Objection: Request logged, processed within 14 days

✓ SECURITY MEASURES
├─ Encryption: Data encrypted at rest (AES-256) and in transit (TLS 1.3)
├─ Access Control: Role-based access, principle of least privilege
├─ Monitoring: 24/7 log monitoring, real-time alerting
├─ Backup: Daily encrypted backups with redundancy
├─ Incident Response: Breach notification within 72 hours
│
└─ Implementation: [See Security Architecture section]

✓ DATA BREACH NOTIFICATION
├─ Requirement: Notify within 72 hours of discovery
├─ Notification to: Data subject, data controller, regulator
├─ Information: What was breached, what data, mitigation steps
│
└─ Implementation:
   ├─ Detection: Automated alerts for unauthorized access
   ├─ Assessment: Severity classification (high/medium/low)
   ├─ Notification: Email template generated automatically
   ├─ Audit: Breach logged immutably with resolution
   └─ Report: Submit to Oman TRA if required (notify within 72h)

✓ DATA RETENTION POLICY
├─ General: Delete when no longer needed
├─ Payroll: Retain 7 years (tax compliance)
├─ Audit: Retain 10 years (compliance)
├─ HR records: Retain 3 years after employment ends
│
└─ Implementation:
   ├─ Auto-delete: Scheduled jobs delete records per retention policy
   ├─ Audit: Logging of all deletions (who, when, why)
   ├─ Exception: Legal hold prevents deletion if needed
   └─ Report: Compliance report on data lifecycle
```

### 6.3 Compliance Audit & Certification

```
┌─────────────────────────────────────────────────────────────────────┐
│ COMPLIANCE AUDIT & CERTIFICATION ROADMAP                           │
├─────────────────────────────────────────────────────────────────────┤

Year 1: Foundation Compliance
  ├─ Q1: Data Protection Assessment
  │  ├─ Gap analysis against Oman Labor Law
  │  ├─ Conduct privacy impact assessment (PIA)
  │  └─ Document current security controls
  │
  ├─ Q2: Policy & Documentation
  │  ├─ Create formal Data Protection Policy
  │  ├─ Draft Data Processing Agreements
  │  ├─ Develop Incident Response Plan
  │  └─ Document retention schedules
  │
  ├─ Q3: Technical Implementation
  │  ├─ Implement encryption (at-rest, in-transit)
  │  ├─ Deploy audit logging
  │  ├─ Configure access controls (RBAC/ABAC)
  │  └─ Set up intrusion detection
  │
  └─ Q4: Training & Monitoring
     ├─ Conduct staff training (data protection, privacy)
     ├─ Deploy monitoring alerts
     ├─ Run first internal audit
     └─ Document findings & remediation

Year 2: ISO 27001 Certification (Optional but Recommended)
  ├─ Q1: Assessment & Gap Analysis
  │  ├─ Hire ISO 27001 consultant
  │  ├─ Conduct full control assessment
  │  └─ Create implementation roadmap
  │
  ├─ Q2: Implement ISO 27001 Controls
  │  ├─ Access control policies
  │  ├─ Incident management procedures
  │  ├─ Change management process
  │  └─ Business continuity plan
  │
  ├─ Q3: Internal Audit
  │  ├─ Test all controls
  │  ├─ Document non-conformities
  │  └─ Remediate findings
  │
  └─ Q4: Certification Audit (External)
     ├─ Stage 1: Documentation review
     ├─ Stage 2: On-site audit
     ├─ Certification: Successful audit → ISO 27001 certificate
     └─ Validity: 3 years (annual surveillance audits)

Year 2-3: GCC Regional Compliance
  ├─ UAE: Emirates Personal Data Protection Law (PDPL)
  ├─ Saudi Arabia: Law on Protection of Personal Data
  ├─ Kuwait: Digital Security Law
  ├─ Bahrain: Data Protection Law
  │
  └─ Approach: Harmonized policy, country-specific configs

Ongoing: Annual Compliance Review
  ├─ Q1: Policy review (labor law changes)
  ├─ Q2: Security audit (penetration testing)
  ├─ Q3: Compliance audit (data retention, SAR processing)
  ├─ Q4: Employee training refresh
  │
  └─ Report: Compliance certificate to customers

Continuous Monitoring
  ├─ CloudWatch alarms: Security events
  ├─ Access logs: All data access logged
  ├─ Change logs: All system changes tracked
  ├─ Vulnerability scans: Weekly automated scans
  ├─ Penetration testing: Annual professional pen test
  ├─ Bug bounty: Continuous (optional)
  │
  └─ Compliance dashboard: Real-time status visible to audit team
```

### 6.4 Compliance Audit Checklist (Sample)

```
MONTHLY COMPLIANCE AUDIT CHECKLIST
├─ ✓ Data Residency: All data in Oman/ME region
├─ ✓ Encryption: All data encrypted at rest (AES-256)
├─ ✓ TLS: All connections use TLS 1.3
├─ ✓ Access Logs: 100% audit trail completeness
├─ ✓ Breach Response: 0 breaches (or < 72h notification)
├─ ✓ Employee Training: 100% completed annual training
├─ ✓ SAR Processing: All requests < 30-day SLA
├─ ✓ Data Deletion: Retention policy enforced
├─ ✓ Backups: Daily backups successful, restore tested
├─ ✓ Penetration Test: No critical vulnerabilities
├─ ✓ DPA Status: All customers signed DPA
├─ ✓ Policy Version: Current version documented (v2.1)
├─ ✓ Incident Log: All incidents reviewed & resolved
├─ ✓ Access Revocation: Terminated employee access removed < 1 day
├─ ✓ Third-Party Vendors: Compliance verified
├─ ✓ Regulatory Changes: No new laws missed
└─ ✓ Certification: ISO 27001 valid (expiry date)

RESULT: ✅ COMPLIANT (all items checked)

Failed Item Remediation:
  ├─ Document issue
  ├─ Root cause analysis
  ├─ Create action item with deadline
  ├─ Track resolution
  └─ Verify compliance restoration
```

---

## 7. Summary: Compliance & Cost

| Aspect                | Status         | Details                                           |
| --------------------- | -------------- | ------------------------------------------------- |
| **Data Residency**    | ✅ Compliant   | AWS Bahrain, no cross-border transfer             |
| **Encryption**        | ✅ Compliant   | AES-256 at rest, TLS 1.3 in transit               |
| **Labor Law**         | ✅ Compliant   | Oman 30-day leave, EOS benefit, overtime tracking |
| **Privacy Rights**    | ✅ Compliant   | SAR, deletion, portability, consent               |
| **Audit Logging**     | ✅ Compliant   | Immutable logs, 10-year retention                 |
| **Incident Response** | ✅ Compliant   | 72-hour breach notification                       |
| **Certifications**    | 🔄 In Progress | ISO 27001 by Q4 2026                              |
| **Monthly Cost**      | ~$2,300        | Scales with tenant growth                         |
| **Cost per Tenant**   | $16.39         | Break-even at 50 tenants                          |

---

**Document Version:** 1.0  
**Last Updated:** February 2, 2026  
**Status:** Ready for Implementation
