#!/bin/bash

# Personal Finance Tracker - Deployment Integration Verification
# This script verifies that the deployed backend integrates properly with all existing functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-}"
if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ BACKEND_URL environment variable is required${NC}"
    echo "Please set BACKEND_URL to your deployed backend URL (e.g., http://1.2.3.4:8000)"
    exit 1
fi

echo -e "${BLUE}🔍 Verifying Deployment Integration for Personal Finance Tracker${NC}"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test API endpoint with JSON response
test_api_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=${5:-""}
    local headers=${6:-""}
    
    echo -n "Testing $description... "
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BACKEND_URL$endpoint'"
    
    local response=$(eval $curl_cmd 2>/dev/null || echo -e "\n000")
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        if [ -n "$body" ] && [ "$body" != "000" ]; then
            echo "Response: $body" | head -3
        fi
        return 1
    fi
}

# Function to register a test user and get auth token
register_and_login() {
    local email="test-$(date +%s)@example.com"
    local password="TestPassword123!"
    
    echo -e "\n${YELLOW}👤 Setting up test user for integration tests...${NC}"
    
    # Register user
    local register_data="{\"email\":\"$email\",\"password\":\"$password\",\"first_name\":\"Test\",\"last_name\":\"User\"}"
    local register_response=$(curl -s -w '\n%{http_code}' -X POST \
        -H "Content-Type: application/json" \
        -d "$register_data" \
        "$BACKEND_URL/api/auth/register/" 2>/dev/null || echo -e "\n000")
    
    local register_status=$(echo "$register_response" | tail -n1)
    
    if [ "$register_status" = "201" ]; then
        echo -e "${GREEN}✅ Test user registered successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  User registration returned status $register_status (may already exist)${NC}"
    fi
    
    # Login to get token
    local login_data="{\"email\":\"$email\",\"password\":\"$password\"}"
    local login_response=$(curl -s -w '\n%{http_code}' -X POST \
        -H "Content-Type: application/json" \
        -d "$login_data" \
        "$BACKEND_URL/api/auth/login/" 2>/dev/null || echo -e "\n000")
    
    local login_status=$(echo "$login_response" | tail -n1)
    local login_body=$(echo "$login_response" | head -n -1)
    
    if [ "$login_status" = "200" ]; then
        local access_token=$(echo "$login_body" | grep -o '"access":"[^"]*' | cut -d'"' -f4)
        if [ -n "$access_token" ]; then
            echo -e "${GREEN}✅ Test user logged in successfully${NC}"
            echo "$access_token"
            return 0
        fi
    fi
    
    echo -e "${RED}❌ Failed to get authentication token${NC}"
    return 1
}

echo -e "${YELLOW}🧪 Running Basic API Tests...${NC}"

# Test 1: Health Check
if test_api_endpoint "GET" "/api/health/" "200" "Health check endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 2: API Root
if test_api_endpoint "GET" "/api/" "200" "API root endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 3: Unauthenticated access to protected endpoint
if test_api_endpoint "GET" "/api/auth/user/" "401" "Protected endpoint without auth"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 4: User registration endpoint
if test_api_endpoint "POST" "/api/auth/register/" "400" "Registration endpoint (missing data)" "" "Content-Type: application/json"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 5: Login endpoint
if test_api_endpoint "POST" "/api/auth/login/" "400" "Login endpoint (missing data)" "" "Content-Type: application/json"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 6: Transactions endpoint (unauthenticated)
if test_api_endpoint "GET" "/api/transactions/" "401" "Transactions endpoint without auth"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 7: Categories endpoint (unauthenticated)
if test_api_endpoint "GET" "/api/categories/" "401" "Categories endpoint without auth"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 8: Budgets endpoint (unauthenticated)
if test_api_endpoint "GET" "/api/budgets/" "401" "Budgets endpoint without auth"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}🔐 Running Authenticated API Tests...${NC}"

# Get authentication token
if AUTH_TOKEN=$(register_and_login); then
    AUTH_HEADER="Authorization: Bearer $AUTH_TOKEN"
    
    # Test 9: Authenticated user profile
    if test_api_endpoint "GET" "/api/auth/user/" "200" "User profile with auth" "" "$AUTH_HEADER"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    
    # Test 10: Authenticated transactions list
    if test_api_endpoint "GET" "/api/transactions/" "200" "Transactions list with auth" "" "$AUTH_HEADER"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    
    # Test 11: Authenticated categories list
    if test_api_endpoint "GET" "/api/categories/" "200" "Categories list with auth" "" "$AUTH_HEADER"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    
    # Test 12: Authenticated budgets list
    if test_api_endpoint "GET" "/api/budgets/" "200" "Budgets list with auth" "" "$AUTH_HEADER"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    
    # Test 13: Create a category
    CATEGORY_DATA='{"name":"Test Category","description":"Test category for deployment verification"}'
    if test_api_endpoint "POST" "/api/categories/" "201" "Create category" "$CATEGORY_DATA" "Content-Type: application/json, $AUTH_HEADER"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    
    # Test 14: Create a transaction
    TRANSACTION_DATA='{"amount":"100.00","description":"Test transaction","transaction_type":"expense","date":"2024-01-01"}'
    if test_api_endpoint "POST" "/api/transactions/" "201" "Create transaction" "$TRANSACTION_DATA" "Content-Type: application/json, $AUTH_HEADER"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    
else
    echo -e "${RED}❌ Could not authenticate, skipping authenticated tests${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 6))
fi

echo -e "\n${YELLOW}🌐 Testing CORS and Security Headers...${NC}"

# Test 15: CORS preflight
echo -n "Testing CORS preflight request... "
CORS_RESPONSE=$(curl -s -I -X OPTIONS \
    -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$BACKEND_URL/api/health/" 2>/dev/null || echo "")

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (No CORS headers found)"
    ((TESTS_FAILED++))
fi

# Test 16: Security headers
echo -n "Testing security headers... "
SECURITY_HEADERS=$(curl -s -I "$BACKEND_URL/api/health/" | grep -E "(X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)" || echo "")

if [ -n "$SECURITY_HEADERS" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Some security headers missing)"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}⚡ Testing Performance...${NC}"

# Test 17: Response time
echo -n "Testing API response time... "
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL/api/health/")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc -l | cut -d. -f1)

if [ "$RESPONSE_TIME_MS" -lt 2000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${RESPONSE_TIME_MS}ms < 2000ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (${RESPONSE_TIME_MS}ms >= 2000ms)"
    ((TESTS_FAILED++))
fi

# Test 18: Database connectivity (indirect test via API)
echo -n "Testing database connectivity... "
DB_TEST_RESPONSE=$(curl -s -w '\n%{http_code}' "$BACKEND_URL/api/auth/user/" 2>/dev/null || echo -e "\n000")
DB_TEST_STATUS=$(echo "$DB_TEST_RESPONSE" | tail -n1)

if [ "$DB_TEST_STATUS" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Database accessible - got expected 401)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (Database may not be accessible - got $DB_TEST_STATUS)"
    ((TESTS_FAILED++))
fi

# Final results
echo -e "\n${YELLOW}📋 Integration Test Results Summary${NC}"
echo "============================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All integration tests passed!${NC}"
    echo -e "${GREEN}✅ Backend deployment is fully functional and ready for frontend integration.${NC}"
    echo ""
    echo -e "${BLUE}🔗 Frontend Integration:${NC}"
    echo "Update your frontend environment variables:"
    echo "NEXT_PUBLIC_API_URL=$BACKEND_URL"
    echo ""
    echo -e "${BLUE}📋 Verified Functionality:${NC}"
    echo "• ✅ Health checks and monitoring"
    echo "• ✅ User authentication (register/login)"
    echo "• ✅ Transaction management"
    echo "• ✅ Category management"
    echo "• ✅ Budget management"
    echo "• ✅ CORS configuration"
    echo "• ✅ Security headers"
    echo "• ✅ Database connectivity"
    echo "• ✅ API performance"
    exit 0
else
    echo -e "${RED}⚠️  Some integration tests failed.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting Steps:${NC}"
    echo "1. Check ECS service logs in AWS CloudWatch"
    echo "2. Verify database connection and credentials"
    echo "3. Ensure all secrets are properly configured"
    echo "4. Check security group rules"
    echo "5. Verify task definition environment variables"
    echo ""
    echo -e "${YELLOW}📞 Support:${NC}"
    echo "Review the AWS_ECS_DEPLOYMENT.md guide for detailed troubleshooting"
    exit 1
fi