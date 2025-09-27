#!/bin/bash

# Personal Finance Tracker - Production HTTPS Setup
# This sets up HTTPS with a real domain and valid SSL certificate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
DOMAIN_NAME="${DOMAIN_NAME}"
ALB_ARN=$(aws elbv2 describe-load-balancers --names finance-tracker-alb --region $AWS_REGION --query 'LoadBalancers[0].LoadBalancerArn' --output text)
ALB_DNS=$(aws elbv2 describe-load-balancers --names finance-tracker-alb --region $AWS_REGION --query 'LoadBalancers[0].DNSName' --output text)

echo -e "${BLUE}🔒 Setting up Production HTTPS with Valid SSL Certificate${NC}"
echo ""

# Validate domain name
if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}❌ Error: DOMAIN_NAME environment variable is required${NC}"
    echo "Please set your domain name:"
    echo "export DOMAIN_NAME=api.yourdomain.com"
    echo "Then run this script again."
    exit 1
fi

echo "Domain: $DOMAIN_NAME"
echo "ALB DNS: $ALB_DNS"
echo ""

# Step 1: Request SSL certificate
echo -e "${YELLOW}📜 Step 1: Requesting SSL certificate from AWS Certificate Manager...${NC}"
CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --validation-method DNS \
    --region $AWS_REGION \
    --query 'CertificateArn' \
    --output text)

echo -e "${GREEN}✅ SSL certificate requested: $CERT_ARN${NC}"

# Step 2: Get validation records
echo -e "\n${YELLOW}📋 Step 2: Getting DNS validation records...${NC}"
echo "Waiting for validation records to be available..."
sleep 10

VALIDATION_RECORDS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region $AWS_REGION \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
    --output json)

VALIDATION_NAME=$(echo $VALIDATION_RECORDS | jq -r '.Name')
VALIDATION_VALUE=$(echo $VALIDATION_RECORDS | jq -r '.Value')

echo ""
echo -e "${BLUE}📋 DNS Validation Required:${NC}"
echo "================================"
echo "Record Type: CNAME"
echo "Name: $VALIDATION_NAME"
echo "Value: $VALIDATION_VALUE"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: You must add this DNS record to validate your certificate!${NC}"
echo ""
echo "Steps to complete:"
echo "1. Go to your domain registrar's DNS management"
echo "2. Add a CNAME record with the above Name and Value"
echo "3. Wait for DNS propagation (5-30 minutes)"
echo "4. Run the validation check script"
echo ""

# Step 3: Create validation check script
cat > /tmp/check-ssl-validation.sh << 'EOF'
#!/bin/bash
CERT_ARN="$1"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo "Checking SSL certificate validation status..."
STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region $AWS_REGION \
    --query 'Certificate.Status' \
    --output text)

echo "Certificate Status: $STATUS"

if [ "$STATUS" = "ISSUED" ]; then
    echo "✅ Certificate is validated and ready!"
    echo "You can now run the HTTPS setup completion script."
else
    echo "⏳ Certificate is still pending validation."
    echo "Please ensure the DNS record is added and try again in a few minutes."
fi
EOF

chmod +x /tmp/check-ssl-validation.sh
cp /tmp/check-ssl-validation.sh ./check-ssl-validation.sh

# Step 4: Create completion script
cat > ./complete-https-setup.sh << EOF
#!/bin/bash

# Complete HTTPS setup after certificate validation
set -e

AWS_REGION="$AWS_REGION"
CERT_ARN="$CERT_ARN"
ALB_ARN="$ALB_ARN"
DOMAIN_NAME="$DOMAIN_NAME"
ALB_DNS="$ALB_DNS"

echo "🔒 Completing HTTPS setup..."

# Check certificate status
STATUS=\$(aws acm describe-certificate \\
    --certificate-arn \$CERT_ARN \\
    --region \$AWS_REGION \\
    --query 'Certificate.Status' \\
    --output text)

if [ "\$STATUS" != "ISSUED" ]; then
    echo "❌ Certificate is not yet validated. Status: \$STATUS"
    echo "Please run: ./check-ssl-validation.sh \$CERT_ARN"
    exit 1
fi

echo "✅ Certificate is validated"

# Create HTTPS listener
echo "Creating HTTPS listener..."
aws elbv2 create-listener \\
    --load-balancer-arn \$ALB_ARN \\
    --protocol HTTPS \\
    --port 443 \\
    --certificates CertificateArn=\$CERT_ARN \\
    --default-actions Type=forward,TargetGroupArn=\$(aws elbv2 describe-target-groups --names finance-tracker-tg --region \$AWS_REGION --query 'TargetGroups[0].TargetGroupArn' --output text) \\
    --region \$AWS_REGION >/dev/null

echo "✅ HTTPS listener created"

# Update HTTP listener to redirect
HTTP_LISTENER_ARN=\$(aws elbv2 describe-listeners \\
    --load-balancer-arn \$ALB_ARN \\
    --region \$AWS_REGION \\
    --query 'Listeners[?Port==\`80\`].ListenerArn' \\
    --output text)

aws elbv2 modify-listener \\
    --listener-arn \$HTTP_LISTENER_ARN \\
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \\
    --region \$AWS_REGION >/dev/null

echo "✅ HTTP redirect configured"

echo ""
echo "🎉 Production HTTPS Setup Complete!"
echo ""
echo "📋 Your secure URLs:"
echo "• Backend: https://\$DOMAIN_NAME"
echo "• Health Check: https://\$DOMAIN_NAME/api/health/"
echo ""
echo "🔗 For your frontend environment:"
echo "NEXT_PUBLIC_API_URL=https://\$DOMAIN_NAME"
echo ""
echo "📝 Next Steps:"
echo "1. Create a CNAME record: \$DOMAIN_NAME → \$ALB_DNS"
echo "2. Update your frontend environment variables"
echo "3. Deploy your frontend"
EOF

chmod +x ./complete-https-setup.sh

echo ""
echo -e "${GREEN}🎉 Production HTTPS Setup Initiated!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Add the DNS validation record shown above"
echo "2. Check validation: ./check-ssl-validation.sh $CERT_ARN"
echo "3. Complete setup: ./complete-https-setup.sh"
echo ""
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo "• Create CNAME record: $DOMAIN_NAME → $ALB_DNS"
echo "• Update frontend environment variables"
