# Personal Finance Tracker Backend

Django REST Framework backend for the Personal Finance Tracker application.

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL (local development or AWS RDS for production)

### Development Setup

1. Create and activate virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy environment file:

```bash
cp .env.example .env
```

4. Edit `.env` file with your PostgreSQL configuration

5. Ensure PostgreSQL is running locally or use AWS RDS credentials

6. Run migrations:

```bash
python manage.py migrate
```

6. Create superuser (optional):

```bash
python manage.py createsuperuser
```

7. Run development server:

```bash
python manage.py runserver
```

### Testing

Run tests with pytest:

```bash
python -m pytest
```

Run tests with coverage:

```bash
python -m pytest --cov=finance
```

### Docker Setup

Build and run with Docker Compose (PostgreSQL + Django):

```bash
docker-compose up --build
```

## Project Structure

```
backend/
├── config/                 # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── finance/                # Main application
│   ├── models.py          # Data models
│   ├── views.py           # API views
│   ├── serializers.py     # DRF serializers
│   ├── urls.py            # URL routing
│   ├── admin.py           # Admin configuration
│   └── tests.py           # Test cases
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
└── .env.example           # Environment variables template
```

## API Endpoints

The API will be available at `/api/` with the following endpoints:

- `/api/auth/` - Authentication endpoints
- `/api/transactions/` - Transaction management
- `/api/categories/` - Category management
- `/api/budgets/` - Budget management
- `/api/analytics/` - Analytics and reporting

## Environment Variables

Key environment variables (see `.env.example`):

### Database Configuration

- `DB_HOST` - PostgreSQL host (localhost for dev, AWS RDS for prod)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `DB_SSL` - SSL mode (prefer/require/disable)
- `DATABASE_URL` - Alternative single connection string

### Application Settings

- `SECRET_KEY` - Django secret key
- `DEBUG` - Debug mode (True/False)
- `ALLOWED_HOSTS` - Allowed hosts for Django
- `EMAIL_HOST_USER` - ProtonMail email address
- `EMAIL_HOST_PASSWORD` - ProtonMail password
- `CORS_ALLOWED_ORIGINS` - Frontend URLs for CORS

### AWS RDS Configuration

For production, use the credentials in `.env.prod` (not tracked in git) to connect to the AWS RDS PostgreSQL instance. The `global-bundle.pem` file is included for SSL certificate verification.

## Deployment

The application is configured for deployment on AWS ECS with:

- PostgreSQL RDS database
- ProtonMail for email services
- Environment-based configuration
- No external caching layer (using Django's built-in caching)
