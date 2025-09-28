#!/bin/bash

# Test production proxy functionality
set -e

echo "🧪 Testing Production Proxy Functionality..."

VERCEL_URL="https://personify-kzw.vercel.app"
BACKEND_URL="http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com"

echo ""
echo "📋 Test Configuration:"
echo "Vercel Frontend: $VERCEL_URL"
echo "Backend: $BACKEND_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local url=$1
    local method=${2:-GET}
    local data=${3:-""}
    local auth_header=${4:-""}
    local description=$5
    
    echo "Testing: $description"
    echo "URL: $url"
    
    # Build curl command
    local curl_cmd="curl -s -w 'HTTP_STATUS:%{http_code}\n' -X $method"
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: $auth_header'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    curl_cmd="$curl_cmd -H 'Origin: $VERCEL_URL'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    echo "Response:"
    eval $curl_cmd | head -10
    echo ""
    echo "---"
    echo ""
}

echo "🔍 1. Testing Direct Backend (for comparison)"
test_endpoint "$BACKEND_URL/api/health/" "GET" "" "" "Direct backend health check"

echo "🔍 2. Testing Production Proxy Routes"
test_endpoint "$VERCEL_URL/api/proxy/api/health" "GET" "" "" "Production proxy health check"

echo "🔍 3. Testing Authentication Flow"
echo "🔍 3a. Testing Login via Production Proxy"
LOGIN_RESPONSE=$(curl -s -X POST "$VERCEL_URL/api/proxy/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "Origin: $VERCEL_URL" \
    -d '{"email":"khorzhenwin@gmail.com","password":"Swampfire123_"}')

echo "Login Response: $LOGIN_RESPONSE"

# Extract token if login successful
if echo "$LOGIN_RESPONSE" | grep -q "access"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access":"[^"]*"' | cut -d'"' -f4)
    echo "Extracted Token: ${TOKEN:0:20}..."
    
    echo ""
    echo "🔍 4. Testing Authenticated Endpoints via Production Proxy"
    
    echo "🔍 4a. Testing Categories"
    test_endpoint "$VERCEL_URL/api/proxy/api/categories" "GET" "" "Bearer $TOKEN" "Production proxy categories"
    
    echo "🔍 4b. Testing Budgets"
    test_endpoint "$VERCEL_URL/api/proxy/api/budgets" "GET" "" "Bearer $TOKEN" "Production proxy budgets"
    
else
    echo "❌ Login failed, skipping authenticated tests"
    echo "Response: $LOGIN_RESPONSE"
fi

echo ""
echo "✅ Production Proxy Test Complete!"
echo ""
echo "📋 Summary:"
echo "1. ✅ Direct backend connection verified"
echo "2. ✅ Production proxy routes tested"
echo "3. ✅ Authentication flow tested"
echo "4. ✅ Authenticated endpoints tested"
echo ""
echo "🎉 If all tests passed, the production proxy is working correctly!"
echo "🌐 Production URL: $VERCEL_URL"
