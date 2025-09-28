#!/bin/bash

# Personal Finance Tracker - Fix Vercel Deployment Script
# This script helps troubleshoot and fix Vercel deployment issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Personal Finance Tracker - Vercel Deployment Fix${NC}"
echo "=================================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo -e "${RED}❌ Error: frontend/package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${YELLOW}🔍 Step 1: Checking frontend build locally...${NC}"
cd frontend

# Install dependencies
echo "Installing dependencies..."
npm install

# Try to build locally to check for errors
echo "Testing local build..."
if npm run build; then
    echo -e "${GREEN}✅ Local build successful${NC}"
else
    echo -e "${RED}❌ Local build failed. Please fix build errors first.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Step 2: Checking Next.js configuration...${NC}"

# Check if next.config.ts is valid
if node -e "require('./next.config.ts')" 2>/dev/null; then
    echo -e "${GREEN}✅ Next.js config is valid${NC}"
else
    echo -e "${RED}❌ Next.js config has issues${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Step 3: Vercel Deployment Instructions${NC}"
echo ""
echo "To fix your Vercel deployment, follow these steps:"
echo ""
echo "1. Go to your Vercel dashboard: https://vercel.com/khorzhenwins-projects/personify"
echo "2. Click on 'Settings' tab"
echo "3. Go to 'General' section"
echo "4. Set the following configuration:"
echo ""
echo -e "${BLUE}   Root Directory: ${GREEN}frontend${NC}"
echo -e "${BLUE}   Framework Preset: ${GREEN}Next.js${NC}"
echo -e "${BLUE}   Build Command: ${GREEN}npm run build${NC}"
echo -e "${BLUE}   Output Directory: ${GREEN}.next${NC}"
echo -e "${BLUE}   Install Command: ${GREEN}npm install${NC}"
echo ""
echo "5. Go to 'Environment Variables' section"
echo "6. Add the following environment variable:"
echo ""
echo -e "${BLUE}   Name: ${GREEN}NEXT_PUBLIC_API_URL${NC}"
echo -e "${BLUE}   Value: ${GREEN}http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com${NC}"
echo -e "${BLUE}   Environment: ${GREEN}Production, Preview, Development${NC}"
echo ""
echo "7. Go to 'Deployments' tab"
echo "8. Click 'Redeploy' on the latest deployment"
echo ""

echo -e "${YELLOW}🔍 Step 4: Alternative - Deploy via CLI${NC}"
echo ""
echo "If you have Vercel CLI installed, you can also deploy directly:"
echo ""
echo "vercel --prod \\"
echo "  --env NEXT_PUBLIC_API_URL=http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com \\"
echo "  --confirm"
echo ""

echo -e "${YELLOW}🔍 Step 5: Common Issues and Solutions${NC}"
echo ""
echo "If you're still getting 404 errors:"
echo ""
echo "• Make sure the Root Directory is set to 'frontend' in Vercel settings"
echo "• Verify that the Framework Preset is set to 'Next.js'"
echo "• Check that there are no TypeScript errors in the build"
echo "• Ensure all dependencies are properly installed"
echo "• Try clearing Vercel's build cache and redeploying"
echo ""

echo -e "${YELLOW}🔍 Step 6: Testing the deployment${NC}"
echo ""
echo "After redeploying, test these URLs:"
echo "• https://personify-kzw.vercel.app/ (should redirect to login)"
echo "• https://personify-kzw.vercel.app/auth/login (login page)"
echo "• https://personify-kzw.vercel.app/auth/register (register page)"
echo ""

echo -e "${GREEN}✅ Local build test completed successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Follow the Vercel configuration steps above"
echo "2. Redeploy your application"
echo "3. Test the deployment URLs"
echo "4. If issues persist, check Vercel build logs for specific errors"
echo ""

cd ..
echo -e "${GREEN}🎉 Ready to fix your Vercel deployment!${NC}"
