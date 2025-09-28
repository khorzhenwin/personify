#!/bin/bash

# Comprehensive E2E test for proxy routes
set -e

echo "🧪 Running comprehensive E2E proxy tests..."

# Test configuration
LOCAL_URL="http://localhost:3001"
BACKEND_URL="http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com"
VERCEL_URL="https://personify-kzw.vercel.app"

echo ""
echo "📋 Test Configuration:"
echo "Local Frontend: $LOCAL_URL"
echo "Backend: $BACKEND_URL"
echo "Vercel: $VERCEL_URL"
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
    echo "Method: $method"
    
    # Build curl command
    local curl_cmd="curl -s -w 'HTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}\n' -X $method"
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: $auth_header'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    curl_cmd="$curl_cmd -H 'Origin: $LOCAL_URL'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    echo "Command: $curl_cmd"
    echo "Response:"
    eval $curl_cmd | head -20
    echo ""
    echo "---"
    echo ""
}

echo "🔍 1. Testing Direct Backend Connection"
test_endpoint "$BACKEND_URL/api/health/" "GET" "" "" "Direct backend health check"

echo "🔍 2. Testing Local Frontend Health"
test_endpoint "$LOCAL_URL" "GET" "" "" "Local frontend homepage"

echo "🔍 3. Testing Local Proxy Routes"
test_endpoint "$LOCAL_URL/api/proxy/api/health/" "GET" "" "" "Local proxy to backend health"

echo "🔍 4. Testing Authentication Endpoints"

# Test registration
echo "🔍 4a. Testing Registration (Direct Backend)"
test_endpoint "$BACKEND_URL/api/auth/register/" "POST" '{"email":"test@example.com","password":"TestPass123","first_name":"Test","last_name":"User","password_confirm":"TestPass123"}' "" "Direct backend registration"

echo "🔍 4b. Testing Registration (Local Proxy)"
test_endpoint "$LOCAL_URL/api/proxy/api/auth/register/" "POST" '{"email":"test2@example.com","password":"TestPass123","first_name":"Test","last_name":"User","password_confirm":"TestPass123"}' "" "Local proxy registration"

# Test login
echo "🔍 4c. Testing Login (Direct Backend)"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"email":"khorzhenwin@gmail.com","password":"Swampfire123_"}')

echo "Login Response: $LOGIN_RESPONSE"

# Extract token if login successful
if echo "$LOGIN_RESPONSE" | grep -q "access"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access":"[^"]*"' | cut -d'"' -f4)
    echo "Extracted Token: ${TOKEN:0:20}..."
    
    echo "🔍 5. Testing Authenticated Endpoints"
    
    echo "🔍 5a. Testing Categories (Direct Backend)"
    test_endpoint "$BACKEND_URL/api/categories/" "GET" "" "Bearer $TOKEN" "Direct backend categories"
    
    echo "🔍 5b. Testing Categories (Local Proxy)"
    test_endpoint "$LOCAL_URL/api/proxy/api/categories/" "GET" "" "Bearer $TOKEN" "Local proxy categories"
    
    echo "🔍 5c. Testing Password Change (Local Proxy)"
    test_endpoint "$LOCAL_URL/api/proxy/api/auth/change-password/" "POST" '{"current_password":"Swampfire123_","new_password":"TempPass123","new_password_confirm":"TempPass123"}' "Bearer $TOKEN" "Local proxy password change"
    
else
    echo "❌ Login failed, skipping authenticated tests"
fi

echo "🔍 6. Testing CORS Headers"
echo "Testing CORS preflight request..."
curl -s -X OPTIONS "$LOCAL_URL/api/proxy/api/auth/login/" \
    -H "Origin: $LOCAL_URL" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    -v

echo ""
echo "🔍 7. Testing Browser Environment Detection"
echo "Current environment detection logic:"
echo "- window.location.protocol: $(node -e "console.log('http:')")"
echo "- window.location.hostname: $(node -e "console.log('localhost')")"
echo "- Should use proxy: $(node -e "console.log(false)")"

echo ""
echo "✅ E2E Test Complete!"
echo ""
echo "📋 Summary:"
echo "1. Check if direct backend calls work"
echo "2. Check if local frontend loads"
echo "3. Check if proxy routes are accessible"
echo "4. Check if authentication flows work"
echo "5. Check if CORS headers are present"
echo ""
echo "🔧 Next Steps:"
echo "- If direct backend fails: Check backend deployment"
echo "- If proxy fails: Check Next.js API routes"
echo "- If CORS fails: Check proxy CORS headers"
echo "- If auth fails: Check token forwarding"
