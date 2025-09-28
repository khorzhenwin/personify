#!/bin/bash

# Deploy frontend to Vercel with proxy configuration
set -e

echo "🚀 Deploying frontend to Vercel with proxy configuration..."

cd frontend

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Set environment variables for Vercel
echo "Setting environment variables..."
vercel env add BACKEND_URL production <<< "http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com"

# Deploy to production
echo "Deploying to production..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app should now be available at: https://personify-kzw.vercel.app"
echo "🔄 The proxy will handle all API requests to avoid mixed content issues"
echo ""
echo "📋 Test these features:"
echo "1. Login/Registration"
echo "2. Password change"
echo "3. Budget creation"
echo "4. Transaction management"
