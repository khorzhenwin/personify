# AWS ECS Deployment Guide

This guide provides step-by-step instructions for deploying the Personal Finance Tracker backend to AWS ECS (Elastic Container Service) using Fargate.

## Prerequisites

Before starting the deployment, ensure you have:

1. **AWS CLI installed and configured**
   ```bash
   aws --version
   aws configure list
   ```

2. **Docker installed**
   ```bash
   docker --version
   ```

3. **AWS Account with appropriate permissions**
   - ECS full access
   - ECR full access
   - IAM role management
   - Secrets Manager access
   - VPC and EC2 basic access

4. **PostgreSQL database** (AWS RDS recommended)
   - Database endpoint
   - Username and password
   - Database name

5. **ProtonMail account** for email services
   - Email address: personify-mailer@protonmail.com
   - App-specific password

## Quick Deployment

For a complete automated deployment, run:

```bash
# Set your AWS region (optional, defaults to ap-southeast-1)
export AWS_REGION=ap-southeast-1

# Run complete deployment
./scripts/deploy-complete.sh
```

This script will:
1. Set up IAM roles
2. Configure AWS Secrets Manager
3. Build and push Docker image to ECR
4. Create ECS cluster and service
5. Run deployment tests

## Manual Step-by-Step Deployment

If you prefer to run each step manually:

### Step 1: Set up IAM Roles

```bash
./scripts/setup-iam-roles.sh
```

This creates:
- `ecsTaskExecutionRole` - For ECS task execution
- `FinanceTrackerSecretsAccess` policy - For accessing secrets

### Step 2: Configure AWS Secrets Manager

```bash
./scripts/setup-aws-secrets.sh
```

You'll be prompted for:
- Django secret key (auto-generated if empty)
- Database configuration (host, name, username, password)
- Email configuration (ProtonMail credentials)
- Application configuration (allowed hosts, CORS origins)

### Step 3: Deploy to ECS

```bash
# Set your AWS account ID
export AWS_ACCOUNT_ID=123456789012

./scripts/deploy-to-ecs.sh
```

This will:
- Create ECR repository
- Build and push Docker image
- Create ECS cluster
- Register task definition
- Create ECS service
- Configure security groups

### Step 4: Test Deployment

```bash
./scripts/test-ecs-deployment.sh
```

## Configuration Details

### Environment Variables

The deployment uses AWS Secrets Manager for sensitive data:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `finance-tracker/django-secret-key` | Django secret key | Auto-generated |
| `finance-tracker/db-config` | Database configuration | `{"host": "...", "dbname": "...", ...}` |
| `finance-tracker/email-config` | Email credentials | `{"username": "...", "password": "..."}` |
| `finance-tracker/app-config` | App configuration | `{"allowed_hosts": "...", "cors_origins": "..."}` |

### ECS Task Configuration

- **CPU**: 256 (0.25 vCPU)
- **Memory**: 512 MB
- **Launch Type**: Fargate
- **Network**: awsvpc with public IP
- **Port**: 8000

### Security Groups

The deployment creates a security group that allows:
- Inbound HTTP traffic on port 8000 from anywhere (0.0.0.0/0)
- All outbound traffic

## Accessing Your Deployment

After successful deployment, you'll get:

- **Backend URL**: `http://PUBLIC_IP:8000`
- **Health Check**: `http://PUBLIC_IP:8000/api/health/`
- **API Root**: `http://PUBLIC_IP:8000/api/`

## Frontend Configuration

Update your frontend environment variables:

```bash
# In your frontend .env.production file
NEXT_PUBLIC_API_URL=http://PUBLIC_IP:8000
```

## Monitoring and Logs

### CloudWatch Logs

ECS tasks automatically log to CloudWatch:
- Log Group: `/ecs/finance-tracker-backend`
- Log Stream: `ecs/finance-tracker-backend/TASK_ID`

View logs:
```bash
aws logs describe-log-streams --log-group-name /ecs/finance-tracker-backend
```

### Health Monitoring

The backend includes a health check endpoint:
```bash
curl http://PUBLIC_IP:8000/api/health/
```

Expected response:
```json
{
  "status": "healthy",
  "service": "finance-tracker-backend"
}
```

## Scaling and Updates

### Update Deployment

To deploy a new version:

```bash
# Rebuild and push new image
cd backend
docker build -t finance-tracker-backend .
docker tag finance-tracker-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/finance-tracker-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/finance-tracker-backend:latest

# Force new deployment
aws ecs update-service \
  --cluster finance-tracker-cluster \
  --service finance-tracker-backend-service \
  --force-new-deployment
```

### Scale Service

To increase the number of running tasks:

```bash
aws ecs update-service \
  --cluster finance-tracker-cluster \
  --service finance-tracker-backend-service \
  --desired-count 2
```

## Cost Optimization

### Current Estimated Costs (ap-southeast-1)

- **ECS Fargate**: ~$10/month (0.25 vCPU, 0.5GB, 24/7)
- **ECR Storage**: ~$1/month (for Docker images)
- **CloudWatch Logs**: ~$2/month (basic logging)
- **Data Transfer**: ~$2/month (minimal usage)

**Total**: ~$15/month for backend infrastructure

### Cost Reduction Tips

1. **Use Spot Instances** (for non-critical workloads)
2. **Schedule scaling** (scale down during low usage)
3. **Optimize Docker image size**
4. **Use log retention policies**

## Security Best Practices

### Current Security Features

- ✅ All secrets stored in AWS Secrets Manager
- ✅ IAM roles with least privilege access
- ✅ VPC security groups
- ✅ HTTPS-ready (requires load balancer)
- ✅ Container health checks

### Production Security Enhancements

For production deployments, consider:

1. **Application Load Balancer with SSL**
   ```bash
   # Create ALB with SSL certificate
   aws elbv2 create-load-balancer \
     --name finance-tracker-alb \
     --subnets subnet-xxx subnet-yyy \
     --security-groups sg-xxx
   ```

2. **Private Subnets**
   - Move ECS tasks to private subnets
   - Use NAT Gateway for outbound internet access

3. **WAF (Web Application Firewall)**
   - Protect against common web attacks
   - Rate limiting and IP filtering

4. **VPC Endpoints**
   - Private connectivity to AWS services
   - Reduce data transfer costs

## Troubleshooting

### Common Issues

1. **Task fails to start**
   ```bash
   # Check task definition
   aws ecs describe-task-definition --task-definition finance-tracker-backend
   
   # Check service events
   aws ecs describe-services --cluster finance-tracker-cluster --services finance-tracker-backend-service
   ```

2. **Health check failures**
   ```bash
   # Check logs
   aws logs get-log-events --log-group-name /ecs/finance-tracker-backend --log-stream-name STREAM_NAME
   
   # Test health endpoint
   curl -v http://PUBLIC_IP:8000/api/health/
   ```

3. **Database connection issues**
   - Verify RDS security group allows connections from ECS security group
   - Check database credentials in Secrets Manager
   - Ensure database is in the same VPC or accessible

4. **CORS errors**
   - Update `CORS_ALLOWED_ORIGINS` in app-config secret
   - Redeploy service after updating secrets

### Debug Commands

```bash
# Get service status
aws ecs describe-services --cluster finance-tracker-cluster --services finance-tracker-backend-service

# List running tasks
aws ecs list-tasks --cluster finance-tracker-cluster --service-name finance-tracker-backend-service

# Get task details
aws ecs describe-tasks --cluster finance-tracker-cluster --tasks TASK_ARN

# View recent logs
aws logs get-log-events --log-group-name /ecs/finance-tracker-backend --log-stream-name STREAM_NAME --start-time $(date -d '1 hour ago' +%s)000
```

## Cleanup

To remove all AWS resources:

```bash
# Delete ECS service
aws ecs update-service --cluster finance-tracker-cluster --service finance-tracker-backend-service --desired-count 0
aws ecs delete-service --cluster finance-tracker-cluster --service finance-tracker-backend-service

# Delete ECS cluster
aws ecs delete-cluster --cluster finance-tracker-cluster

# Delete ECR repository
aws ecr delete-repository --repository-name finance-tracker-backend --force

# Delete secrets (optional)
aws secretsmanager delete-secret --secret-id finance-tracker/django-secret-key --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id finance-tracker/db-config --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id finance-tracker/email-config --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id finance-tracker/app-config --force-delete-without-recovery

# Delete security group
aws ec2 delete-security-group --group-name finance-tracker-ecs-sg
```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Verify all prerequisites are met
4. Ensure AWS credentials have sufficient permissions

## Next Steps

After successful backend deployment:

1. **Deploy Frontend to Vercel**
   - Update `NEXT_PUBLIC_API_URL` environment variable
   - Deploy using Vercel CLI or GitHub integration

2. **Set up Custom Domain** (Optional)
   - Configure Route 53 or your DNS provider
   - Set up SSL certificate with AWS Certificate Manager
   - Create Application Load Balancer

3. **Set up Monitoring**
   - CloudWatch alarms for health checks
   - SNS notifications for failures
   - AWS X-Ray for distributed tracing

4. **Implement CI/CD** (Optional)
   - GitHub Actions for automated deployments
   - Automated testing pipeline
   - Blue-green deployments

Your Personal Finance Tracker backend is now running on AWS ECS! 🎉