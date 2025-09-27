# Personal Finance Tracker - Deployment Guide

This guide covers deploying the Personal Finance Tracker to production using AWS ECS for the backend and Vercel for the frontend.

## Quick Start

For automated AWS ECS deployment, use our deployment scripts:

```bash
# Complete automated deployment
./scripts/deploy-complete.sh

# Or run individual steps
./scripts/setup-iam-roles.sh
./scripts/setup-aws-secrets.sh
./scripts/deploy-to-ecs.sh
./scripts/test-ecs-deployment.sh
```

For detailed instructions, see [AWS_ECS_DEPLOYMENT.md](AWS_ECS_DEPLOYMENT.md).

## Prerequisites

- AWS CLI configured with appropriate permissions
- Docker installed locally
- Node.js 18+ installed
- PostgreSQL database (AWS RDS recommended)
- ProtonMail account for email services

## Backend Deployment (AWS ECS)

### 1. Database Setup (AWS RDS)

Create a PostgreSQL RDS instance:

```bash
# Create RDS instance (adjust parameters as needed)
aws rds create-db-instance \
  --db-instance-identifier finance-tracker-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --storage-encrypted \
  --region ap-southeast-1
```

### 2. Build and Push Docker Image

```bash
# Navigate to backend directory
cd backend

# Build Docker image
docker build -t finance-tracker-backend .

# Tag for ECR
docker tag finance-tracker-backend:latest YOUR_AWS_ACCOUNT.dkr.ecr.ap-southeast-1.amazonaws.com/finance-tracker-backend:latest

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT.dkr.ecr.ap-southeast-1.amazonaws.com

# Push to ECR
docker push YOUR_AWS_ACCOUNT.dkr.ecr.ap-southeast-1.amazonaws.com/finance-tracker-backend:latest
```

### 3. Create ECS Task Definition

Create `task-definition.json`:

```json
{
  "family": "finance-tracker-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_AWS_ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "finance-tracker-backend",
      "image": "YOUR_AWS_ACCOUNT.dkr.ecr.ap-southeast-1.amazonaws.com/finance-tracker-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DB_HOST",
          "value": "your-rds-endpoint.region.rds.amazonaws.com"
        },
        {
          "name": "DB_PORT",
          "value": "5432"
        },
        {
          "name": "DB_NAME",
          "value": "finance_tracker"
        },
        {
          "name": "DEBUG",
          "value": "False"
        },
        {
          "name": "EMAIL_HOST",
          "value": "smtp.protonmail.com"
        },
        {
          "name": "EMAIL_PORT",
          "value": "587"
        },
        {
          "name": "EMAIL_USE_TLS",
          "value": "True"
        }
      ],
      "secrets": [
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:YOUR_AWS_ACCOUNT:secret:finance-tracker/django-secret-key"
        },
        {
          "name": "DB_USER",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:YOUR_AWS_ACCOUNT:secret:finance-tracker/db-credentials:username::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:YOUR_AWS_ACCOUNT:secret:finance-tracker/db-credentials:password::"
        },
        {
          "name": "EMAIL_HOST_USER",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:YOUR_AWS_ACCOUNT:secret:finance-tracker/email-credentials:username::"
        },
        {
          "name": "EMAIL_HOST_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:YOUR_AWS_ACCOUNT:secret:finance-tracker/email-credentials:password::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/finance-tracker-backend",
          "awslogs-region": "ap-southeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 4. Create ECS Service

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS cluster
aws ecs create-cluster --cluster-name finance-tracker-cluster

# Create service
aws ecs create-service \
  --cluster finance-tracker-cluster \
  --service-name finance-tracker-backend-service \
  --task-definition finance-tracker-backend:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx],securityGroups=[sg-xxxxxxxxx],assignPublicIp=ENABLED}"
```

### 5. Configure Load Balancer (Optional)

For production, set up an Application Load Balancer:

```bash
# Create target group
aws elbv2 create-target-group \
  --name finance-tracker-targets \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-xxxxxxxxx \
  --target-type ip \
  --health-check-path /api/health/

# Create load balancer
aws elbv2 create-load-balancer \
  --name finance-tracker-alb \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx
```

## Frontend Deployment (Vercel)

### 1. Prepare Environment Variables

Create `.env.production` in the frontend directory:

```bash
NEXT_PUBLIC_API_URL=https://your-alb-domain.com
NODE_ENV=production
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel --prod
```

#### Option B: GitHub Integration

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

### 3. Configure Custom Domain (Optional)

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

## Environment Variables Setup

### Backend Environment Variables

Store these in AWS Secrets Manager:

```bash
# Django secret key
aws secretsmanager create-secret \
  --name finance-tracker/django-secret-key \
  --description "Django secret key for finance tracker" \
  --secret-string "your-very-secure-secret-key"

# Database credentials
aws secretsmanager create-secret \
  --name finance-tracker/db-credentials \
  --description "Database credentials" \
  --secret-string '{"username":"postgres","password":"your-db-password"}'

# Email credentials
aws secretsmanager create-secret \
  --name finance-tracker/email-credentials \
  --description "ProtonMail credentials" \
  --secret-string '{"username":"personify-mailer@protonmail.com","password":"your-app-password"}'
```

### Frontend Environment Variables

Configure in Vercel dashboard or `.env.production`:

- `NEXT_PUBLIC_API_URL`: Your backend API URL
- `NODE_ENV`: production

## Security Configuration

### 1. CORS Settings

Update backend `CORS_ALLOWED_ORIGINS` to include your Vercel domain:

```python
CORS_ALLOWED_ORIGINS = [
    "https://your-vercel-app.vercel.app",
    "https://your-custom-domain.com",
]
```

### 2. Security Headers

Backend security settings are already configured in `settings.py`:

- `SECURE_SSL_REDIRECT`
- `SECURE_HSTS_SECONDS`
- `SECURE_CONTENT_TYPE_NOSNIFF`
- `X_FRAME_OPTIONS`

### 3. Database Security

- Enable SSL connections
- Use VPC security groups
- Regular backups enabled
- Encryption at rest enabled

## Monitoring and Logging

### 1. CloudWatch Logs

ECS tasks automatically log to CloudWatch. Monitor:
- Application logs
- Error rates
- Performance metrics

### 2. Health Checks

Backend includes health check endpoint at `/api/health/`

### 3. Vercel Analytics

Enable Vercel Analytics for frontend monitoring:
- Page load times
- User interactions
- Error tracking

## Backup and Recovery

### 1. Database Backups

RDS automated backups are configured with 7-day retention.

Manual backup:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier finance-tracker-db \
  --db-snapshot-identifier finance-tracker-backup-$(date +%Y%m%d)
```

### 2. Application Backups

- Docker images stored in ECR
- Source code in Git repository
- Environment variables in Secrets Manager

## Scaling Considerations

### Backend Scaling

For higher loads:
1. Increase ECS service desired count
2. Use larger Fargate instances
3. Implement database read replicas
4. Add Redis for caching

### Frontend Scaling

Vercel automatically handles:
- Global CDN distribution
- Automatic scaling
- Edge caching

## Cost Optimization

### Current Setup Costs (Estimated)

- **RDS t3.micro**: ~$15/month
- **ECS Fargate (0.25 vCPU, 0.5GB)**: ~$10/month
- **Vercel Pro**: $20/month (if needed)
- **Data transfer**: ~$5/month

**Total**: ~$50/month for production deployment

### Cost Reduction Tips

1. Use RDS Reserved Instances for long-term savings
2. Implement auto-scaling to reduce idle costs
3. Use Vercel Hobby plan if traffic is low
4. Monitor and optimize data transfer costs

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check security group rules
   - Verify RDS endpoint and credentials
   - Ensure VPC configuration

2. **CORS Errors**
   - Verify `CORS_ALLOWED_ORIGINS` includes frontend domain
   - Check protocol (http vs https)

3. **Email Delivery Issues**
   - Verify ProtonMail app password
   - Check SMTP settings
   - Monitor CloudWatch logs

4. **Frontend API Errors**
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check network connectivity
   - Review browser console for errors

### Debugging Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster finance-tracker-cluster --services finance-tracker-backend-service

# View ECS logs
aws logs get-log-events --log-group-name /ecs/finance-tracker-backend --log-stream-name ecs/finance-tracker-backend/TASK_ID

# Test backend health
curl https://your-backend-url.com/api/health/

# Check Vercel deployment logs
vercel logs your-deployment-url
```

## Maintenance

### Regular Tasks

1. **Security Updates**
   - Update Docker base images monthly
   - Update dependencies regularly
   - Monitor security advisories

2. **Database Maintenance**
   - Monitor performance metrics
   - Review slow queries
   - Update statistics

3. **Monitoring**
   - Review CloudWatch metrics
   - Check error rates
   - Monitor costs

### Update Deployment

```bash
# Backend updates
docker build -t finance-tracker-backend .
docker tag finance-tracker-backend:latest YOUR_AWS_ACCOUNT.dkr.ecr.ap-southeast-1.amazonaws.com/finance-tracker-backend:latest
docker push YOUR_AWS_ACCOUNT.dkr.ecr.ap-southeast-1.amazonaws.com/finance-tracker-backend:latest
aws ecs update-service --cluster finance-tracker-cluster --service finance-tracker-backend-service --force-new-deployment

# Frontend updates
cd frontend
vercel --prod
```

This deployment guide provides a production-ready setup that can handle the requirements specified in the project while maintaining security, scalability, and cost-effectiveness.