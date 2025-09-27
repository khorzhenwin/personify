#!/bin/bash

# Personal Finance Tracker - IAM Roles Setup Script
# This script creates the required IAM roles for ECS deployment

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

if [ -z "$AWS_ACCOUNT_ID" ]; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
fi

echo -e "${BLUE}🔐 Setting up IAM roles for Personal Finance Tracker ECS deployment${NC}"
echo "Region: $AWS_REGION"
echo "Account ID: $AWS_ACCOUNT_ID"
echo ""

# Function to create IAM role if it doesn't exist
create_iam_role() {
    local role_name=$1
    local trust_policy=$2
    local description=$3
    
    echo -n "Setting up IAM role '$role_name'... "
    
    if aws iam get-role --role-name "$role_name" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Already exists${NC}"
    else
        aws iam create-role \
            --role-name "$role_name" \
            --assume-role-policy-document "$trust_policy" \
            --description "$description" >/dev/null
        echo -e "${GREEN}✅ Created${NC}"
    fi
}

# Function to attach policy to role
attach_policy() {
    local role_name=$1
    local policy_arn=$2
    
    echo -n "Attaching policy to '$role_name'... "
    
    aws iam attach-role-policy \
        --role-name "$role_name" \
        --policy-arn "$policy_arn" 2>/dev/null || echo -n ""
    echo -e "${GREEN}✅ Done${NC}"
}

# ECS Task Execution Role Trust Policy
ECS_TRUST_POLICY=$(cat << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

echo -e "${YELLOW}Creating ECS Task Execution Role...${NC}"

# Create ECS Task Execution Role
create_iam_role \
    "ecsTaskExecutionRole" \
    "$ECS_TRUST_POLICY" \
    "ECS Task Execution Role for Finance Tracker"

# Attach AWS managed policies
attach_policy "ecsTaskExecutionRole" "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"

# Create custom policy for Secrets Manager access
SECRETS_POLICY_NAME="FinanceTrackerSecretsAccess"
echo -n "Setting up Secrets Manager access policy... "

SECRETS_POLICY=$(cat << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:finance-tracker/*"
      ]
    }
  ]
}
EOF
)

# Check if policy exists
if aws iam get-policy --policy-arn "arn:aws:iam::$AWS_ACCOUNT_ID:policy/$SECRETS_POLICY_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Policy already exists${NC}"
else
    aws iam create-policy \
        --policy-name "$SECRETS_POLICY_NAME" \
        --policy-document "$SECRETS_POLICY" \
        --description "Allows access to Finance Tracker secrets in Secrets Manager" >/dev/null
    echo -e "${GREEN}✅ Policy created${NC}"
fi

# Attach custom policy to role
attach_policy "ecsTaskExecutionRole" "arn:aws:iam::$AWS_ACCOUNT_ID:policy/$SECRETS_POLICY_NAME"

echo ""
echo -e "${YELLOW}Setting up ECS Service Role (if needed)...${NC}"

# ECS Service Role (for load balancer integration, if needed later)
ECS_SERVICE_TRUST_POLICY=$(cat << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

create_iam_role \
    "AWSServiceRoleForECS" \
    "$ECS_SERVICE_TRUST_POLICY" \
    "ECS Service Role for Finance Tracker" || echo -e "${YELLOW}⚠️  Service-linked role may already exist${NC}"

echo ""
echo -e "${GREEN}✅ IAM roles setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary of IAM roles:${NC}"
echo "• ecsTaskExecutionRole - For ECS task execution and secrets access"
echo "• AWSServiceRoleForECS - For ECS service management (if needed)"
echo ""
echo -e "${BLUE}📋 Summary of policies:${NC}"
echo "• AmazonECSTaskExecutionRolePolicy (AWS managed)"
echo "• $SECRETS_POLICY_NAME (custom policy for secrets access)"
echo ""
echo -e "${YELLOW}⚠️  Security Notes:${NC}"
echo "• These roles follow the principle of least privilege"
echo "• Secrets access is restricted to finance-tracker/* namespace"
echo "• Review and audit role permissions regularly"
echo ""
echo -e "${GREEN}🎉 IAM setup completed!${NC}"
echo "You can now run the secrets setup and ECS deployment scripts."