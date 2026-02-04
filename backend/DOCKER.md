# Docker Setup for HRMS Backend

## Development

### Quick Start

```bash
# Start all services (PostgreSQL, MongoDB, Redis, Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Environment Variables

Create a `.env` file in the backend directory with your configuration:

```bash
cp .env.example .env
# Edit .env with your values
```

### Building Docker Image

```bash
# Build production image
docker build -t hrms-backend:latest .

# Build with specific tag
docker build -t hrms-backend:v1.0.0 .

# Run container locally
docker run -p 3000:3000 --env-file .env hrms-backend:latest
```

## Production (AWS ECS)

### Using ECS Task Definition

1. Update `ecs-task-definition.json`:
   - Replace `ACCOUNT_ID` with your AWS account ID
   - Replace `REGION` with your AWS region
   - Update secret ARNs to match your AWS Secrets Manager secrets

2. Register task definition:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

3. Create/Update ECS Service:
```bash
aws ecs create-service \
  --cluster hrms-cluster \
  --service-name hrms-backend \
  --task-definition hrms-backend \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Production (AWS EKS)

### Using Kubernetes Manifests

1. Update `k8s-deployment.yaml`:
   - Replace `ACCOUNT_ID` with your AWS account ID
   - Replace `REGION` with your AWS region
   - Update ConfigMap and Secret values

2. Create namespace:
```bash
kubectl create namespace hrms
```

3. Create ECR registry secret:
```bash
kubectl create secret docker-registry ecr-registry-secret \
  --docker-server=ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region REGION) \
  --namespace=hrms
```

4. Apply manifests:
```bash
kubectl apply -f k8s-deployment.yaml
```

5. Verify deployment:
```bash
kubectl get pods -n hrms
kubectl get svc -n hrms
```

## Environment Variables Injection

### Development
- Via `.env` file (docker-compose.yml reads from `.env`)
- Via docker-compose.yml `environment` section

### Production (ECS)
- Via ECS Task Definition `environment` section
- Via AWS Secrets Manager (recommended for sensitive data)
- Via AWS Systems Manager Parameter Store

### Production (EKS)
- Via Kubernetes ConfigMaps (non-sensitive)
- Via Kubernetes Secrets (sensitive)
- Via AWS Secrets Manager CSI Driver (recommended)

## Health Checks

The container includes a health check endpoint at `/health`. Configure:

- **ECS**: Health check in task definition
- **EKS**: Liveness and readiness probes in deployment

## Logging

- **Development**: Logs to stdout/stderr (view with `docker-compose logs`)
- **Production (ECS)**: CloudWatch Logs (configured in task definition)
- **Production (EKS)**: Kubernetes logs (view with `kubectl logs`)
