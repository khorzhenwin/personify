#!/bin/bash

# Personal Finance Tracker - AWS ECS Deployment Script
# This script builds and deploys the backend to AWS ECS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID}"
ECR_REPOSITORY="${ECR_REPOSITORY:-finance-tracker-backend}"
ECS_CLUSTER="${ECS_CLUSTER:-finance-tracker-cluster}"
ECS_SERVICE="${ECS_SERVICE:-finance-tracker-backend-service}"
TASK_FAMILY="${TASK_FAMILY:-finance-tracker-backend}"

# Validate required environment variables
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: AWS_ACCOUNT_ID environment variable is required${NC}"
    echo "Please set AWS_ACCOUNT_ID to your AWS account ID"
    exit 1
fi

echo -e "${BLUE}🚀 Starting AWS ECS deployment for Personal Finance Tracker Backend${NC}"
echo "Region: $AWS_REGION"
echo "Account ID: $AWS_ACCOUNT_ID"
echo "ECR Repository: $ECR_REPOSITORY"
echo "ECS Cluster: $ECS_CLUSTER"
echo ""

# Step 1: Create ECR repository if it doesn't exist
echo -e "${YELLOW}📦 Step 1: Setting up ECR repository...${NC}"
if aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION >/dev/null 2>&1; then
    echo -e "${GREEN}✅ ECR repository '$ECR_REPOSITORY' already exists${NC}"
else
    echo "Creating ECR repository..."
    aws ecr create-repository \
        --repository-name $ECR_REPOSITORY \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true
    echo -e "${GREEN}✅ ECR repository '$ECR_REPOSITORY' created${NC}"
fi

# Step 2: Ensure Docker authentication and build image
echo -e "\n${YELLOW}🔨 Step 2: Building Docker image...${NC}"
cd backend

# Ensure Docker is logged in
echo "Checking Docker authentication..."
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon not running${NC}"
    exit 1
fi

# Check Docker Hub authentication
echo "Verifying Docker Hub authentication..."
if docker pull hello-world >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker Hub authentication working${NC}"
    docker rmi hello-world >/dev/null 2>&1 || true
else
    echo -e "${YELLOW}⚠️  Docker Hub authentication may have issues, but continuing...${NC}"
fi

# Choose the best available Dockerfile
DOCKERFILE="Dockerfile"
if [ -f "Dockerfile.simple" ]; then
    echo "Using simple Ubuntu-based Dockerfile for better compatibility..."
    DOCKERFILE="Dockerfile.simple"
elif [ -f "Dockerfile.robust" ]; then
    echo "Using robust Dockerfile for better reliability..."
    DOCKERFILE="Dockerfile.robust"
fi

# Build with multiple fallback strategies
echo "Building Docker image with $DOCKERFILE..."
BUILD_SUCCESS=false

# Strategy 1: Build for AMD64 architecture (AWS Fargate)
if docker build --platform linux/amd64 -f $DOCKERFILE -t $ECR_REPOSITORY:latest .; then
    BUILD_SUCCESS=true
    echo -e "${GREEN}✅ Docker image built successfully for AMD64 architecture${NC}"
else
    echo "Standard build failed, trying with network host..."
    # Strategy 2: Host network with AMD64
    if docker build --platform linux/amd64 --network=host -f $DOCKERFILE -t $ECR_REPOSITORY:latest .; then
        BUILD_SUCCESS=true
        echo -e "${GREEN}✅ Docker image built successfully with host network and AMD64${NC}"
    else
        echo "Host network build failed, trying with buildkit disabled..."
        # Strategy 3: Disable BuildKit with AMD64
        if DOCKER_BUILDKIT=0 docker build --platform linux/amd64 -f $DOCKERFILE -t $ECR_REPOSITORY:latest .; then
            BUILD_SUCCESS=true
            echo -e "${GREEN}✅ Docker image built successfully with BuildKit disabled and AMD64${NC}"
        fi
    fi
fi

if [ "$BUILD_SUCCESS" = false ]; then
    echo -e "${RED}❌ All Docker build strategies failed${NC}"
    echo "Please check your Docker installation and network connectivity"
    exit 1
fi

# Step 3: Tag and push to ECR
echo -e "\n${YELLOW}📤 Step 3: Pushing image to ECR...${NC}"
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Tag image
docker tag $ECR_REPOSITORY:latest $ECR_URI:latest

# Push image
echo "Pushing image to ECR..."
docker push $ECR_URI:latest
echo -e "${GREEN}✅ Image pushed to ECR successfully${NC}"

# Step 4: Create ECS cluster if it doesn't exist
echo -e "\n${YELLOW}🏗️  Step 4: Setting up ECS cluster...${NC}"
if aws ecs describe-clusters --clusters $ECS_CLUSTER --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    echo -e "${GREEN}✅ ECS cluster '$ECS_CLUSTER' already exists and is active${NC}"
else
    echo "Creating ECS cluster..."
    aws ecs create-cluster \
        --cluster-name $ECS_CLUSTER \
        --region $AWS_REGION \
        --capacity-providers FARGATE \
        --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
    echo -e "${GREEN}✅ ECS cluster '$ECS_CLUSTER' created${NC}"
fi

# Step 5: Create CloudWatch log group
echo -e "\n${YELLOW}📊 Step 5: Setting up CloudWatch logging...${NC}"
LOG_GROUP="/ecs/$TASK_FAMILY"
if aws logs describe-log-groups --log-group-name-prefix $LOG_GROUP --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
    echo -e "${GREEN}✅ CloudWatch log group '$LOG_GROUP' already exists${NC}"
else
    echo "Creating CloudWatch log group..."
    aws logs create-log-group \
        --log-group-name $LOG_GROUP \
        --region $AWS_REGION
    echo -e "${GREEN}✅ CloudWatch log group '$LOG_GROUP' created${NC}"
fi

# Step 6: Create task definition
echo -e "\n${YELLOW}📋 Step 6: Creating ECS task definition...${NC}"
cd ..
cat > task-definition.json << EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "$TASK_FAMILY",
      "image": "$ECR_URI:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
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
        },
        {
          "name": "DB_PORT",
          "value": "5432"
        },
        {
          "name": "DB_SSL",
          "value": "require"
        }
      ],
      "secrets": [
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/django-secret-key-dODxcg"
        },
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/db-host-Nko4Yg"
        },
        {
          "name": "DB_NAME",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/db-name-GQYr2C"
        },
        {
          "name": "DB_USER",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/db-user-0JkKCk"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/db-password-edcODn"
        },
        {
          "name": "EMAIL_HOST_USER",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/email-user-3nPnqw"
        },
        {
          "name": "EMAIL_HOST_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/email-password-OE9Xhx"
        },
        {
          "name": "ALLOWED_HOSTS",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/allowed-hosts-w40PGq"
        },
        {
          "name": "CORS_ALLOWED_ORIGINS",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/cors-origins-yMnGPH"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "$LOG_GROUP",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Register task definition
echo "Registering task definition..."
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://task-definition.json \
    --region $AWS_REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)
echo -e "${GREEN}✅ Task definition registered: $TASK_DEFINITION_ARN${NC}"

# Step 7: Create or update ECS service
echo -e "\n${YELLOW}🚀 Step 7: Creating/updating ECS service...${NC}"

# Check if service exists
if aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    echo "Updating existing service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_SERVICE \
        --task-definition $TASK_DEFINITION_ARN \
        --region $AWS_REGION \
        --force-new-deployment
    echo -e "${GREEN}✅ Service updated successfully${NC}"
else
    echo "Creating new service..."
    
    # Get default VPC and subnets
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $AWS_REGION --query 'Vpcs[0].VpcId' --output text)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')
    
    # Create security group for ECS service
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name finance-tracker-ecs-sg \
        --description "Security group for Finance Tracker ECS service" \
        --vpc-id $VPC_ID \
        --region $AWS_REGION \
        --query 'GroupId' \
        --output text 2>/dev/null || \
        aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=finance-tracker-ecs-sg" \
        --region $AWS_REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
    
    # Add inbound rules to security group
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 8000 \
        --cidr 0.0.0.0/0 \
        --region $AWS_REGION 2>/dev/null || echo "Security group rule already exists"
    
    # Create service
    aws ecs create-service \
        --cluster $ECS_CLUSTER \
        --service-name $ECS_SERVICE \
        --task-definition $TASK_DEFINITION_ARN \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
        --region $AWS_REGION
    echo -e "${GREEN}✅ Service created successfully${NC}"
fi

# Step 8: Wait for service to be stable
echo -e "\n${YELLOW}⏳ Step 8: Waiting for service to be stable...${NC}"
echo "This may take a few minutes..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION

echo -e "${GREEN}✅ Service is now stable and running${NC}"

# Step 9: Get service information
echo -e "\n${YELLOW}📋 Step 9: Getting service information...${NC}"
TASK_ARN=$(aws ecs list-tasks \
    --cluster $ECS_CLUSTER \
    --service-name $ECS_SERVICE \
    --region $AWS_REGION \
    --query 'taskArns[0]' \
    --output text)

if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
    PUBLIC_IP=$(aws ecs describe-tasks \
        --cluster $ECS_CLUSTER \
        --tasks $TASK_ARN \
        --region $AWS_REGION \
        --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
        --output text | xargs -I {} aws ec2 describe-network-interfaces \
        --network-interface-ids {} \
        --region $AWS_REGION \
        --query 'NetworkInterfaces[0].Association.PublicIp' \
        --output text)
    
    if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
        echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
        echo ""
        echo "Service Details:"
        echo "==============="
        echo "Cluster: $ECS_CLUSTER"
        echo "Service: $ECS_SERVICE"
        echo "Task Definition: $TASK_FAMILY"
        echo "Public IP: $PUBLIC_IP"
        echo "Backend URL: http://$PUBLIC_IP:8000"
        echo "Health Check: http://$PUBLIC_IP:8000/api/health/"
        echo ""
        echo -e "${BLUE}🔗 You can now update your frontend environment variables:${NC}"
        echo "NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:8000"
        echo ""
        echo -e "${YELLOW}⚠️  Note: This uses HTTP. For production, set up an Application Load Balancer with SSL.${NC}"
    else
        echo -e "${YELLOW}⚠️  Service deployed but public IP not yet available. Check AWS console.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Service deployed but task not yet running. Check AWS console.${NC}"
fi

# Cleanup
rm -f task-definition.json

echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"