#!/bin/bash

# Personal Finance Tracker - Production ALB Setup Script
# This script sets up an Application Load Balancer with SSL for production access

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
DOMAIN_NAME="${DOMAIN_NAME:-personify-api.yourdomain.com}"  # Change this to your domain
ALB_NAME="finance-tracker-alb"
TARGET_GROUP_NAME="finance-tracker-tg"
ECS_CLUSTER="finance-tracker-cluster"
ECS_SERVICE="finance-tracker-backend-service"

# Validate required environment variables
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: AWS_ACCOUNT_ID environment variable is required${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Setting up Production ALB for Personal Finance Tracker${NC}"
echo "Region: $AWS_REGION"
echo "Account ID: $AWS_ACCOUNT_ID"
echo "Domain: $DOMAIN_NAME"
echo ""

# Step 1: Get VPC and subnet information
echo -e "${YELLOW}🔍 Step 1: Getting VPC and subnet information...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $AWS_REGION --query 'Vpcs[0].VpcId' --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION --query 'Subnets[*].SubnetId' --output text)
SUBNET_ARRAY=($SUBNET_IDS)

echo "VPC ID: $VPC_ID"
echo "Subnets: ${SUBNET_ARRAY[@]}"

# Step 2: Create security group for ALB
echo -e "\n${YELLOW}🔒 Step 2: Creating ALB security group...${NC}"
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name finance-tracker-alb-sg \
    --description "Security group for Finance Tracker ALB" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=finance-tracker-alb-sg" \
    --region $AWS_REGION \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Add inbound rules for HTTP and HTTPS
aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || echo "HTTP rule already exists"

aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || echo "HTTPS rule already exists"

echo -e "${GREEN}✅ ALB Security Group: $ALB_SG_ID${NC}"

# Step 3: Create Application Load Balancer
echo -e "\n${YELLOW}⚖️  Step 3: Creating Application Load Balancer...${NC}"
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets ${SUBNET_ARRAY[@]} \
    --security-groups $ALB_SG_ID \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || \
    aws elbv2 describe-load-balancers \
    --names $ALB_NAME \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo -e "${GREEN}✅ ALB Created: $ALB_DNS${NC}"

# Step 4: Create Target Group
echo -e "\n${YELLOW}🎯 Step 4: Creating Target Group...${NC}"
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name $TARGET_GROUP_NAME \
    --protocol HTTP \
    --port 8000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path /api/health/ \
    --health-check-protocol HTTP \
    --health-check-port 8000 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --health-check-timeout-seconds 10 \
    --health-check-interval-seconds 30 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || \
    aws elbv2 describe-target-groups \
    --names $TARGET_GROUP_NAME \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

echo -e "${GREEN}✅ Target Group Created: $TARGET_GROUP_ARN${NC}"

# Step 5: Skip redirect listener for now (will create HTTP listener with target group)
echo -e "\n${YELLOW}🔄 Step 5: Preparing for HTTP Listener...${NC}"
echo "Will create HTTP listener with target group in next step"

# Step 6: Request SSL Certificate (if domain is provided)
if [ "$DOMAIN_NAME" != "personify-api.yourdomain.com" ]; then
    echo -e "\n${YELLOW}🔐 Step 6: Requesting SSL Certificate...${NC}"
    CERT_ARN=$(aws acm request-certificate \
        --domain-name $DOMAIN_NAME \
        --validation-method DNS \
        --region $AWS_REGION \
        --query 'CertificateArn' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$CERT_ARN" ]; then
        echo -e "${GREEN}✅ SSL Certificate requested: $CERT_ARN${NC}"
        echo -e "${YELLOW}⚠️  Please validate the certificate in ACM console before proceeding${NC}"
    fi
else
    echo -e "\n${YELLOW}⚠️  Step 6: Skipping SSL certificate (using default domain)${NC}"
    echo "Please set DOMAIN_NAME environment variable to your actual domain"
fi

# Step 7: Create HTTPS Listener (temporary without SSL)
echo -e "\n${YELLOW}🔒 Step 7: Creating HTTP Listener for Target Group...${NC}"
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region $AWS_REGION >/dev/null 2>&1 || echo "HTTP listener with target group already exists"

echo "Note: For production, you'll need to add HTTPS listener with SSL certificate"

# Step 8: Update ECS Service to use Target Group
echo -e "\n${YELLOW}🔄 Step 8: Updating ECS Service to use ALB...${NC}"

# Get current ECS service configuration
SERVICE_CONFIG=$(aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION)

# Update service to use load balancer
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=finance-tracker-backend,containerPort=8000 \
    --region $AWS_REGION >/dev/null

echo -e "${GREEN}✅ ECS Service updated to use ALB${NC}"

# Step 9: Update ECS security group to allow ALB traffic
echo -e "\n${YELLOW}🔒 Step 9: Updating ECS security group...${NC}"
ECS_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=finance-tracker-ecs-sg" \
    --region $AWS_REGION \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Allow traffic from ALB to ECS
aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 8000 \
    --source-group $ALB_SG_ID \
    --region $AWS_REGION 2>/dev/null || echo "ALB to ECS rule already exists"

echo -e "${GREEN}✅ Security groups configured${NC}"

# Final output
echo -e "\n${GREEN}🎉 ALB Setup Complete!${NC}"
echo ""
echo "Load Balancer Details:"
echo "====================="
echo "ALB DNS Name: $ALB_DNS"
echo "HTTP URL: http://$ALB_DNS"
echo "Target Group: $TARGET_GROUP_ARN"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. If you provided a domain, validate the SSL certificate in ACM"
echo "2. Create a CNAME record pointing $DOMAIN_NAME to $ALB_DNS"
echo "3. Update the HTTPS listener with your validated certificate ARN"
echo "4. Update your frontend to use: https://$DOMAIN_NAME"
echo ""
echo -e "${YELLOW}⚠️  For now, you can test with: http://$ALB_DNS${NC}"
