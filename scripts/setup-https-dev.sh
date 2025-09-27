#!/bin/bash

# Personal Finance Tracker - Development HTTPS Setup
# This creates a self-signed certificate for development/testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
ALB_ARN=$(aws elbv2 describe-load-balancers --names finance-tracker-alb --region $AWS_REGION --query 'LoadBalancers[0].LoadBalancerArn' --output text)

echo -e "${BLUE}🔒 Setting up Development HTTPS (Self-Signed Certificate)${NC}"
echo "⚠️  This is for development only - not suitable for production!"
echo ""

# Step 1: Request a self-signed certificate in ACM
echo -e "${YELLOW}📜 Step 1: Creating self-signed certificate...${NC}"

# Create a temporary certificate request
cat > /tmp/cert-config.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = SG
ST = Singapore
L = Singapore
O = Personal Finance Tracker
OU = Development
CN = finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com
DNS.2 = *.ap-southeast-1.elb.amazonaws.com
EOF

# Generate private key and certificate
openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
    -keyout /tmp/private-key.pem \
    -out /tmp/certificate.pem \
    -config /tmp/cert-config.conf

echo -e "${GREEN}✅ Self-signed certificate created${NC}"

# Step 2: Import certificate to ACM
echo -e "\n${YELLOW}📤 Step 2: Importing certificate to ACM...${NC}"
CERT_ARN=$(aws acm import-certificate \
    --certificate fileb:///tmp/certificate.pem \
    --private-key fileb:///tmp/private-key.pem \
    --region $AWS_REGION \
    --query 'CertificateArn' \
    --output text)

echo -e "${GREEN}✅ Certificate imported: $CERT_ARN${NC}"

# Step 3: Create HTTPS listener
echo -e "\n${YELLOW}🔗 Step 3: Creating HTTPS listener...${NC}"
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$(aws elbv2 describe-target-groups --names finance-tracker-tg --region $AWS_REGION --query 'TargetGroups[0].TargetGroupArn' --output text) \
    --region $AWS_REGION >/dev/null

echo -e "${GREEN}✅ HTTPS listener created${NC}"

# Step 4: Update HTTP listener to redirect to HTTPS
echo -e "\n${YELLOW}🔄 Step 4: Updating HTTP listener to redirect to HTTPS...${NC}"
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn $ALB_ARN \
    --region $AWS_REGION \
    --query 'Listeners[?Port==`80`].ListenerArn' \
    --output text)

aws elbv2 modify-listener \
    --listener-arn $HTTP_LISTENER_ARN \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
    --region $AWS_REGION >/dev/null

echo -e "${GREEN}✅ HTTP redirect configured${NC}"

# Cleanup
rm -f /tmp/certificate.pem /tmp/private-key.pem /tmp/cert-config.conf

echo ""
echo -e "${GREEN}🎉 Development HTTPS Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 HTTPS URLs:${NC}"
echo "• Backend: https://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com"
echo "• Health Check: https://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com/api/health/"
echo ""
echo -e "${YELLOW}⚠️  Browser Security Warning:${NC}"
echo "Your browser will show a security warning because this is a self-signed certificate."
echo "Click 'Advanced' → 'Proceed to site' to continue."
echo ""
echo -e "${BLUE}🔗 For your frontend environment:${NC}"
echo "NEXT_PUBLIC_API_URL=https://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com"
