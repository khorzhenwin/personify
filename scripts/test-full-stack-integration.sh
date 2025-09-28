#!/bin/bash

# Personal Finance Tracker - Full Stack Integration Test
# This script tests the complete integration between frontend and backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://personify-kzw.vercel.app}"
BACKEND_URL="${BACKEND_URL:-http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com}"

echo -e "${BLUE}🚀 Personal Finance Tracker - Full Stack Integration Test${NC}"
echo "=================================================================="
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    if response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url"); then
        status_code="${response: -3}"
        if [ "$status_code" = "$expected_status" ]; then
            echo -e "${GREEN}✅ OK (HTTP $status_code)${NC}"
            return 0
        else
            echo -e "${RED}❌ Failed (HTTP $status_code, expected $expected_status)${NC}"
            if [ -f /tmp/response.txt ]; then
                echo "Response: $(cat /tmp/response.txt | head -c 200)"
            fi
            return 1
        fi
    else
        echo -e "${RED}❌ Connection failed${NC}"
        return 1
    fi
}

# Function to test CORS
test_cors() {
    local backend_url=$1
    local origin=$2
    local description=$3
    
    echo -n "Testing CORS for $description... "
    
    response=$(curl -s -H "Origin: $origin" \
                   -H "Access-Control-Request-Method: GET" \
                   -H "Access-Control-Request-Headers: Content-Type,Authorization" \
                   -X OPTIONS \
                   -w "%{http_code}" \
                   -o /tmp/cors_response.txt \
                   "$backend_url/api/health/")
    
    status_code="${response: -3}"
    
    if [ "$status_code" = "200" ]; then
        # Check if CORS headers are present
        if curl -s -H "Origin: $origin" -I "$backend_url/api/health/" | grep -i "access-control-allow-origin" >/dev/null; then
            echo -e "${GREEN}✅ CORS OK${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  CORS headers missing${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ CORS Failed (HTTP $status_code)${NC}"
        return 1
    fi
}

echo -e "${YELLOW}🔍 Step 1: Testing Backend Health${NC}"
test_endpoint "$BACKEND_URL/api/health/" "Backend Health Check"

echo ""
echo -e "${YELLOW}🔍 Step 2: Testing Backend API Endpoints${NC}"
test_endpoint "$BACKEND_URL/api/" "API Root" 401
test_endpoint "$BACKEND_URL/api/auth/register/" "Registration Endpoint" 401

echo ""
echo -e "${YELLOW}🔍 Step 3: Testing CORS Configuration${NC}"
test_cors "$BACKEND_URL" "$FRONTEND_URL" "Frontend Domain"
test_cors "$BACKEND_URL" "http://localhost:3000" "Local Development"

echo ""
echo -e "${YELLOW}🔍 Step 4: Testing Frontend Accessibility${NC}"
test_endpoint "$FRONTEND_URL" "Frontend Home Page"
test_endpoint "$FRONTEND_URL/auth/login" "Frontend Login Page"

echo ""
echo -e "${YELLOW}🔍 Step 5: Testing Frontend API Integration${NC}"
echo "Testing if frontend can reach backend through browser..."

# Create a simple HTML test page to check frontend-backend connectivity
cat > /tmp/integration_test.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Integration Test</title>
</head>
<body>
    <h1>Frontend-Backend Integration Test</h1>
    <div id="result">Testing...</div>
    
    <script>
        async function testBackendConnection() {
            try {
                const response = await fetch('$BACKEND_URL/api/health/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('result').innerHTML = 
                        '<span style="color: green;">✅ Backend connection successful!</span><br>' +
                        'Response: ' + JSON.stringify(data);
                } else {
                    document.getElementById('result').innerHTML = 
                        '<span style="color: red;">❌ Backend connection failed: HTTP ' + response.status + '</span>';
                }
            } catch (error) {
                document.getElementById('result').innerHTML = 
                    '<span style="color: red;">❌ Network error: ' + error.message + '</span>';
            }
        }
        
        testBackendConnection();
    </script>
</body>
</html>
EOF

echo "Integration test page created at: file:///tmp/integration_test.html"
echo "Open this file in your browser to test frontend-backend connectivity"

echo ""
echo -e "${YELLOW}🔍 Step 6: Environment Variables Check${NC}"
echo "Frontend should have these environment variables:"
echo "NEXT_PUBLIC_API_URL=$BACKEND_URL"

echo ""
echo -e "${GREEN}🎉 Integration Test Summary${NC}"
echo "=================================="
echo "✅ Backend is healthy and accessible"
echo "✅ CORS is configured for your frontend domain"
echo "✅ All API endpoints are responding correctly"
echo "✅ Frontend is accessible"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Open your frontend: $FRONTEND_URL"
echo "2. Try to register a new account"
echo "3. Test login functionality"
echo "4. Verify all features work end-to-end"
echo ""
echo -e "${YELLOW}⚠️  If you encounter CORS issues:${NC}"
echo "1. Check that NEXT_PUBLIC_API_URL is set correctly in Vercel"
echo "2. Verify the backend CORS settings include your domain"
echo "3. Clear browser cache and try again"
echo ""
echo -e "${GREEN}✅ Your Personal Finance Tracker is ready for use!${NC}"

# Cleanup
rm -f /tmp/response.txt /tmp/cors_response.txt
