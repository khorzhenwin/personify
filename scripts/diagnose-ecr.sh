#!/bin/bash

# ECR Diagnostic Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 ECR Diagnostic Script${NC}"
echo "=================================="

# Configuration
AWS_REGION=${AWS_REGION:-ap-southeast-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null)}
ECR_REPOSITORY=finance-tracker-backend

echo -e "\n${BLUE}📋 Configuration:${NC}"
echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo "ECR Repository: $ECR_REPOSITORY"

# Test 1: AWS Identity
echo -e "\n${YELLOW}🔍 Test 1: AWS Identity${NC}"
if aws sts get-caller-identity; then
    echo -e "${GREEN}✅ AWS credentials are working${NC}"
else
    echo -e "${RED}❌ AWS credentials failed${NC}"
    exit 1
fi

# Test 2: ECR Authorization
echo -e "\n${YELLOW}🔍 Test 2: ECR Authorization${NC}"
if aws ecr get-authorization-token --region $AWS_REGION >/dev/null 2>&1; then
    echo -e "${GREEN}✅ ECR authorization successful${NC}"
else
    echo -e "${RED}❌ ECR authorization failed - missing permissions${NC}"
    echo "Your AWS user needs ECR permissions. Add these policies:"
    echo "- AmazonEC2ContainerRegistryFullAccess"
    echo "- Or custom policy with ecr:GetAuthorizationToken, ecr:BatchCheckLayerAvailability, etc."
    exit 1
fi

# Test 3: ECR Repository Exists
echo -e "\n${YELLOW}🔍 Test 3: ECR Repository${NC}"
if aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION >/dev/null 2>&1; then
    echo -e "${GREEN}✅ ECR repository exists${NC}"
else
    echo -e "${YELLOW}⚠️  ECR repository doesn't exist, creating...${NC}"
    if aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION; then
        echo -e "${GREEN}✅ ECR repository created${NC}"
    else
        echo -e "${RED}❌ Failed to create ECR repository${NC}"
        exit 1
    fi
fi

# Test 4: Docker Login
echo -e "\n${YELLOW}🔍 Test 4: Docker Login${NC}"
echo "Attempting ECR login..."

# Clear existing login
docker logout 2>/dev/null || true

# Get login token and login
if aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com; then
    echo -e "${GREEN}✅ Docker login successful${NC}"
else
    echo -e "${RED}❌ Docker login failed${NC}"
    exit 1
fi

# Test 5: Docker Build Test
echo -e "\n${YELLOW}🔍 Test 5: Docker Build Test${NC}"
echo "Testing Docker build capability..."

# Create a simple test Dockerfile
cat > /tmp/test-dockerfile << 'EOF'
FROM python:3.11-slim
RUN echo "Test build successful"
EOF

if docker build -f /tmp/test-dockerfile -t test-build /tmp; then
    echo -e "${GREEN}✅ Docker build works${NC}"
    docker rmi test-build 2>/dev/null || true
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Test 6: ECR Push Test
echo -e "\n${YELLOW}🔍 Test 6: ECR Push Test${NC}"
echo "Testing ECR push capability..."

# Create a minimal test image
docker pull alpine:latest
docker tag alpine:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:test

if docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:test; then
    echo -e "${GREEN}✅ ECR push successful${NC}"
    # Clean up test image
    aws ecr batch-delete-image --repository-name $ECR_REPOSITORY --image-ids imageTag=test --region $AWS_REGION >/dev/null 2>&1 || true
else
    echo -e "${RED}❌ ECR push failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 All ECR diagnostics passed!${NC}"
echo -e "${BLUE}You can now run the deployment script:${NC}"
echo "export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
echo "./scripts/deploy-to-ecs.sh"

# Clean up
rm -f /tmp/test-dockerfile
docker rmi alpine:latest 2>/dev/null || true
docker rmi $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:test 2>/dev/null || true