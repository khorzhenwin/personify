"""
Comprehensive tests for budget management and tracking system.
"""
import pytest
from decimal import Decimal
from datetime import date, datetime
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Category, Transaction, Budget
from .services import BudgetTrackingService

User = get_user_model()


@pytest.fixture
def user():
    """Create a test user."""
    return User.objects.create_user(
        email='testuser@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def another_user():
    """Create another test user for isolation tests."""
    return User.objects.create_user(
        email='anotheruser@example.com',
        password='testpass123',
        first_name='Another',
        last_name='User'
    )


@pytest.fixture
def category(user):
    """Create a test category."""
    return Category.objects.create(
        user=user,
        name='Groceries',
        description='Food and household items',
        color='#3498db'
    )


@pytest.fixture
def another_category(user):
    """Create another test category."""
    return Category.objects.create(
        user=user,
        name='Transportation',
        description='Travel and commute expenses',
        color='#e74c3c'
    )


@pytest.fixture
def budget(user, category):
    """Create a test budget."""
    return Budget.objects.create(
        user=user,
        category=category,
        amount=Decimal('500.00'),
        month=date(2024, 1, 1)
    )


@pytest.fixture
def authenticated_client(user):
    """Create an authenticated API client."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.mark.django_db
class TestBudgetCreation:
    """
    Tests for monthly budget creation and validation.
    """
    
    def test_create_budget_with_valid_data(self, user, category):
        """Test creating a budget with all valid fields."""
        month = date(2024, 1, 1)
        budget = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=month
        )
        
        assert budget.user == user
        assert budget.category == category
        assert budget.amount == Decimal('500.00')
        assert budget.month == month
        assert budget.created_at is not None
        assert budget.updated_at is not None
    
    def test_budget_amount_minimum_validation(self, user, category):
        """Test that budget amount must be greater than 0."""
        budget = Budget(
            user=user,
            category=category,
            amount=Decimal('0.00'),
            month=date(2024, 1, 1)
        )
        with pytest.raises(ValidationError):
            budget.full_clean()
    
    def test_budget_amount_negative_validation(self, user, category):
        """Test that budget amount cannot be negative."""
        budget = Budget(
            user=user,
            category=category,
            amount=Decimal('-100.00'),
            month=date(2024, 1, 1)
        )
        with pytest.raises(ValidationError):
            budget.full_clean()
    
    def test_budget_unique_per_user_category_month(self, user, category):
        """Test that budget is unique per user, category, and month."""
        month = date(2024, 1, 1)
        Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=month
        )
        
        # Creating another budget for same user, category, and month should fail
        with pytest.raises(IntegrityError):
            Budget.objects.create(
                user=user,
                category=category,
                amount=Decimal('600.00'),
                month=month
            )
    
    def test_budget_different_months_allowed(self, user, category):
        """Test that same user and category can have budgets for different months."""
        budget1 = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=date(2024, 1, 1)
        )
        budget2 = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('600.00'),
            month=date(2024, 2, 1)
        )
        
        assert budget1.month != budget2.month
        assert budget1.user == budget2.user
        assert budget1.category == budget2.category
    
    def test_budget_different_categories_same_month_allowed(self, user):
        """Test that same user can have budgets for different categories in same month."""
        category1 = Category.objects.create(user=user, name='Food')
        category2 = Category.objects.create(user=user, name='Transport')
        month = date(2024, 1, 1)
        
        budget1 = Budget.objects.create(
            user=user,
            category=category1,
            amount=Decimal('500.00'),
            month=month
        )
        budget2 = Budget.objects.create(
            user=user,
            category=category2,
            amount=Decimal('300.00'),
            month=month
        )
        
        assert budget1.category != budget2.category
        assert budget1.month == budget2.month
        assert budget1.user == budget2.user


@pytest.mark.django_db
class TestBudgetAPI:
    """
    Tests for budget creation endpoint with category relationships.
    """
    
    def test_create_budget_via_api(self, authenticated_client, category):
        """Test creating a budget through the API."""
        data = {
            'category': category.id,
            'amount': '500.00',
            'month': '2024-01-01'
        }
        
        response = authenticated_client.post('/api/budgets/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['category'] == category.id
        assert response.data['amount'] == '500.00'
        assert response.data['month'] == '2024-01-01'
        assert 'spent_amount' in response.data
        assert 'remaining_amount' in response.data
        assert 'percentage_used' in response.data
    
    def test_create_budget_with_invalid_amount(self, authenticated_client, category):
        """Test creating a budget with invalid amount."""
        data = {
            'category': category.id,
            'amount': '0.00',
            'month': '2024-01-01'
        }
        
        response = authenticated_client.post('/api/budgets/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'amount' in response.data
    
    def test_create_budget_with_invalid_month(self, authenticated_client, category):
        """Test creating a budget with invalid month (not first day)."""
        data = {
            'category': category.id,
            'amount': '500.00',
            'month': '2024-01-15'  # Not first day of month
        }
        
        response = authenticated_client.post('/api/budgets/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'month' in response.data
    
    def test_create_duplicate_budget(self, authenticated_client, budget):
        """Test creating a duplicate budget for same category and month."""
        data = {
            'category': budget.category.id,
            'amount': '600.00',
            'month': '2024-01-01'
        }
        
        response = authenticated_client.post('/api/budgets/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already have a budget' in str(response.data).lower()
    
    def test_create_budget_with_other_users_category(self, authenticated_client, another_user):
        """Test creating a budget with another user's category."""
        other_category = Category.objects.create(
            user=another_user,
            name='Other Category'
        )
        
        data = {
            'category': other_category.id,
            'amount': '500.00',
            'month': '2024-01-01'
        }
        
        response = authenticated_client.post('/api/budgets/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'your own categories' in str(response.data).lower()
    
    def test_list_budgets(self, authenticated_client, budget):
        """Test listing budgets."""
        response = authenticated_client.get('/api/budgets/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == budget.id
    
    def test_list_budgets_filtered_by_month(self, authenticated_client, user, category):
        """Test listing budgets filtered by month."""
        # Create budgets for different months
        budget1 = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=date(2024, 1, 1)
        )
        Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('600.00'),
            month=date(2024, 2, 1)
        )
        
        response = authenticated_client.get('/api/budgets/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == budget1.id
    
    def test_update_budget(self, authenticated_client, budget):
        """Test updating a budget."""
        data = {
            'amount': '750.00'
        }
        
        response = authenticated_client.patch(f'/api/budgets/{budget.id}/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['amount'] == '750.00'
        
        # Verify in database
        budget.refresh_from_db()
        assert budget.amount == Decimal('750.00')
    
    def test_delete_budget(self, authenticated_client, budget):
        """Test deleting a budget."""
        response = authenticated_client.delete(f'/api/budgets/{budget.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Budget.objects.filter(id=budget.id).exists()


@pytest.mark.django_db
class TestBudgetTracking:
    """
    Tests for real-time budget tracking against transactions.
    """
    
    def test_budget_tracking_with_no_transactions(self, user, budget):
        """Test budget tracking when no transactions exist."""
        status_data = BudgetTrackingService.calculate_budget_status(budget)
        
        assert status_data['budget_id'] == budget.id
        assert status_data['spent_amount'] == Decimal('0.00')
        assert status_data['remaining_amount'] == budget.amount
        assert status_data['percentage_used'] == 0.0
        assert status_data['status'] == 'under_budget'
        assert status_data['alert_level'] == 'none'
    
    def test_budget_tracking_with_transactions(self, user, budget):
        """Test budget tracking with expense transactions."""
        # Create some expense transactions
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('100.00'),
            description='Grocery shopping',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('50.00'),
            description='More groceries',
            transaction_type='expense',
            date=date(2024, 1, 20)
        )
        
        status_data = BudgetTrackingService.calculate_budget_status(budget)
        
        assert status_data['spent_amount'] == Decimal('150.00')
        assert status_data['remaining_amount'] == Decimal('350.00')
        assert status_data['percentage_used'] == 30.0
        assert status_data['status'] == 'under_budget'
        assert status_data['alert_level'] == 'none'
    
    def test_budget_tracking_near_limit(self, user, budget):
        """Test budget tracking when approaching limit (80%+)."""
        # Create transaction that uses 85% of budget
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('425.00'),
            description='Large grocery purchase',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        status_data = BudgetTrackingService.calculate_budget_status(budget)
        
        assert status_data['spent_amount'] == Decimal('425.00')
        assert status_data['remaining_amount'] == Decimal('75.00')
        assert status_data['percentage_used'] == 85.0
        assert status_data['status'] == 'near_limit'
        assert status_data['alert_level'] == 'warning'
    
    def test_budget_tracking_over_limit(self, user, budget):
        """Test budget tracking when over limit (100%+)."""
        # Create transaction that exceeds budget
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('600.00'),
            description='Expensive grocery purchase',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        status_data = BudgetTrackingService.calculate_budget_status(budget)
        
        assert status_data['spent_amount'] == Decimal('600.00')
        assert status_data['remaining_amount'] == Decimal('-100.00')
        assert status_data['percentage_used'] == 120.0
        assert status_data['status'] == 'over_budget'
        assert status_data['alert_level'] == 'danger'
    
    def test_budget_tracking_ignores_income_transactions(self, user, budget):
        """Test that budget tracking ignores income transactions."""
        # Create income transaction (should be ignored)
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('1000.00'),
            description='Salary',
            transaction_type='income',
            date=date(2024, 1, 15)
        )
        
        # Create expense transaction
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('100.00'),
            description='Grocery shopping',
            transaction_type='expense',
            date=date(2024, 1, 20)
        )
        
        status_data = BudgetTrackingService.calculate_budget_status(budget)
        
        # Should only count the expense transaction
        assert status_data['spent_amount'] == Decimal('100.00')
        assert status_data['remaining_amount'] == Decimal('400.00')
        assert status_data['percentage_used'] == 20.0
    
    def test_budget_tracking_ignores_other_months(self, user, budget):
        """Test that budget tracking ignores transactions from other months."""
        # Create transaction in different month (should be ignored)
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('200.00'),
            description='Previous month expense',
            transaction_type='expense',
            date=date(2023, 12, 15)
        )
        
        # Create transaction in budget month
        Transaction.objects.create(
            user=user,
            category=budget.category,
            amount=Decimal('100.00'),
            description='Current month expense',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        status_data = BudgetTrackingService.calculate_budget_status(budget)
        
        # Should only count the current month transaction
        assert status_data['spent_amount'] == Decimal('100.00')
        assert status_data['remaining_amount'] == Decimal('400.00')
        assert status_data['percentage_used'] == 20.0


@pytest.mark.django_db
class TestBudgetStatusAPI:
    """
    Tests for budget status display with progress indicators.
    """
    
    def test_budget_status_endpoint(self, authenticated_client, budget):
        """Test budget status endpoint."""
        # Create some transactions
        Transaction.objects.create(
            user=budget.user,
            category=budget.category,
            amount=Decimal('150.00'),
            description='Grocery shopping',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get('/api/budgets/status/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'summary' in response.data
        assert 'budgets' in response.data
        
        summary = response.data['summary']
        assert summary['total_budgeted'] == '500.00'
        assert summary['total_spent'] == '150.00'
        assert summary['total_remaining'] == '350.00'
        assert summary['overall_percentage_used'] == 30.0
        assert summary['budget_count'] == 1
        assert summary['budgets_under_limit'] == 1
        assert summary['budgets_near_limit'] == 0
        assert summary['budgets_over_limit'] == 0
        
        budgets = response.data['budgets']
        assert len(budgets) == 1
        assert budgets[0]['budget_id'] == budget.id
        assert budgets[0]['spent_amount'] == '150.00'
        assert budgets[0]['remaining_amount'] == '350.00'
        assert budgets[0]['percentage_used'] == 30.0
        assert budgets[0]['status'] == 'under_budget'
        assert budgets[0]['alert_level'] == 'none'
    
    def test_budget_status_current_month_default(self, authenticated_client, user, category):
        """Test budget status defaults to current month."""
        # Create budget for current month
        today = date.today()
        current_month = date(today.year, today.month, 1)
        
        budget = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=current_month
        )
        
        response = authenticated_client.get('/api/budgets/status/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['month'] == current_month
        assert len(response.data['budgets']) == 1
    
    def test_budget_status_no_budgets(self, authenticated_client):
        """Test budget status when no budgets exist."""
        response = authenticated_client.get('/api/budgets/status/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        
        summary = response.data['summary']
        assert summary['total_budgeted'] == '0.00'
        assert summary['total_spent'] == '0.00'
        assert summary['total_remaining'] == '0.00'
        assert summary['overall_percentage_used'] == 0.0
        assert summary['budget_count'] == 0
        
        assert len(response.data['budgets']) == 0


@pytest.mark.django_db
class TestBudgetAlerts:
    """
    Tests for budget alerts when limits are exceeded.
    """
    
    def test_budget_alerts_no_alerts(self, authenticated_client, budget):
        """Test budget alerts when no alerts are needed."""
        # Create transaction well under budget
        Transaction.objects.create(
            user=budget.user,
            category=budget.category,
            amount=Decimal('100.00'),
            description='Small purchase',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get('/api/budgets/alerts/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
        assert len(response.data['alerts']) == 0
    
    def test_budget_alerts_approaching_limit(self, authenticated_client, budget):
        """Test budget alerts when approaching limit."""
        # Create transaction that uses 85% of budget
        Transaction.objects.create(
            user=budget.user,
            category=budget.category,
            amount=Decimal('425.00'),
            description='Large purchase',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get('/api/budgets/alerts/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        
        alert = response.data['alerts'][0]
        assert alert['budget_id'] == budget.id
        assert alert['category_name'] == budget.category.name
        assert alert['alert_type'] == 'approaching_limit'
        assert '85.0%' in alert['message']
    
    def test_budget_alerts_limit_exceeded(self, authenticated_client, budget):
        """Test budget alerts when limit is exceeded."""
        # Create transaction that exceeds budget
        Transaction.objects.create(
            user=budget.user,
            category=budget.category,
            amount=Decimal('600.00'),
            description='Expensive purchase',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get('/api/budgets/alerts/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        
        alert = response.data['alerts'][0]
        assert alert['budget_id'] == budget.id
        assert alert['category_name'] == budget.category.name
        assert alert['alert_type'] == 'limit_exceeded'
        assert 'exceeded' in alert['message'].lower()
        assert '$100.00' in alert['message']  # Amount over budget
    
    def test_budget_alerts_multiple_categories(self, authenticated_client, user):
        """Test budget alerts with multiple categories."""
        # Create categories and budgets
        category1 = Category.objects.create(user=user, name='Food')
        category2 = Category.objects.create(user=user, name='Transport')
        
        budget1 = Budget.objects.create(
            user=user,
            category=category1,
            amount=Decimal('500.00'),
            month=date(2024, 1, 1)
        )
        budget2 = Budget.objects.create(
            user=user,
            category=category2,
            amount=Decimal('300.00'),
            month=date(2024, 1, 1)
        )
        
        # Create transactions - one approaching limit, one over limit
        Transaction.objects.create(
            user=user,
            category=category1,
            amount=Decimal('425.00'),  # 85% of budget
            description='Food expenses',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            category=category2,
            amount=Decimal('350.00'),  # Over budget
            description='Transport expenses',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get('/api/budgets/alerts/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        
        # Check that we have both types of alerts
        alert_types = [alert['alert_type'] for alert in response.data['alerts']]
        assert 'approaching_limit' in alert_types
        assert 'limit_exceeded' in alert_types


@pytest.mark.django_db
class TestBudgetIntegration:
    """
    Integration tests for budget system with transactions and categories.
    """
    
    def test_complete_budget_workflow(self, authenticated_client, user):
        """Test complete budget workflow from creation to tracking."""
        # 1. Create category
        category_data = {
            'name': 'Groceries',
            'description': 'Food expenses',
            'color': '#3498db'
        }
        category_response = authenticated_client.post('/api/categories/', category_data)
        assert category_response.status_code == status.HTTP_201_CREATED
        category_id = category_response.data['id']
        
        # 2. Create budget
        budget_data = {
            'category': category_id,
            'amount': '500.00',
            'month': '2024-01-01'
        }
        budget_response = authenticated_client.post('/api/budgets/', budget_data)
        assert budget_response.status_code == status.HTTP_201_CREATED
        budget_id = budget_response.data['id']
        
        # 3. Create transactions
        transaction1_data = {
            'category': category_id,
            'amount': '150.00',
            'description': 'Weekly groceries',
            'transaction_type': 'expense',
            'date': '2024-01-10'
        }
        transaction1_response = authenticated_client.post('/api/transactions/', transaction1_data)
        assert transaction1_response.status_code == status.HTTP_201_CREATED
        
        transaction2_data = {
            'category': category_id,
            'amount': '300.00',
            'description': 'Monthly grocery stock',
            'transaction_type': 'expense',
            'date': '2024-01-20'
        }
        transaction2_response = authenticated_client.post('/api/transactions/', transaction2_data)
        assert transaction2_response.status_code == status.HTTP_201_CREATED
        
        # 4. Check budget status
        status_response = authenticated_client.get('/api/budgets/status/?month=2024-01-01')
        assert status_response.status_code == status.HTTP_200_OK
        
        summary = status_response.data['summary']
        assert summary['total_budgeted'] == '500.00'
        assert summary['total_spent'] == '450.00'
        assert summary['total_remaining'] == '50.00'
        assert summary['overall_percentage_used'] == 90.0
        assert summary['budgets_near_limit'] == 1
        
        # 5. Check alerts
        alerts_response = authenticated_client.get('/api/budgets/alerts/?month=2024-01-01')
        assert alerts_response.status_code == status.HTTP_200_OK
        assert alerts_response.data['count'] == 1
        assert alerts_response.data['alerts'][0]['alert_type'] == 'approaching_limit'
        
        # 6. Get budget transactions
        transactions_response = authenticated_client.get(f'/api/budgets/{budget_id}/transactions/')
        assert transactions_response.status_code == status.HTTP_200_OK
        assert len(transactions_response.data['results']) == 2
    
    def test_budget_isolation_between_users(self, user, another_user):
        """Test that budgets are properly isolated between users."""
        # Create categories for both users
        category1 = Category.objects.create(user=user, name='Food')
        category2 = Category.objects.create(user=another_user, name='Food')
        
        # Create budgets for both users
        budget1 = Budget.objects.create(
            user=user,
            category=category1,
            amount=Decimal('500.00'),
            month=date(2024, 1, 1)
        )
        budget2 = Budget.objects.create(
            user=another_user,
            category=category2,
            amount=Decimal('300.00'),
            month=date(2024, 1, 1)
        )
        
        # Create transactions for both users
        Transaction.objects.create(
            user=user,
            category=category1,
            amount=Decimal('200.00'),
            description='User 1 expense',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=another_user,
            category=category2,
            amount=Decimal('100.00'),
            description='User 2 expense',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Check budget status for user 1
        status1 = BudgetTrackingService.calculate_budget_status(budget1)
        assert status1['spent_amount'] == Decimal('200.00')
        assert status1['remaining_amount'] == Decimal('300.00')
        
        # Check budget status for user 2
        status2 = BudgetTrackingService.calculate_budget_status(budget2)
        assert status2['spent_amount'] == Decimal('100.00')
        assert status2['remaining_amount'] == Decimal('200.00')
        
        # Verify isolation - each user's budget only tracks their own transactions
        assert status1['spent_amount'] != status2['spent_amount']
    
    def test_transaction_impact_check(self, authenticated_client, budget):
        """Test checking transaction impact on budgets."""
        # Check impact of a transaction that would put budget near limit
        transaction_data = {
            'category': budget.category.id,
            'amount': '450.00',
            'date': '2024-01-15',
            'transaction_type': 'expense'
        }
        
        response = authenticated_client.post('/api/budgets/check_transaction_impact/', transaction_data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['has_impact'] is True
        assert response.data['budget_id'] == budget.id
        assert response.data['new_spent'] == Decimal('450.00')
        assert response.data['new_percentage'] == 90.0
        assert response.data['status_changed'] is True
        assert response.data['new_alert_level'] == 'warning'
    
    def test_monthly_summary_comprehensive(self, authenticated_client, user):
        """Test comprehensive monthly budget summary."""
        # Create multiple categories and budgets
        categories = []
        budgets = []
        
        for i, (name, amount) in enumerate([('Food', '500'), ('Transport', '300'), ('Entertainment', '200')]):
            category = Category.objects.create(user=user, name=name)
            budget = Budget.objects.create(
                user=user,
                category=category,
                amount=Decimal(amount),
                month=date(2024, 1, 1)
            )
            categories.append(category)
            budgets.append(budget)
        
        # Create transactions with different spending levels
        # Food: 90% (near limit)
        Transaction.objects.create(
            user=user,
            category=categories[0],
            amount=Decimal('450.00'),
            description='Food expenses',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Transport: 120% (over limit)
        Transaction.objects.create(
            user=user,
            category=categories[1],
            amount=Decimal('360.00'),
            description='Transport expenses',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Entertainment: 50% (under limit)
        Transaction.objects.create(
            user=user,
            category=categories[2],
            amount=Decimal('100.00'),
            description='Entertainment expenses',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get('/api/budgets/monthly_summary/?month=2024-01-01')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_budgeted'] == '1000.00'
        assert response.data['total_spent'] == '910.00'
        assert response.data['total_remaining'] == '90.00'
        assert response.data['overall_percentage_used'] == 91.0
        assert response.data['budget_count'] == 3
        assert response.data['budgets_under_limit'] == 1
        assert response.data['budgets_near_limit'] == 1
        assert response.data['budgets_over_limit'] == 1
        
        # Check individual budget details
        budget_details = response.data['budget_details']
        assert len(budget_details) == 3
        
        # Find each budget by category name
        food_budget = next(b for b in budget_details if b['category_name'] == 'Food')
        transport_budget = next(b for b in budget_details if b['category_name'] == 'Transport')
        entertainment_budget = next(b for b in budget_details if b['category_name'] == 'Entertainment')
        
        assert food_budget['status'] == 'near_limit'
        assert transport_budget['status'] == 'over_budget'
        assert entertainment_budget['status'] == 'under_budget'