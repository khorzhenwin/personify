#!/bin/bash

# Personal Finance Tracker - Complete Deployment Script
# This script orchestrates the complete AWS deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Personal Finance Tracker - Complete AWS Deployment${NC}"
echo "=================================================="
echo ""

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo ""

# Export variables for sub-scripts
export AWS_ACCOUNT_ID
export AWS_REGION

# Step 1: Setup IAM roles
echo -e "${YELLOW}📋 Step 1: Setting up IAM roles...${NC}"
if [ -f "scripts/setup-iam-roles.sh" ]; then
    ./scripts/setup-iam-roles.sh
else
    echo -e "${RED}❌ IAM setup script not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Waiting for IAM roles to propagate...${NC}"
sleep 10

# Step 2: Setup AWS Secrets
echo -e "${YELLOW}🔐 Step 2: Setting up AWS Secrets Manager...${NC}"
echo -e "${BLUE}ℹ️  You will be prompted for configuration values.${NC}"
echo ""

if [ -f "scripts/setup-aws-secrets.sh" ]; then
    ./scripts/setup-aws-secrets.sh
else
    echo -e "${RED}❌ Secrets setup script not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Waiting for secrets to be available...${NC}"
sleep 5

# Step 3: Deploy to ECS
echo -e "${YELLOW}🚀 Step 3: Deploying to AWS ECS...${NC}"
if [ -f "scripts/deploy-to-ecs.sh" ]; then
    ./scripts/deploy-to-ecs.sh
else
    echo -e "${RED}❌ ECS deployment script not found${NC}"
    exit 1
fi

# Step 4: Run deployment tests
echo -e "\n${YELLOW}🧪 Step 4: Running deployment verification tests...${NC}"

# Get the public IP from ECS service
ECS_CLUSTER="${ECS_CLUSTER:-finance-tracker-cluster}"
ECS_SERVICE="${ECS_SERVICE:-finance-tracker-backend-service}"

echo "Getting service endpoint..."
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
        BACKEND_URL="http://$PUBLIC_IP:8000"
        export BACKEND_URL
        
        echo "Backend URL: $BACKEND_URL"
        echo "Waiting for service to be fully ready..."
        sleep 30
        
        # Run basic health check
        echo -n "Testing backend health... "
        if curl -s -f "$BACKEND_URL/api/health/" >/dev/null; then
            echo -e "${GREEN}✅ Backend is healthy${NC}"
        else
            echo -e "${RED}❌ Backend health check failed${NC}"
            echo "Please check the ECS service logs in AWS Console"
        fi
        
        # Run deployment tests if available
        if [ -f "scripts/test-deployment.sh" ]; then
            echo ""
            echo "Running comprehensive deployment tests..."
            ./scripts/test-deployment.sh || echo -e "${YELLOW}⚠️  Some tests failed, but deployment may still be functional${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Public IP not yet available. Service may still be starting.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Task not yet running. Service may still be starting.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "======================"
echo "• AWS Region: $AWS_REGION"
echo "• ECS Cluster: $ECS_CLUSTER"
echo "• ECS Service: $ECS_SERVICE"
if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
    echo "• Backend URL: http://$PUBLIC_IP:8000"
    echo "• Health Check: http://$PUBLIC_IP:8000/api/health/"
fi
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Update your frontend environment variables:"
if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
    echo "   NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:8000"
fi
echo "2. Deploy your frontend to Vercel"
echo "3. Set up a custom domain and SSL certificate (recommended for production)"
echo "4. Configure monitoring and alerting"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "• This deployment uses HTTP. For production, set up an Application Load Balancer with SSL"
echo "• Monitor your AWS costs and usage"
echo "• Regularly update your Docker images and dependencies"
echo "• Review and rotate your secrets periodically"
echo ""
echo -e "${GREEN}✅ Your Personal Finance Tracker backend is now deployed on AWS ECS!${NC}"