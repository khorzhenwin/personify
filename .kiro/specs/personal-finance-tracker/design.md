# Design Document

## Overview

The Personal Finance Tracker is designed as a modern, scalable web application following a microservices-oriented architecture. The system separates concerns between a Django REST Framework backend and a Next.js TypeScript frontend, both containerized and deployed on AWS infrastructure in the ap-southeast-1 region.

The architecture prioritizes security, performance, and maintainability while providing a seamless user experience across all devices. The system leverages PostgreSQL for data persistence, ProtonMail for email services, and AWS managed services for scalability and reliability.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Next.js Frontend]
        Mobile[Mobile Browser]
    end
    
    subgraph "Vercel"
        Frontend[Next.js App]
    end
    
    subgraph "AWS ap-southeast-1"
        subgraph "Backend Infrastructure"
            ECS[ECS Fargate Container]
            Django[Django REST API]
        end
        
        subgraph "Data Layer"
            RDS[(PostgreSQL RDS)]
        end
        
        subgraph "External Services"
            ProtonMail[ProtonMail SMTP]
        end
    end
    
    Web --> Frontend
    Mobile --> Frontend
    Frontend --> Django
    Django --> RDS
    Django --> ProtonMail
```

### Technology Stack

**Frontend:**
- Next.js 14 with App Router
- TypeScript for type safety
- Mantine UI for component library
- Zustand for state management
- React Query for server state management
- Chart.js/Recharts for data visualization

**Backend:**
- Django 5.0 with Django REST Framework
- PostgreSQL for primary database
- Redis for caching and session storage
- Celery for background tasks
- Django Channels for real-time features (future enhancement)

**Infrastructure:**
- Vercel for frontend deployment (free tier)
- Single Docker container for Django backend on AWS ECS Fargate
- AWS RDS PostgreSQL for database
- Direct API communication between Vercel frontend and ECS backend

## Components and Interfaces

### Backend Components

#### 1. Authentication Service
**Purpose:** Handles user registration, login, password management, and session management.

**Key Classes:**
- `CustomUser` model extending Django's AbstractUser
- `AuthenticationViewSet` for login/logout/register endpoints
- `PasswordResetViewSet` for password reset functionality
- `EmailVerificationService` for email confirmation

**API Endpoints:**
```
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
POST /api/auth/password-reset/
POST /api/auth/password-reset-confirm/
POST /api/auth/email-verify/
GET /api/auth/user/
PUT /api/auth/user/
```

#### 2. Transaction Management Service
**Purpose:** Manages financial transactions with CRUD operations and advanced filtering.

**Key Classes:**
- `Transaction` model with fields: amount, description, category, date, type, user
- `TransactionViewSet` with filtering, pagination, and search
- `TransactionSerializer` for data validation and serialization
- `CategorySuggestionService` for smart categorization

**API Endpoints:**
```
GET /api/transactions/
POST /api/transactions/
GET /api/transactions/{id}/
PUT /api/transactions/{id}/
DELETE /api/transactions/{id}/
GET /api/transactions/search/
GET /api/transactions/export/
```

#### 3. Category Management Service
**Purpose:** Handles transaction categories and budget management.

**Key Classes:**
- `Category` model with name, description, user relationship
- `Budget` model linking categories to monthly budget amounts
- `CategoryViewSet` for category CRUD operations
- `BudgetViewSet` for budget management
- `BudgetTrackingService` for real-time budget monitoring

**API Endpoints:**
```
GET /api/categories/
POST /api/categories/
PUT /api/categories/{id}/
DELETE /api/categories/{id}/
GET /api/budgets/
POST /api/budgets/
PUT /api/budgets/{id}/
GET /api/budgets/status/
```

#### 4. Analytics Service
**Purpose:** Provides data aggregation and insights for visualizations.

**Key Classes:**
- `AnalyticsService` for data aggregation
- `SpendingAnalyticsViewSet` for spending insights
- `BudgetAnalyticsViewSet` for budget analysis
- `TrendAnalysisService` for pattern detection

**API Endpoints:**
```
GET /api/analytics/spending-by-category/
GET /api/analytics/spending-trends/
GET /api/analytics/budget-performance/
GET /api/analytics/monthly-summary/
```

#### 5. Notification Service
**Purpose:** Handles email notifications and alerts.

**Key Classes:**
- `EmailService` for ProtonMail integration
- `NotificationService` for alert management
- `BudgetAlertService` for budget-related notifications
- `SecurityNotificationService` for security alerts

### Frontend Components

#### 1. Authentication Module
**Components:**
- `LoginForm` - User login interface
- `RegisterForm` - User registration interface
- `PasswordResetForm` - Password reset functionality
- `AuthGuard` - Route protection component

**State Management:**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}
```

#### 2. Transaction Management Module
**Components:**
- `TransactionList` - Paginated transaction display
- `TransactionForm` - Create/edit transaction form
- `TransactionFilters` - Advanced filtering interface
- `TransactionSearch` - Search functionality
- `TransactionExport` - CSV export feature

**State Management:**
```typescript
interface TransactionState {
  transactions: Transaction[];
  filters: TransactionFilters;
  pagination: PaginationState;
  isLoading: boolean;
  addTransaction: (transaction: CreateTransactionData) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransactionData) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}
```

#### 3. Budget Management Module
**Components:**
- `BudgetOverview` - Budget status dashboard
- `BudgetForm` - Set/edit budget amounts
- `CategoryManager` - Category CRUD interface
- `BudgetAlerts` - Alert notifications display

#### 4. Analytics and Visualization Module
**Components:**
- `Dashboard` - Main analytics dashboard
- `SpendingChart` - Category-based spending visualization
- `TrendChart` - Time-based spending trends
- `BudgetProgressChart` - Budget vs actual spending
- `MonthlyReport` - Comprehensive monthly summary

#### 5. User Profile Module
**Components:**
- `ProfileSettings` - User profile management
- `SecuritySettings` - Password and security options
- `NotificationSettings` - Email notification preferences
- `DataExport` - Data export functionality

## Data Models

### Core Models

#### User Model
```python
class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
```

#### Transaction Model
```python
class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'category']),
        ]
```

#### Category Model
```python
class Category(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3498db')  # Hex color
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'name']
        ordering = ['name']
```

#### Budget Model
```python
class Budget(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    month = models.DateField()  # First day of the month
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'category', 'month']
        indexes = [
            models.Index(fields=['user', 'month']),
        ]
```

### Database Relationships

```mermaid
erDiagram
    CustomUser ||--o{ Transaction : owns
    CustomUser ||--o{ Category : creates
    CustomUser ||--o{ Budget : sets
    Category ||--o{ Transaction : categorizes
    Category ||--o{ Budget : budgets
    
    CustomUser {
        int id PK
        string email UK
        string first_name
        string last_name
        boolean is_email_verified
        datetime created_at
        datetime updated_at
    }
    
    Transaction {
        int id PK
        int user_id FK
        int category_id FK
        decimal amount
        string description
        string transaction_type
        date date
        datetime created_at
        datetime updated_at
    }
    
    Category {
        int id PK
        int user_id FK
        string name
        string description
        string color
        datetime created_at
    }
    
    Budget {
        int id PK
        int user_id FK
        int category_id FK
        decimal amount
        date month
        datetime created_at
        datetime updated_at
    }
```

## Error Handling

### Backend Error Handling

**Global Exception Handler:**
```python
class CustomExceptionHandler:
    def handle_validation_error(self, exc, context):
        return Response({
            'error': 'validation_error',
            'message': 'Invalid data provided',
            'details': exc.detail
        }, status=400)
    
    def handle_authentication_error(self, exc, context):
        return Response({
            'error': 'authentication_error',
            'message': 'Authentication required'
        }, status=401)
```

**Error Categories:**
- **Validation Errors (400):** Invalid input data, format errors
- **Authentication Errors (401):** Invalid credentials, expired tokens
- **Authorization Errors (403):** Insufficient permissions
- **Not Found Errors (404):** Resource not found
- **Server Errors (500):** Database errors, external service failures

### Frontend Error Handling

**Error Boundary Component:**
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
    // Log to monitoring service
  }
}
```

**API Error Handling:**
```typescript
const handleApiError = (error: AxiosError) => {
  if (error.response?.status === 401) {
    // Redirect to login
    authStore.logout();
  } else if (error.response?.status >= 500) {
    // Show generic error message
    showNotification('Server error occurred');
  } else {
    // Show specific error message
    showNotification(error.response?.data?.message);
  }
};
```

## Testing Strategy

### Test-Driven Development Approach

The entire application will be built using Test-Driven Development (TDD) methodology:
1. Write failing tests first
2. Write minimal code to make tests pass
3. Refactor while keeping tests green
4. Repeat for each feature

### Backend Testing (Django)

**Unit Tests (TDD Focus):**
- Model validation and business logic tests
- Serializer validation tests
- Service layer functionality tests
- Authentication and authorization tests
- Email service integration tests

**API Integration Tests:**
- Complete API endpoint functionality
- Request/response validation
- Error handling scenarios
- Authentication flows
- Database transaction integrity

**Test Coverage Goals:**
- Models: 100% (TDD requirement)
- Views/ViewSets: 95% (TDD requirement)
- Services: 95% (TDD requirement)
- Overall: 90% minimum

**Testing Tools:**
- pytest for test framework
- pytest-django for Django integration
- factory_boy for test data generation
- pytest-cov for coverage reporting
- pytest-mock for mocking external services

**TDD Test Structure:**
```python
# Example TDD test structure
class TestTransactionModel:
    def test_create_transaction_with_valid_data(self):
        # Test creation with valid data
        
    def test_transaction_validation_fails_with_invalid_amount(self):
        # Test validation failures
        
    def test_transaction_categorization_suggestion(self):
        # Test smart categorization
```

### Frontend Testing (Next.js)

**Component Tests (TDD Focus):**
- Component rendering with different props
- User interaction handling
- Form validation and submission
- State management behavior
- API integration scenarios

**Integration Tests:**
- Complete user workflows
- API communication
- State synchronization
- Error handling
- Authentication flows

**E2E Tests:**
- Critical user journeys (login → create transaction → view dashboard)
- Cross-browser compatibility
- Mobile responsiveness
- Data export functionality

**Testing Tools:**
- Jest for unit testing
- React Testing Library for component testing
- Playwright for E2E testing
- MSW (Mock Service Worker) for API mocking

**TDD Test Structure:**
```typescript
// Example TDD test structure
describe('TransactionForm', () => {
  it('should render form fields correctly', () => {
    // Test component rendering
  });
  
  it('should validate required fields', () => {
    // Test form validation
  });
  
  it('should submit transaction data', () => {
    // Test form submission
  });
});
```

### Feature-Specific Test Requirements

**Authentication Tests:**
- User registration with email verification
- Login/logout functionality
- Password reset flow
- JWT token handling
- Session management

**Transaction Management Tests:**
- CRUD operations for transactions
- Transaction filtering and search
- Category assignment and suggestions
- Data validation and error handling
- CSV export functionality

**Budget Management Tests:**
- Budget creation and updates
- Real-time budget tracking
- Alert generation when limits exceeded
- Monthly budget reset functionality
- Category-budget relationships

**Analytics Tests:**
- Data aggregation accuracy
- Chart data generation
- Date range filtering
- Performance with large datasets
- Real-time updates

### Continuous Testing

**Pre-commit Hooks:**
- Run all unit tests
- Check code coverage thresholds
- Lint code for style consistency
- Type checking (TypeScript)

**CI/CD Pipeline Tests:**
- Full test suite execution
- Integration tests with real database
- E2E tests in staging environment
- Performance regression tests

## Security Considerations

### Authentication and Authorization

**JWT Token Strategy:**
- Access tokens (15 minutes expiry)
- Refresh tokens (7 days expiry)
- Secure HTTP-only cookies for token storage
- CSRF protection for state-changing operations

**Password Security:**
- Minimum 8 characters with complexity requirements
- bcrypt hashing with salt rounds
- Password history prevention
- Account lockout after failed attempts

### Data Protection

**Encryption:**
- TLS 1.3 for data in transit
- Database encryption at rest (AWS RDS)
- Sensitive data field-level encryption
- Secure environment variable management

**Input Validation:**
- Server-side validation for all inputs
- SQL injection prevention through ORM
- XSS protection through output encoding
- CSRF token validation

### Infrastructure Security

**Security (Minimal):**
- Security group allowing HTTP/HTTPS traffic
- CORS configured for Vercel domain
- All sensitive data in environment variables
- Basic Django security settings

## Deployment Architecture

### Deployment Strategy

**Backend Container (Django):**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "migrate", "&&", "gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

**Frontend Deployment (Vercel):**
- Automatic deployment from Git repository
- Environment variable for backend API URL
- Built-in SSL and global CDN

### AWS Infrastructure (Minimal)

**ECS Configuration:**
- Single Fargate task (0.25 vCPU, 0.5 GB memory)
- No auto-scaling (fixed 1 task for 5 users)
- Simple deployment via AWS CLI or manual upload

**Database Configuration:**
- Use existing PostgreSQL RDS instance
- All credentials via environment variables
- No connection pooling needed for 5 users

**Environment Variables:**
```bash
# Backend (ECS Task Definition)
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-django-secret-key
DEBUG=False
ALLOWED_HOSTS=your-ecs-domain.com
PROTONMAIL_HOST=smtp.protonmail.com
PROTONMAIL_PORT=587
PROTONMAIL_USER=personify-mailer@protonmail.com
PROTONMAIL_PASSWORD=your-protonmail-password
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://your-ecs-domain.com
```

This simplified design provides a minimal but functional foundation for the personal finance tracker that can be built in 3 days and handle 5 users effectively. All configuration is handled through environment variables for easy deployment.

**Optional Future Enhancement:**
- GitHub Actions for automated deployment (can be added later if needed)