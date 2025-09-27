#!/bin/bash

# Personal Finance Tracker - ECS Deployment Test Script
# This script tests the deployed ECS service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
ECS_CLUSTER="${ECS_CLUSTER:-finance-tracker-cluster}"
ECS_SERVICE="${ECS_SERVICE:-finance-tracker-backend-service}"

echo -e "${BLUE}🧪 Testing ECS Deployment for Personal Finance Tracker${NC}"
echo "Region: $AWS_REGION"
echo "Cluster: $ECS_CLUSTER"
echo "Service: $ECS_SERVICE"
echo ""

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10 --max-time 30 || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

# Get service status
echo -e "${YELLOW}📋 Checking ECS service status...${NC}"
SERVICE_STATUS=$(aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION \
    --query 'services[0].status' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$SERVICE_STATUS" = "ACTIVE" ]; then
    echo -e "${GREEN}✅ ECS service is ACTIVE${NC}"
else
    echo -e "${RED}❌ ECS service status: $SERVICE_STATUS${NC}"
    exit 1
fi

# Get running task count
RUNNING_COUNT=$(aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION \
    --query 'services[0].runningCount' \
    --output text 2>/dev/null || echo "0")

DESIRED_COUNT=$(aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION \
    --query 'services[0].desiredCount' \
    --output text 2>/dev/null || echo "0")

echo "Running tasks: $RUNNING_COUNT/$DESIRED_COUNT"

if [ "$RUNNING_COUNT" = "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✅ All desired tasks are running${NC}"
else
    echo -e "${RED}❌ Task count mismatch or no tasks running${NC}"
    exit 1
fi

# Get public IP
echo -e "\n${YELLOW}🔍 Getting service endpoint...${NC}"
TASK_ARN=$(aws ecs list-tasks \
    --cluster $ECS_CLUSTER \
    --service-name $ECS_SERVICE \
    --region $AWS_REGION \
    --query 'taskArns[0]' \
    --output text)

if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
    echo -e "${RED}❌ No running tasks found${NC}"
    exit 1
fi

echo "Task ARN: $TASK_ARN"

# Get network interface ID
NETWORK_INTERFACE_ID=$(aws ecs describe-tasks \
    --cluster $ECS_CLUSTER \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
    --output text)

if [ -z "$NETWORK_INTERFACE_ID" ] || [ "$NETWORK_INTERFACE_ID" = "None" ]; then
    echo -e "${RED}❌ Could not get network interface ID${NC}"
    exit 1
fi

echo "Network Interface ID: $NETWORK_INTERFACE_ID"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
    --network-interface-ids $NETWORK_INTERFACE_ID \
    --region $AWS_REGION \
    --query 'NetworkInterfaces[0].Association.PublicIp' \
    --output text)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "None" ]; then
    echo -e "${RED}❌ Could not get public IP address${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Public IP: $PUBLIC_IP${NC}"
BACKEND_URL="http://$PUBLIC_IP:8000"
echo "Backend URL: $BACKEND_URL"

# Test endpoints
echo -e "\n${YELLOW}🧪 Testing API endpoints...${NC}"

TESTS_PASSED=0
TESTS_FAILED=0

# Test health endpoint
if test_endpoint "$BACKEND_URL/api/health/" 200 "Health check endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test API root
if test_endpoint "$BACKEND_URL/api/" 200 "API root endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test auth endpoint (should return 401 for unauthenticated request)
if test_endpoint "$BACKEND_URL/api/auth/user/" 401 "Authentication endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test CORS headers
echo -n "Testing CORS configuration... "
CORS_HEADER=$(curl -s -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS "$BACKEND_URL/api/health/" \
    -I | grep -i "access-control-allow-origin" || echo "")

if [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (No CORS headers found)"
    ((TESTS_FAILED++))
fi

# Test response time
echo -n "Testing response time... "
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL/api/health/")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc -l | cut -d. -f1)

if [ "$RESPONSE_TIME_MS" -lt 2000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${RESPONSE_TIME_MS}ms < 2000ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (${RESPONSE_TIME_MS}ms >= 2000ms)"
    ((TESTS_FAILED++))
fi

# Check CloudWatch logs
echo -e "\n${YELLOW}📊 Checking CloudWatch logs...${NC}"
LOG_GROUP="/ecs/$ECS_CLUSTER"
RECENT_LOGS=$(aws logs describe-log-streams \
    --log-group-name $LOG_GROUP \
    --region $AWS_REGION \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query 'logStreams[0].logStreamName' \
    --output text 2>/dev/null || echo "")

if [ -n "$RECENT_LOGS" ] && [ "$RECENT_LOGS" != "None" ]; then
    echo -e "${GREEN}✅ CloudWatch logs are available${NC}"
    echo "Latest log stream: $RECENT_LOGS"
    
    # Get recent log events
    echo "Recent log entries:"
    aws logs get-log-events \
        --log-group-name $LOG_GROUP \
        --log-stream-name $RECENT_LOGS \
        --region $AWS_REGION \
        --start-time $(date -d '5 minutes ago' +%s)000 \
        --query 'events[-5:].message' \
        --output text 2>/dev/null | head -5 || echo "No recent logs"
else
    echo -e "${YELLOW}⚠️  CloudWatch logs not found or not accessible${NC}"
fi

# Final results
echo -e "\n${YELLOW}📋 Test Results Summary${NC}"
echo "=================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""
echo -e "${BLUE}📋 Deployment Information:${NC}"
echo "• Backend URL: $BACKEND_URL"
echo "• Health Check: $BACKEND_URL/api/health/"
echo "• API Documentation: $BACKEND_URL/api/"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! ECS deployment is working correctly.${NC}"
    echo ""
    echo -e "${BLUE}🔗 Next steps:${NC}"
    echo "1. Update your frontend environment variables:"
    echo "   NEXT_PUBLIC_API_URL=$BACKEND_URL"
    echo "2. Deploy your frontend to Vercel"
    echo "3. Test the complete application"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the ECS service and logs.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "1. Check ECS service logs in AWS Console"
    echo "2. Verify security group allows inbound traffic on port 8000"
    echo "3. Check task definition environment variables"
    echo "4. Verify secrets are properly configured in AWS Secrets Manager"
    exit 1
fi