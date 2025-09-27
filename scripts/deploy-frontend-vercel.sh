#!/bin/bash

# Personal Finance Tracker - Vercel Frontend Deployment Script
# This script deploys the frontend to Vercel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Personal Finance Tracker - Vercel Frontend Deployment${NC}"
echo "=================================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo -e "${RED}❌ Error: frontend/package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Get backend URL
BACKEND_URL="${BACKEND_URL:-}"
if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  BACKEND_URL not set. Checking for deployed ALB...${NC}"
    
    # Try to get the ALB URL
    if command -v aws &> /dev/null; then
        ALB_DNS=$(aws elbv2 describe-load-balancers --names finance-tracker-alb --region ap-southeast-1 --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "None")
        
        if [ "$ALB_DNS" != "None" ] && [ -n "$ALB_DNS" ]; then
            BACKEND_URL="http://$ALB_DNS"
            echo -e "${GREEN}✅ Found backend URL: $BACKEND_URL${NC}"
        fi
    fi
    
    if [ -z "$BACKEND_URL" ]; then
        echo -e "${YELLOW}⚠️  Could not automatically detect backend URL${NC}"
        echo "Please provide the backend URL:"
        read -p "Backend URL (e.g., http://your-alb-url.elb.amazonaws.com): " BACKEND_URL
        
        if [ -z "$BACKEND_URL" ]; then
            echo -e "${RED}❌ Backend URL is required for deployment${NC}"
            exit 1
        fi
    fi
fi

echo ""
echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Backend URL: $BACKEND_URL"
echo "Frontend Directory: frontend/"
echo "Build Command: npm run build"
echo ""

# Change to frontend directory
cd frontend

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Run tests to ensure everything is working
echo -e "${BLUE}🧪 Running tests...${NC}"
npm run test -- --passWithNoTests --watchAll=false

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

# Deploy to Vercel
echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
echo ""

# Set environment variables for Vercel
export NEXT_PUBLIC_API_URL="$BACKEND_URL"

# Deploy with environment variables
vercel --prod \
    --env NEXT_PUBLIC_API_URL="$BACKEND_URL" \
    --env NODE_ENV=production \
    --env NEXT_PUBLIC_ENABLE_ANALYTICS=true \
    --env NEXT_PUBLIC_ENABLE_EXPORT=true \
    --confirm

echo ""
echo -e "${GREEN}✅ Frontend deployment completed!${NC}"
echo ""
echo -e "${BLUE}🔗 Deployment Information:${NC}"
echo "Frontend URL: Check Vercel dashboard for the deployed URL"
echo "Backend URL: $BACKEND_URL"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Test the deployed application"
echo "2. Verify API connectivity"
echo "3. Test responsive design on multiple devices"
echo "4. Run end-to-end tests against production"
echo ""
echo -e "${YELLOW}⚠️  Note: Make sure your backend CORS settings allow the Vercel domain${NC}"