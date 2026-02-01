# HRMS Backend - Deployment Guide

## Pre-Deployment Checklist

### Security

- [ ] JWT secrets changed (min 32 characters)
- [ ] Database passwords strong
- [ ] Redis password set
- [ ] SSL/TLS certificates obtained
- [ ] Environment variables secured (AWS Secrets Manager/Vault)
- [ ] API keys rotated
- [ ] Security headers enabled (Helmet)

### Database

- [ ] PostgreSQL database created
- [ ] MongoDB database created
- [ ] Backups automated (daily)
- [ ] Replication configured (production)
- [ ] RLS (Row-Level Security) enabled
- [ ] Migrations tested in staging

### Infrastructure

- [ ] Load balancer configured
- [ ] Auto-scaling groups set
- [ ] CloudWatch/monitoring alerts
- [ ] Logging aggregation setup
- [ ] CDN configured (for static files)
- [ ] Health check endpoints verified

### Code

- [ ] All tests passing
- [ ] Code review completed
- [ ] Linting passed
- [ ] TypeScript strict mode checks passed
- [ ] No console.log statements in production code
- [ ] API documentation generated

## Deployment Options

### Option 1: AWS ECS Fargate (Recommended)

#### Prerequisites

- AWS Account with ECR repository
- RDS instance for PostgreSQL
- ElastiCache for Redis
- DocumentDB or MongoDB Atlas for MongoDB
- Application Load Balancer

#### Step 1: Create Docker Image

```bash
# Build image
docker build -t hrms-backend:1.0.0 .

# Tag for ECR
docker tag hrms-backend:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/hrms-backend:1.0.0

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/hrms-backend:1.0.0
```

#### Step 2: Create ECS Task Definition

```json
{
  "family": "hrms-backend",
  "taskRoleArn": "arn:aws:iam::123456789:role/hrms-task-role",
  "executionRoleArn": "arn:aws:iam::123456789:role/hrms-task-execution-role",
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "hrms-backend",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/hrms-backend:1.0.0",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:hrms/db_host"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:hrms/db_password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:hrms/jwt_secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hrms-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Step 3: Create ECS Service

```bash
aws ecs create-service \
  --cluster hrms-production \
  --service-name hrms-backend \
  --task-definition hrms-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=hrms-backend,containerPort=3000"
```

### Option 2: Kubernetes (K8s)

#### Prerequisites

- Kubernetes cluster (EKS, AKS, GKE)
- kubectl configured
- Docker image in registry
- PostgreSQL & Redis services

#### Step 1: Create Deployment YAML

```yaml
# hrms-backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hrms-backend
  labels:
    app: hrms-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hrms-backend
  template:
    metadata:
      labels:
        app: hrms-backend
    spec:
      containers:
        - name: hrms-backend
          image: gcr.io/my-project/hrms-backend:1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: hrms-secrets
                  key: db_host
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: hrms-secrets
                  key: db_password
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: hrms-secrets
                  key: jwt_secret
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: '250m'
              memory: '512Mi'
            limits:
              cpu: '500m'
              memory: '1Gi'
---
apiVersion: v1
kind: Service
metadata:
  name: hrms-backend
spec:
  selector:
    app: hrms-backend
  ports:
    - port: 3000
      targetPort: 3000
  type: LoadBalancer
```

#### Step 2: Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace hrms

# Create secrets
kubectl create secret generic hrms-secrets \
  --from-literal=db_host=postgres.default.svc.cluster.local \
  --from-literal=db_password=YOUR_STRONG_PASSWORD \
  --from-literal=jwt_secret=YOUR_JWT_SECRET \
  -n hrms

# Apply deployment
kubectl apply -f hrms-backend-deployment.yaml -n hrms

# Verify deployment
kubectl get pods -n hrms
kubectl logs -f deployment/hrms-backend -n hrms
```

### Option 3: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Create secrets
echo "db_password" | docker secret create db_password -
echo "jwt_secret" | docker secret create jwt_secret -

# Create service
docker service create \
  --name hrms-backend \
  --publish 3000:3000 \
  --replicas 3 \
  --secret db_password \
  --secret jwt_secret \
  -e NODE_ENV=production \
  -e DB_HOST=postgres \
  123456789.dkr.ecr.us-east-1.amazonaws.com/hrms-backend:1.0.0
```

### Option 4: Traditional VPS (DigitalOcean, Linode, AWS EC2)

#### Step 1: Setup Server

```bash
# SSH into server
ssh ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Step 2: Deploy Application

```bash
# Clone repository
git clone https://github.com/yourorg/hrms.git
cd hrms/backend

# Create environment file
sudo vi .env
# Add production environment variables

# Create docker-compose for production
sudo vi docker-compose.prod.yml
# (similar to docker-compose.yml but with production settings)

# Start services
sudo docker-compose -f docker-compose.prod.yml up -d

# Setup SSL with Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone -d your-domain.com

# Setup Nginx reverse proxy
sudo vi /etc/nginx/sites-available/hrms
# Configure reverse proxy to localhost:3000
```

## Database Migrations

### Production Migration Strategy

```bash
# 1. Test migration in staging first
docker-compose exec backend npm run db:migrate:dev

# 2. Backup production database
pg_dump -h prod-db.example.com -U postgres hrms_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Run migration in production
docker-compose exec backend npm run db:migrate:prod

# 4. Verify migration
docker-compose exec backend npm run test:integration

# 5. Keep backup for at least 30 days
```

## Monitoring & Alerting

### CloudWatch Monitoring

```typescript
// Add to app.ts for metrics
import CloudWatch from 'aws-sdk/clients/cloudwatch';

const cloudwatch = new CloudWatch();

// Log custom metric
cloudwatch.putMetricData(
  {
    Namespace: 'HRMS/Backend',
    MetricData: [
      {
        MetricName: 'EmployeeCreated',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date(),
      },
    ],
  },
  (err) => {
    if (err) logger.error('CloudWatch error:', err);
  }
);
```

### Alerts to Setup

```
- CPU > 80% for 5 minutes
- Memory > 85%
- API response time > 500ms
- Error rate > 5%
- Database connection pool exhausted
- Redis connection failures
- Disk space < 10%
- Application restart detected
```

## Logging & Troubleshooting

### Centralized Logging

```bash
# Option 1: ELK Stack
# Configure Winston to send logs to Elasticsearch

# Option 2: CloudWatch Logs
# Already configured in ECS task definition

# Option 3: Datadog
npm install datadog-browser-logs
# Configure in app.ts
```

### View Production Logs

```bash
# Docker
docker logs -f hrms-backend

# ECS
aws logs tail /ecs/hrms-backend --follow

# Kubernetes
kubectl logs -f deployment/hrms-backend -n hrms

# SSH (VPS)
ssh prod-server
tail -f /app/hrms/backend/logs/combined.log
```

## Scaling Strategy

### Horizontal Scaling

1. **Load Balancer** - Distribute traffic across multiple instances
2. **Database Connection Pooling** - Increase pool size
3. **Redis Replication** - Master-slave Redis setup
4. **Auto-scaling Groups** - Auto-scale based on CPU/memory

### Vertical Scaling

1. Increase instance size
2. Increase database resources (CPU, memory)
3. Increase Redis memory
4. Add more connection pools

### Performance Optimization

```bash
# Enable gzip compression
# Setup CDN for static assets
# Enable HTTP caching headers
# Implement API rate limiting
# Optimize database queries
# Cache frequently accessed data
```

## Backup & Disaster Recovery

### Backup Strategy

```bash
# Daily automated backups
0 2 * * * pg_dump -h db.example.com -U postgres hrms_prod | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Store in S3
aws s3 sync /backups s3://my-bucket/backups/

# Retain for 90 days
# Test restore monthly
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 1 hour
2. **RPO (Recovery Point Objective)**: 1 hour

```bash
# Restore from backup
pg_restore -h new-db.example.com -U postgres < backup_20240115.sql

# Verify data integrity
SELECT COUNT(*) FROM employees;

# Restart application
docker-compose up -d
```

## Health Checks & Monitoring

### Health Check Endpoint

```
GET /health

Response:
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

### Detailed Health Check

```
GET /health/detailed

Response:
{
  "api": "ok",
  "database": {
    "status": "connected",
    "latency": 45
  },
  "redis": {
    "status": "connected",
    "latency": 2
  },
  "mongodb": {
    "status": "connected",
    "latency": 30
  }
}
```

## Post-Deployment Verification

```bash
# 1. Health check
curl https://api.hrms.com/health

# 2. Authentication
curl -X POST https://api.hrms.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","tenant_slug":"test"}'

# 3. Database connectivity
curl https://api.hrms.com/api/v1/employees \
  -H "Authorization: Bearer TOKEN"

# 4. Check logs
tail -f /var/log/hrms/combined.log

# 5. Monitor metrics
# Check CloudWatch/monitoring dashboard

# 6. Test failover
# Manually stop one instance
# Verify load balancer routes to healthy instance

# 7. Load test
apache2-bench -n 1000 -c 100 https://api.hrms.com/health
```

## Rollback Procedure

```bash
# If new version has issues:

# 1. Identify previous working version
docker images | grep hrms-backend

# 2. Update service to previous image
aws ecs update-service \
  --cluster hrms-production \
  --service hrms-backend \
  --force-new-deployment \
  --task-definition hrms-backend:5  # Previous version

# 3. Monitor rollout
aws ecs describe-services --cluster hrms-production --services hrms-backend

# 4. Verify application
curl https://api.hrms.com/health

# 5. Investigate issue with failed deployment
tail -f /var/log/hrms/error.log
```

## Maintenance Window

```bash
# 1. Announce maintenance window
# 2. Set maintenance mode
# 3. Perform backups
# 4. Apply updates/patches
# 5. Run database migrations
# 6. Test functionality
# 7. Remove maintenance mode
# 8. Monitor for issues
```

## Compliance & Security

- [ ] SSL/TLS certificates valid (check monthly)
- [ ] Security headers configured (Helmet)
- [ ] CORS policy correct
- [ ] Database encryption at rest enabled
- [ ] Backups encrypted
- [ ] Audit logs enabled
- [ ] Secrets rotation policy
- [ ] Incident response plan documented
- [ ] Disaster recovery tested quarterly

## Support & Escalation

**Incident Severity:**

- **Critical** (P1): API down → Immediate response
- **High** (P2): API degraded → 30 min response
- **Medium** (P3): Non-critical bug → 2 hours response
- **Low** (P4): Feature request → Next sprint

**Contacts:**

- On-call: ops-oncall@hrms.masirat.com
- Escalation: eng-lead@hrms.masirat.com
- Emergency: +1-XXX-XXXX-XXXX

---

**Deployment Status Checklist:**

- [ ] All pre-deployment checks completed
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates installed
- [ ] Health checks verified
- [ ] Monitoring alerts configured
- [ ] Team trained on procedures
- [ ] Rollback plan documented
- [ ] Support team notified
- [ ] Deployment completed successfully
