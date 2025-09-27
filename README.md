# Personal Finance Tracker

A modern, full-stack personal finance management application built with Django REST Framework and Next.js TypeScript. This production-ready application helps users take control of their financial life through comprehensive transaction management, smart budgeting, and insightful analytics.

## 🚀 Features

### Core Functionality
- **User Authentication & Security**: Secure registration, login, and password reset via email
- **Transaction Management**: Create, edit, delete, and categorize financial transactions
- **Smart Categorization**: AI-powered category suggestions based on transaction patterns
- **Budget Control**: Set monthly budgets with real-time spending tracking and alerts
- **Data Visualization**: Interactive charts and spending insights
- **Data Export**: Export transaction history to CSV format
- **Mobile Responsive**: Fully responsive design for all devices

### Technical Highlights
- **Production-Ready**: Containerized architecture with Docker
- **Comprehensive Testing**: Full test coverage for both backend and frontend
- **Email Integration**: ProtonMail SMTP for secure email communications
- **Modern UI/UX**: Built with Mantine UI components and modern design principles
- **Type Safety**: Full TypeScript implementation on the frontend
- **API-First**: RESTful API design with comprehensive documentation

## 🏗️ Architecture

### Backend (Django REST Framework)
- **Database**: PostgreSQL with optimized queries
- **Authentication**: JWT-based authentication with refresh tokens
- **Email Service**: ProtonMail integration for notifications
- **API Design**: RESTful endpoints with comprehensive serialization
- **Testing**: 208 test cases with full coverage

### Frontend (Next.js + TypeScript)
- **Framework**: Next.js 14 with App Router
- **UI Library**: Mantine v7 for modern, accessible components
- **State Management**: Zustand for lightweight state management
- **Type Safety**: Full TypeScript implementation
- **Testing**: Jest and React Testing Library

### Infrastructure
- **Containerization**: Docker and Docker Compose for development and production
- **Database**: PostgreSQL with connection pooling
- **Deployment Ready**: AWS ECS/Fargate configuration
- **Environment Management**: Comprehensive environment variable configuration

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd personal-finance-tracker
   ```

2. **Start the application**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - Admin Panel: http://localhost:8000/admin

### Option 2: Local Development

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database configuration
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest
# With coverage
python -m pytest --cov=finance
```

### Frontend Tests
```bash
cd frontend
npm test
# Watch mode
npm test -- --watch
```

## 📁 Project Structure

```
personal-finance-tracker/
├── backend/                    # Django REST Framework API
│   ├── config/                # Django project settings
│   ├── finance/               # Main application
│   │   ├── models.py         # Data models
│   │   ├── views.py          # API views
│   │   ├── serializers.py    # DRF serializers
│   │   ├── services.py       # Business logic
│   │   └── tests/            # Test files
│   ├── Dockerfile            # Backend container config
│   └── requirements.txt      # Python dependencies
├── frontend/                   # Next.js TypeScript application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── store/           # State management
│   │   └── theme/           # UI theme configuration
│   ├── Dockerfile           # Frontend container config
│   └── package.json         # Node.js dependencies
├── docs/                      # Documentation
├── docker-compose.yml         # Full application orchestration
└── README.md                 # This file
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=finance_tracker

# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Email (ProtonMail)
EMAIL_HOST=smtp.protonmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@protonmail.com
EMAIL_HOST_PASSWORD=your-password

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 🚀 Deployment

### AWS ECS Deployment

The application is configured for deployment on AWS infrastructure:

1. **Database**: PostgreSQL RDS in ap-southeast-1 region
2. **Backend**: ECS Fargate service with Application Load Balancer
3. **Frontend**: ECS Fargate service or static hosting with CloudFront CDN
4. **Environment**: Production environment variables via AWS Systems Manager

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/password-reset/` - Password reset request

### Transaction Endpoints
- `GET /api/transactions/` - List transactions
- `POST /api/transactions/` - Create transaction
- `PUT /api/transactions/{id}/` - Update transaction
- `DELETE /api/transactions/{id}/` - Delete transaction

### Category Endpoints
- `GET /api/categories/` - List categories
- `POST /api/categories/` - Create category
- `POST /api/categories/suggest/` - Get category suggestions

### Budget Endpoints
- `GET /api/budgets/` - List budgets
- `POST /api/budgets/` - Create budget
- `GET /api/budgets/status/` - Get budget status

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Password strength validation
- CORS protection
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure email communications
- Environment-based configuration

## 🎯 Key Technical Decisions

### Architecture Approach
- **Microservices-Ready**: Separated frontend and backend for scalability
- **API-First Design**: RESTful API enables multiple client applications
- **Containerization**: Docker ensures consistent deployment across environments
- **Type Safety**: TypeScript reduces runtime errors and improves developer experience

### Notable Challenges Solved
- **Smart Categorization**: Implemented ML-like category suggestion based on transaction patterns
- **Real-time Budget Tracking**: Efficient database queries for instant budget status updates
- **Email Integration**: Secure ProtonMail SMTP integration for all notifications
- **Responsive Design**: Mobile-first approach with Mantine UI components

### Future Improvements & Scalability
- **Caching Layer**: Redis integration for improved performance
- **Real-time Updates**: WebSocket integration for live transaction updates
- **Advanced Analytics**: Machine learning for spending predictions
- **Mobile App**: React Native application using the same API
- **Multi-currency Support**: International transaction handling
- **Bank Integration**: Plaid/Open Banking API integration for automatic transaction import

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Django REST Framework for the robust API framework
- Next.js team for the excellent React framework
- Mantine for the beautiful UI components
- PostgreSQL for the reliable database system
- Docker for containerization technology

---

**Built with ❤️ using Django REST Framework and Next.js TypeScript**