#!/bin/bash

# Setup HTTPS for ALB with self-signed certificate
set -e

echo "🔒 Setting up HTTPS for Application Load Balancer..."

# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers --names finance-tracker-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text)
echo "ALB ARN: $ALB_ARN"

# Check if we already have an HTTPS listener
HTTPS_LISTENER=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[?Port==`443`].ListenerArn' --output text)

if [ -n "$HTTPS_LISTENER" ]; then
    echo "✅ HTTPS listener already exists: $HTTPS_LISTENER"
else
    echo "❌ No HTTPS listener found. You need to:"
    echo "1. Get an SSL certificate (ACM or upload your own)"
    echo "2. Create an HTTPS listener on port 443"
    echo ""
    echo "For testing, you can:"
    echo "- Use AWS Certificate Manager (ACM) to get a free SSL certificate"
    echo "- Or continue using HTTP for development"
fi

# Get current target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[0].DefaultActions[0].TargetGroupArn' --output text)
echo "Target Group ARN: $TARGET_GROUP_ARN"

echo ""
echo "🌐 Current ALB DNS: $(aws elbv2 describe-load-balancers --names finance-tracker-alb --query 'LoadBalancers[0].DNSName' --output text)"
echo ""
echo "📋 To enable HTTPS:"
echo "1. Get a domain name"
echo "2. Create SSL certificate in ACM"
echo "3. Add HTTPS listener to ALB"
echo "4. Update frontend to use https:// URL"
