#!/bin/bash

# Personal Finance Tracker - Vercel Deployment Test Script
# This script tests the deployed Vercel frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Personal Finance Tracker - Vercel Deployment Tests${NC}"
echo "=================================================================="
echo ""

# Configuration
FRONTEND_URL="${FRONTEND_URL:-}"
BACKEND_URL="${BACKEND_URL:-}"

if [ -z "$FRONTEND_URL" ]; then
    echo -e "${RED}❌ FRONTEND_URL environment variable is required${NC}"
    echo "Please set FRONTEND_URL to your deployed Vercel URL (e.g., https://personify-kzw.vercel.app)"
    echo ""
    echo "Usage: FRONTEND_URL=https://personify-kzw.vercel.app ./scripts/test-vercel-deployment.sh"
    exit 1
fi

if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  BACKEND_URL not set. Some API tests will be skipped.${NC}"
fi

echo -e "${BLUE}🔍 Testing Vercel Deployment${NC}"
echo "Frontend URL: $FRONTEND_URL"
if [ -n "$BACKEND_URL" ]; then
    echo "Backend URL: $BACKEND_URL"
fi
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to test an endpoint
test_endpoint() {
    local url="$1"
    local expected_status="$2"
    local test_name="$3"
    
    ((TOTAL_TESTS++))
    echo -n "Testing $test_name... "
    
    local response=$(curl -s -w '\n%{http_code}' "$url" 2>/dev/null || echo -e "\n000")
    local status=$(echo "$response" | tail -n1)
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test page content
test_page_content() {
    local url="$1"
    local expected_content="$2"
    local test_name="$3"
    
    ((TOTAL_TESTS++))
    echo -n "Testing $test_name... "
    
    local content=$(curl -s "$url" 2>/dev/null || echo "")
    
    if echo "$content" | grep -q "$expected_content"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Content not found)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test responsive design
test_responsive() {
    local url="$1"
    local user_agent="$2"
    local test_name="$3"
    
    ((TOTAL_TESTS++))
    echo -n "Testing $test_name... "
    
    local response=$(curl -s -H "User-Agent: $user_agent" -w '\n%{http_code}' "$url" 2>/dev/null || echo -e "\n000")
    local status=$(echo "$response" | tail -n1)
    local content=$(echo "$response" | head -n -1)
    
    if [ "$status" = "200" ] && echo "$content" | grep -q "viewport"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "${BLUE}📱 Testing Core Frontend Functionality${NC}"
echo "----------------------------------------"

# Test 1: Homepage accessibility
test_endpoint "$FRONTEND_URL" 200 "Homepage accessibility"

# Test 2: Login page
test_endpoint "$FRONTEND_URL/auth/login" 200 "Login page"

# Test 3: Registration page
test_endpoint "$FRONTEND_URL/auth/register" 200 "Registration page"

# Test 4: Dashboard page (should redirect to login if not authenticated)
test_endpoint "$FRONTEND_URL/dashboard" 200 "Dashboard page"

# Test 5: Transactions page
test_endpoint "$FRONTEND_URL/transactions" 200 "Transactions page"

# Test 6: Budgets page
test_endpoint "$FRONTEND_URL/budgets" 200 "Budgets page"

# Test 7: Profile page
test_endpoint "$FRONTEND_URL/profile" 200 "Profile page"

echo ""
echo -e "${BLUE}🎨 Testing Page Content and UI${NC}"
echo "--------------------------------"

# Test 8: Homepage content
test_page_content "$FRONTEND_URL" "Personal Finance Tracker" "Homepage title"

# Test 9: Login form presence
test_page_content "$FRONTEND_URL/auth/login" "Login" "Login form"

# Test 10: Registration form presence
test_page_content "$FRONTEND_URL/auth/register" "Register" "Registration form"

# Test 11: Responsive meta tag
test_page_content "$FRONTEND_URL" "viewport" "Responsive viewport meta tag"

echo ""
echo -e "${BLUE}📱 Testing Responsive Design${NC}"
echo "------------------------------"

# Test 12: Mobile responsiveness
test_responsive "$FRONTEND_URL" "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15" "Mobile responsiveness"

# Test 13: Tablet responsiveness
test_responsive "$FRONTEND_URL" "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15" "Tablet responsiveness"

# Test 14: Desktop responsiveness
test_responsive "$FRONTEND_URL" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "Desktop responsiveness"

echo ""
echo -e "${BLUE}🔒 Testing Security Headers${NC}"
echo "-----------------------------"

# Test 15: Security headers
((TOTAL_TESTS++))
echo -n "Testing security headers... "
SECURITY_HEADERS=$(curl -s -I "$FRONTEND_URL" | grep -E "(X-Frame-Options|X-Content-Type-Options|Referrer-Policy)" || echo "")

if [ -n "$SECURITY_HEADERS" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (Security headers missing)"
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${BLUE}⚡ Testing Performance${NC}"
echo "----------------------"

# Test 16: Response time
((TOTAL_TESTS++))
echo -n "Testing frontend response time... "
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc -l | cut -d. -f1)

if [ "$RESPONSE_TIME_MS" -lt 3000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${RESPONSE_TIME_MS}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (${RESPONSE_TIME_MS}ms - should be < 3000ms)"
    ((TESTS_FAILED++))
fi

# Test API connectivity if backend URL is provided
if [ -n "$BACKEND_URL" ]; then
    echo ""
    echo -e "${BLUE}🔗 Testing API Connectivity${NC}"
    echo "----------------------------"
    
    # Test 17: Backend health check
    test_endpoint "$BACKEND_URL/api/health/" 200 "Backend health check"
    
    # Test 18: CORS configuration
    ((TOTAL_TESTS++))
    echo -n "Testing CORS configuration... "
    CORS_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS "$BACKEND_URL/api/health/" -I | grep -i "access-control" || echo "")
    
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} (CORS headers missing)"
        ((TESTS_FAILED++))
    fi
fi

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "========================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Frontend deployment is successful.${NC}"
    echo ""
    echo -e "${BLUE}✅ Verified Features:${NC}"
    echo "• Frontend accessibility and routing"
    echo "• Responsive design across devices"
    echo "• Security headers configuration"
    echo "• Performance within acceptable limits"
    if [ -n "$BACKEND_URL" ]; then
        echo "• API connectivity and CORS configuration"
    fi
    echo ""
    echo -e "${BLUE}🔗 Deployment URLs:${NC}"
    echo "Frontend: $FRONTEND_URL"
    if [ -n "$BACKEND_URL" ]; then
        echo "Backend: $BACKEND_URL"
    fi
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review the deployment.${NC}"
    exit 1
fi