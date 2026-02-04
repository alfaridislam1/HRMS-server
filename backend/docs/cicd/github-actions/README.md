# GitHub Actions CI/CD (Backend)

This folder is intended to be pushed as its **own repository**.

Workflow location:

- `.github/workflows/ci-cd.yml`

## Pipeline

lint → unit tests → integration tests → Docker build → Docker scan → push to AWS ECR → deploy to ECS/EKS

## Required GitHub Secrets

### Common

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `AWS_ROLE_TO_ASSUME`
- `ECR_REPO_BACKEND`
- Optional: `DEPLOY_TARGET` = `ecs` or `eks`

### ECS (if deploy_target=ecs)

- `ECS_CLUSTER`
- `ECS_SERVICE_BACKEND`
- `ECS_CONTAINER_NAME_BACKEND`

### EKS (if deploy_target=eks)

- `EKS_CLUSTER`
- `K8S_NAMESPACE`
- `K8S_DEPLOYMENT_BACKEND`
- `K8S_CONTAINER_BACKEND`

### Notifications (optional)

- `SLACK_WEBHOOK_URL`

