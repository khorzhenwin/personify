#!/bin/bash

# Deploy using local Docker without ECR (for testing)
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Local Docker Deployment (Skip ECR)${NC}"

# Build locally and run with docker-compose
echo -e "\n${YELLOW}🔨 Building Docker image locally...${NC}"
cd backend
docker build -t finance-tracker-backend:latest .
cd ..

echo -e "\n${YELLOW}🚀 Starting with docker-compose...${NC}"

# Create a production docker-compose file
cat > docker-compose.local.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: financetracker
      POSTGRES_USER: financeuser
      POSTGRES_PASSWORD: SecurePassword123!
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    image: finance-tracker-backend:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://financeuser:SecurePassword123!@db:5432/financetracker
      - DEBUG=False
      - ALLOWED_HOSTS=localhost,127.0.0.1
      - SECRET_KEY=your-secret-key-here
    depends_on:
      - db
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn --bind 0.0.0.0:8000 config.wsgi:application"

volumes:
  postgres_data:
EOF

# Start the services
docker-compose -f docker-compose.local.yml up -d

echo -e "\n${GREEN}✅ Local deployment started!${NC}"
echo -e "${BLUE}🔗 Your backend is running at: http://localhost:8000${NC}"
echo -e "${BLUE}🏥 Health check: http://localhost:8000/api/health/${NC}"

echo -e "\n${YELLOW}📋 Next steps:${NC}"
echo "1. Test the backend: curl http://localhost:8000/api/health/"
echo "2. Deploy frontend to Vercel with NEXT_PUBLIC_API_URL=http://localhost:8000"
echo "3. To stop: docker-compose -f docker-compose.local.yml down"