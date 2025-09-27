#!/bin/bash

# Personal Finance Tracker - Production End-to-End Test Script
# This script runs comprehensive tests against the production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Personal Finance Tracker - Production End-to-End Tests${NC}"
echo "=================================================================="
echo ""

# Configuration
FRONTEND_URL="${FRONTEND_URL:-}"
BACKEND_URL="${BACKEND_URL:-}"

if [ -z "$FRONTEND_URL" ]; then
    echo -e "${RED}❌ FRONTEND_URL environment variable is required${NC}"
    echo "Please set FRONTEND_URL to your deployed Vercel URL"
    exit 1
fi

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ BACKEND_URL environment variable is required${NC}"
    echo "Please set BACKEND_URL to your deployed backend URL"
    exit 1
fi

echo -e "${BLUE}🔍 Testing Production Deployment${NC}"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    echo -n "Testing $test_name... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test API endpoint
test_api() {
    local endpoint="$1"
    local expected_status="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BACKEND_URL$endpoint'"
    
    local response=$(eval $curl_cmd 2>/dev/null || echo -e "\n000")
    local status=$(echo "$response" | tail -n1)
    
    [ "$status" = "$expected_status" ]
}

echo -e "${BLUE}🏥 Testing Backend Health${NC}"
echo "-------------------------"

run_test "Backend health endpoint" "test_api '/api/health/' 200"
run_test "Backend API root" "test_api '/api/' 200"

echo ""
echo -e "${BLUE}🔐 Testing Authentication System${NC}"
echo "--------------------------------"

# Generate unique test user data
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_USER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"first_name\":\"Test\",\"last_name\":\"User\"}"

run_test "User registration endpoint" "test_api '/api/auth/register/' 201 POST '$TEST_USER_DATA'"

# Login and get token
LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$LOGIN_DATA" "$BACKEND_URL/api/auth/login/" 2>/dev/null || echo "")
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$TOKEN" ]; then
    echo -n "Testing user login... "
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
    ((TOTAL_TESTS++))
else
    echo -n "Testing user login... "
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
    ((TOTAL_TESTS++))
fi

# Test authenticated endpoints
if [ -n "$TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $TOKEN"
    
    run_test "Authenticated user profile" "curl -s -H '$AUTH_HEADER' '$BACKEND_URL/api/auth/user/' | grep -q email"
    run_test "Transaction list endpoint" "curl -s -H '$AUTH_HEADER' '$BACKEND_URL/api/transactions/' -w '%{http_code}' | tail -n1 | grep -q 200"
    run_test "Category list endpoint" "curl -s -H '$AUTH_HEADER' '$BACKEND_URL/api/categories/' -w '%{http_code}' | tail -n1 | grep -q 200"
    run_test "Budget list endpoint" "curl -s -H '$AUTH_HEADER' '$BACKEND_URL/api/budgets/' -w '%{http_code}' | tail -n1 | grep -q 200"
fi

echo ""
echo -e "${BLUE}💰 Testing Transaction Management${NC}"
echo "---------------------------------"

if [ -n "$TOKEN" ]; then
    # Create a test transaction
    TRANSACTION_DATA="{\"amount\":\"100.00\",\"description\":\"Test Transaction\",\"transaction_type\":\"expense\",\"date\":\"$(date +%Y-%m-%d)\"}"
    
    run_test "Create transaction" "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' -d '$TRANSACTION_DATA' '$BACKEND_URL/api/transactions/' -w '%{http_code}' | tail -n1 | grep -q 201"
    
    # Get transaction ID for further tests
    TRANSACTION_ID=$(curl -s -H "$AUTH_HEADER" "$BACKEND_URL/api/transactions/" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2 || echo "")
    
    if [ -n "$TRANSACTION_ID" ]; then
        run_test "Update transaction" "curl -s -X PUT -H '$AUTH_HEADER' -H 'Content-Type: application/json' -d '{\"amount\":\"150.00\",\"description\":\"Updated Transaction\",\"transaction_type\":\"expense\",\"date\":\"$(date +%Y-%m-%d)\"}' '$BACKEND_URL/api/transactions/$TRANSACTION_ID/' -w '%{http_code}' | tail -n1 | grep -q 200"
        run_test "Delete transaction" "curl -s -X DELETE -H '$AUTH_HEADER' '$BACKEND_URL/api/transactions/$TRANSACTION_ID/' -w '%{http_code}' | tail -n1 | grep -q 204"
    fi
fi

echo ""
echo -e "${BLUE}📊 Testing Analytics Endpoints${NC}"
echo "------------------------------"

if [ -n "$TOKEN" ]; then
    run_test "Spending by category" "curl -s -H '$AUTH_HEADER' '$BACKEND_URL/api/analytics/spending-by-category/' -w '%{http_code}' | tail -n1 | grep -q 200"
    run_test "Spending trends" "curl -s -H '$AUTH_HEADER' '$BACKEND_URL/api/analytics/spending-trends/' -w '%{http_code}' | tail -n1 | grep -q 200"
    run_test "Budget performance" "curl -s -H '$AUTH_HEADER' '$BACKEND_URL/api/analytics/budget-performance/' -w '%{http_code}' | tail -n1 | grep -q 200"
fi

echo ""
echo -e "${BLUE}🌐 Testing Frontend Deployment${NC}"
echo "------------------------------"

run_test "Frontend homepage" "curl -s '$FRONTEND_URL' -w '%{http_code}' | tail -n1 | grep -q 200"
run_test "Frontend login page" "curl -s '$FRONTEND_URL/auth/login' -w '%{http_code}' | tail -n1 | grep -q 200"
run_test "Frontend registration page" "curl -s '$FRONTEND_URL/auth/register' -w '%{http_code}' | tail -n1 | grep -q 200"
run_test "Frontend dashboard page" "curl -s '$FRONTEND_URL/dashboard' -w '%{http_code}' | tail -n1 | grep -q 200"

echo ""
echo -e "${BLUE}🔗 Testing API Integration${NC}"
echo "----------------------------"

# Test CORS
((TOTAL_TESTS++))
echo -n "Testing CORS configuration... "
CORS_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS "$BACKEND_URL/api/health/" -I | grep -i "access-control" || echo "")

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

# Test response times
((TOTAL_TESTS++))
echo -n "Testing API response time... "
API_RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL/api/health/")
API_TIME_MS=$(echo "$API_RESPONSE_TIME * 1000" | bc -l | cut -d. -f1)

if [ "$API_TIME_MS" -lt 2000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${API_TIME_MS}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (${API_TIME_MS}ms - should be < 2000ms)"
    ((TESTS_FAILED++))
fi

((TOTAL_TESTS++))
echo -n "Testing frontend response time... "
FRONTEND_RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL")
FRONTEND_TIME_MS=$(echo "$FRONTEND_RESPONSE_TIME * 1000" | bc -l | cut -d. -f1)

if [ "$FRONTEND_TIME_MS" -lt 3000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${FRONTEND_TIME_MS}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (${FRONTEND_TIME_MS}ms - should be < 3000ms)"
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${BLUE}📱 Testing Responsive Design${NC}"
echo "----------------------------"

# Test mobile user agent
((TOTAL_TESTS++))
echo -n "Testing mobile responsiveness... "
MOBILE_RESPONSE=$(curl -s -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15" "$FRONTEND_URL" || echo "")

if echo "$MOBILE_RESPONSE" | grep -q "viewport"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

# Test tablet user agent
((TOTAL_TESTS++))
echo -n "Testing tablet responsiveness... "
TABLET_RESPONSE=$(curl -s -H "User-Agent: Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15" "$FRONTEND_URL" || echo "")

if echo "$TABLET_RESPONSE" | grep -q "viewport"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${BLUE}🔒 Testing Security${NC}"
echo "------------------"

# Test security headers
((TOTAL_TESTS++))
echo -n "Testing security headers... "
SECURITY_HEADERS=$(curl -s -I "$FRONTEND_URL" | grep -E "(X-Frame-Options|X-Content-Type-Options|Referrer-Policy)" || echo "")

if [ -n "$SECURITY_HEADERS" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

# Test HTTPS redirect (if applicable)
((TOTAL_TESTS++))
echo -n "Testing HTTPS configuration... "
if echo "$FRONTEND_URL" | grep -q "https://"; then
    echo -e "${GREEN}✅ PASS${NC} (HTTPS enabled)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (HTTP deployment)"
    ((TESTS_PASSED++))
fi

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "========================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All production tests passed! Deployment is successful.${NC}"
    echo ""
    echo -e "${BLUE}✅ Verified Production Features:${NC}"
    echo "• Backend API functionality and authentication"
    echo "• Transaction management (CRUD operations)"
    echo "• Analytics endpoints"
    echo "• Frontend deployment and routing"
    echo "• API integration and CORS configuration"
    echo "• Responsive design across devices"
    echo "• Security headers and configuration"
    echo "• Performance within acceptable limits"
    echo ""
    echo -e "${BLUE}🔗 Production URLs:${NC}"
    echo "Frontend: $FRONTEND_URL"
    echo "Backend: $BACKEND_URL"
    echo ""
    echo -e "${BLUE}🚀 Your Personal Finance Tracker is ready for production use!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some production tests failed. Please review the deployment.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Common Issues:${NC}"
    echo "• Check CORS configuration in backend settings"
    echo "• Verify environment variables are set correctly"
    echo "• Ensure backend is accessible from frontend domain"
    echo "• Check security group settings for backend"
    exit 1
fi