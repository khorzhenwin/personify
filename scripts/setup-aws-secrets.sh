#!/bin/bash

# Personal Finance Tracker - AWS Secrets Manager Setup Script
# This script creates the required secrets in AWS Secrets Manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo -e "${BLUE}🔐 Setting up AWS Secrets Manager for Personal Finance Tracker${NC}"
echo "Region: $AWS_REGION"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -n "Setting up secret '$secret_name'... "
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region $AWS_REGION >/dev/null 2>&1; then
        # Update existing secret
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region $AWS_REGION >/dev/null
        echo -e "${GREEN}✅ Updated${NC}"
    else
        # Create new secret
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region $AWS_REGION >/dev/null
        echo -e "${GREEN}✅ Created${NC}"
    fi
}

# Prompt for required values
echo -e "${YELLOW}Please provide the following configuration values:${NC}"
echo ""

# Django Secret Key
echo -n "Django Secret Key (leave empty to generate): "
read DJANGO_SECRET_KEY
if [ -z "$DJANGO_SECRET_KEY" ]; then
    DJANGO_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    echo "Generated Django secret key"
fi

# Database Configuration
echo -n "Database Host (RDS endpoint): "
read DB_HOST
echo -n "Database Name [finance_tracker]: "
read DB_NAME
DB_NAME=${DB_NAME:-finance_tracker}
echo -n "Database Username [postgres]: "
read DB_USER
DB_USER=${DB_USER:-postgres}
echo -n "Database Password: "
read -s DB_PASSWORD
echo ""

# Email Configuration
echo -n "ProtonMail Username [personify-mailer@protonmail.com]: "
read EMAIL_USER
EMAIL_USER=${EMAIL_USER:-personify-mailer@protonmail.com}
echo -n "ProtonMail App Password: "
read -s EMAIL_PASSWORD
echo ""

# Application Configuration
echo -n "Allowed Hosts (comma-separated, e.g., your-domain.com,localhost): "
read ALLOWED_HOSTS
echo -n "CORS Allowed Origins (comma-separated, e.g., https://personify-kzw.vercel.app): "
read CORS_ORIGINS

echo ""
echo -e "${YELLOW}Creating secrets in AWS Secrets Manager...${NC}"

# Create Django secret key
create_or_update_secret \
    "finance-tracker/django-secret-key" \
    "$DJANGO_SECRET_KEY" \
    "Django secret key for Finance Tracker application"

# Create database configuration
DB_CONFIG=$(cat << EOF
{
  "host": "$DB_HOST",
  "dbname": "$DB_NAME",
  "username": "$DB_USER",
  "password": "$DB_PASSWORD"
}
EOF
)

create_or_update_secret \
    "finance-tracker/db-config" \
    "$DB_CONFIG" \
    "Database configuration for Finance Tracker"

# Create email configuration
EMAIL_CONFIG=$(cat << EOF
{
  "username": "$EMAIL_USER",
  "password": "$EMAIL_PASSWORD"
}
EOF
)

create_or_update_secret \
    "finance-tracker/email-config" \
    "$EMAIL_CONFIG" \
    "Email configuration for Finance Tracker"

# Create application configuration
APP_CONFIG=$(cat << EOF
{
  "allowed_hosts": "$ALLOWED_HOSTS",
  "cors_origins": "$CORS_ORIGINS"
}
EOF
)

create_or_update_secret \
    "finance-tracker/app-config" \
    "$APP_CONFIG" \
    "Application configuration for Finance Tracker"

echo ""
echo -e "${GREEN}✅ All secrets have been created successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary of created secrets:${NC}"
echo "• finance-tracker/django-secret-key"
echo "• finance-tracker/db-config"
echo "• finance-tracker/email-config"
echo "• finance-tracker/app-config"
echo ""
echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
echo "• These secrets contain sensitive information"
echo "• Ensure your AWS IAM roles have appropriate permissions"
echo "• Regularly rotate passwords and secret keys"
echo "• Monitor access to these secrets through CloudTrail"
echo ""
echo -e "${GREEN}🎉 AWS Secrets Manager setup completed!${NC}"
echo "You can now run the ECS deployment script."