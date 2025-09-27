#!/bin/bash

# Personal Finance Tracker - Deployment Test Script
# This script tests the deployed application to ensure all components are working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

echo -e "${YELLOW}🚀 Starting deployment verification tests...${NC}"

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

# Function to test JSON API endpoint
test_api_endpoint() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" || echo -e "\n000")
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "200" ] && echo "$body" | grep -q "{"; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $status_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "\n${YELLOW}📡 Testing Backend API...${NC}"

# Test backend health endpoint
if test_endpoint "$BACKEND_URL/api/health/" 200 "Backend health check"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test backend API endpoints
if test_api_endpoint "$BACKEND_URL/api/auth/user/" "User authentication endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test CORS headers
echo -n "Testing CORS configuration... "
cors_headers=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS "$BACKEND_URL/api/auth/user/" -I | grep -i "access-control" || echo "")

if [ -n "$cors_headers" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (No CORS headers found)"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}🌐 Testing Frontend Application...${NC}"

# Test frontend homepage
if test_endpoint "$FRONTEND_URL" 200 "Frontend homepage"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test frontend auth pages
if test_endpoint "$FRONTEND_URL/auth/login" 200 "Login page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if test_endpoint "$FRONTEND_URL/auth/register" 200 "Registration page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 404 page
if test_endpoint "$FRONTEND_URL/non-existent-page" 404 "404 error page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}🔒 Testing Security Headers...${NC}"

# Test security headers
echo -n "Testing security headers... "
security_headers=$(curl -s -I "$BACKEND_URL/api/health/" | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)" || echo "")

if [ -n "$security_headers" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Some security headers missing)"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}📊 Testing Performance...${NC}"

# Test response times
echo -n "Testing backend response time... "
backend_time=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL/api/health/")
backend_time_ms=$(echo "$backend_time * 1000" | bc -l | cut -d. -f1)

if [ "$backend_time_ms" -lt 2000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${backend_time_ms}ms < 2000ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (${backend_time_ms}ms >= 2000ms)"
    ((TESTS_FAILED++))
fi

echo -n "Testing frontend response time... "
frontend_time=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL")
frontend_time_ms=$(echo "$frontend_time * 1000" | bc -l | cut -d. -f1)

if [ "$frontend_time_ms" -lt 3000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${frontend_time_ms}ms < 3000ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (${frontend_time_ms}ms >= 3000ms)"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}🔧 Testing Environment Configuration...${NC}"

# Test environment-specific configurations
echo -n "Testing production environment... "
if curl -s "$BACKEND_URL/api/health/" | grep -q "production\|staging"; then
    echo -e "${GREEN}✅ PASS${NC} (Production environment detected)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Development environment detected)"
fi

echo -e "\n${YELLOW}📱 Testing Mobile Responsiveness...${NC}"

# Test mobile viewport
echo -n "Testing mobile viewport meta tag... "
if curl -s "$FRONTEND_URL" | grep -q 'viewport.*width=device-width'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (Mobile viewport meta tag missing)"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}🎨 Testing Theme Support...${NC}"

# Test theme toggle functionality
echo -n "Testing theme support... "
if curl -s "$FRONTEND_URL" | grep -q 'ColorSchemeScript\|theme'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (Theme support not detected)"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}♿ Testing Accessibility...${NC}"

# Test basic accessibility features
echo -n "Testing accessibility features... "
accessibility_features=$(curl -s "$FRONTEND_URL" | grep -E "(aria-|role=|alt=)" | wc -l)

if [ "$accessibility_features" -gt 5 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($accessibility_features accessibility attributes found)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (Only $accessibility_features accessibility attributes found)"
    ((TESTS_FAILED++))
fi

# Final results
echo -e "\n${YELLOW}📋 Test Results Summary${NC}"
echo "=================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Deployment is ready for production.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the issues above before going to production.${NC}"
    exit 1
fi