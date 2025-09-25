"""
Finance app tests.
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date
from .models import Category, Transaction, Budget

User = get_user_model()


@pytest.mark.django_db
class TestCustomUser:
    """
    Test CustomUser model.
    """
    
    def test_create_user_with_email(self):
        """Test creating a user with email as username."""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        assert user.email == 'test@example.com'
        assert user.username == 'test@example.com'  # Should be set to email
        assert user.first_name == 'Test'
        assert user.last_name == 'User'
        assert not user.is_email_verified
        assert user.check_password('testpass123')
    
    def test_user_str_representation(self):
        """Test user string representation."""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        assert str(user) == 'test@example.com'


@pytest.mark.django_db
class TestCategory:
    """
    Test Category model.
    """
    
    def test_create_category(self, user):
        """Test creating a category."""
        category = Category.objects.create(
            user=user,
            name='Food',
            description='Food expenses',
            color='#ff6b6b'
        )
        assert category.user == user
        assert category.name == 'Food'
        assert category.description == 'Food expenses'
        assert category.color == '#ff6b6b'
    
    def test_category_str_representation(self, user):
        """Test category string representation."""
        category = Category.objects.create(
            user=user,
            name='Food'
        )
        assert str(category) == f"{user.email} - Food"
    
    def test_category_unique_per_user(self, user):
        """Test that category names are unique per user."""
        Category.objects.create(user=user, name='Food')
        
        # Creating another category with same name for same user should fail
        with pytest.raises(Exception):  # IntegrityError
            Category.objects.create(user=user, name='Food')


@pytest.mark.django_db
class TestTransaction:
    """
    Test Transaction model.
    """
    
    def test_create_transaction(self, user, category):
        """Test creating a transaction."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('25.50'),
            description='Lunch',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        assert transaction.user == user
        assert transaction.amount == Decimal('25.50')
        assert transaction.description == 'Lunch'
        assert transaction.category == category
        assert transaction.transaction_type == 'expense'
        assert transaction.date == date.today()
    
    def test_transaction_str_representation(self, user, category):
        """Test transaction string representation."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('25.50'),
            description='Lunch',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        expected = f"{user.email} - Lunch (25.50)"
        assert str(transaction) == expected


@pytest.mark.django_db
class TestBudget:
    """
    Test Budget model.
    """
    
    def test_create_budget(self, user, category):
        """Test creating a budget."""
        month = date.today().replace(day=1)
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
    
    def test_budget_str_representation(self, user, category):
        """Test budget string representation."""
        month = date.today().replace(day=1)
        budget = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=month
        )
        expected = f"{user.email} - {category.name} ({month.strftime('%Y-%m')})"
        assert str(budget) == expected


@pytest.mark.django_db
class TestProjectSetup:
    """
    Test basic project setup.
    """
    
    def test_database_connection(self):
        """Test that database connection works."""
        user_count = User.objects.count()
        assert user_count >= 0  # Should not raise an exception
    
    def test_models_can_be_imported(self):
        """Test that all models can be imported."""
        from finance.models import CustomUser, Category, Transaction, Budget
        assert CustomUser is not None
        assert Category is not None
        assert Transaction is not None
        assert Budget is not None