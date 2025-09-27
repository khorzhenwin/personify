"""
Finance app comprehensive tests following TDD methodology.
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from decimal import Decimal, InvalidOperation
from datetime import date, datetime
from .models import Category, Transaction, Budget

User = get_user_model()


@pytest.mark.django_db
class TestCustomUserModel:
    """
    Comprehensive tests for CustomUser model validation and constraints.
    """
    
    def test_create_user_with_valid_data(self):
        """Test creating a user with all valid required fields."""
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
        assert not user.is_email_verified  # Default should be False
        assert user.check_password('testpass123')
        assert user.created_at is not None
        assert user.updated_at is not None
    
    def test_create_user_without_email_raises_error(self):
        """Test that creating user without email raises ValueError."""
        with pytest.raises(ValueError, match='The Email field must be set'):
            User.objects.create_user(
                email='',
                password='testpass123',
                first_name='Test',
                last_name='User'
            )
    
    def test_create_user_with_duplicate_email_raises_error(self):
        """Test that creating user with duplicate email raises IntegrityError."""
        User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email='test@example.com',
                password='different123',
                first_name='Another',
                last_name='User'
            )
    
    def test_create_superuser_with_valid_data(self):
        """Test creating a superuser with proper flags."""
        superuser = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User'
        )
        assert superuser.is_staff is True
        assert superuser.is_superuser is True
        assert superuser.email == 'admin@example.com'
    
    def test_create_superuser_without_staff_flag_raises_error(self):
        """Test that creating superuser without is_staff=True raises ValueError."""
        with pytest.raises(ValueError, match='Superuser must have is_staff=True'):
            User.objects.create_superuser(
                email='admin@example.com',
                password='adminpass123',
                is_staff=False
            )
    
    def test_create_superuser_without_superuser_flag_raises_error(self):
        """Test that creating superuser without is_superuser=True raises ValueError."""
        with pytest.raises(ValueError, match='Superuser must have is_superuser=True'):
            User.objects.create_superuser(
                email='admin@example.com',
                password='adminpass123',
                is_superuser=False
            )
    
    def test_user_str_representation(self):
        """Test user string representation returns email."""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        assert str(user) == 'test@example.com'
    
    def test_email_normalization(self):
        """Test that email is properly normalized."""
        user = User.objects.create_user(
            email='Test@EXAMPLE.COM',
            password='testpass123'
        )
        assert user.email == 'Test@example.com'  # Domain should be lowercase
    
    def test_username_field_is_email(self):
        """Test that USERNAME_FIELD is set to email."""
        assert User.USERNAME_FIELD == 'email'
    
    def test_required_fields_configuration(self):
        """Test that REQUIRED_FIELDS includes first_name and last_name."""
        assert 'first_name' in User.REQUIRED_FIELDS
        assert 'last_name' in User.REQUIRED_FIELDS


@pytest.mark.django_db
class TestCategoryModel:
    """
    Comprehensive tests for Category model with user relationships and uniqueness.
    """
    
    def test_create_category_with_valid_data(self, user):
        """Test creating a category with all valid fields."""
        category = Category.objects.create(
            user=user,
            name='Food & Dining',
            description='All food and dining related expenses',
            color='#ff6b6b'
        )
        assert category.user == user
        assert category.name == 'Food & Dining'
        assert category.description == 'All food and dining related expenses'
        assert category.color == '#ff6b6b'
        assert category.created_at is not None
    
    def test_create_category_with_minimal_data(self, user):
        """Test creating a category with only required fields."""
        category = Category.objects.create(
            user=user,
            name='Transportation'
        )
        assert category.user == user
        assert category.name == 'Transportation'
        assert category.description == ''  # Should default to empty string
        assert category.color == '#3498db'  # Should use default color
    
    def test_category_name_max_length_validation(self, user):
        """Test that category name respects max_length constraint."""
        long_name = 'x' * 101  # Exceeds max_length of 100
        category = Category(
            user=user,
            name=long_name
        )
        with pytest.raises(ValidationError):
            category.full_clean()
    
    def test_category_color_default_value(self, user):
        """Test that category color has correct default value."""
        category = Category.objects.create(
            user=user,
            name='Default Color Test'
        )
        assert category.color == '#3498db'
    
    def test_category_unique_name_per_user(self, user):
        """Test that category names must be unique per user."""
        Category.objects.create(user=user, name='Food')
        
        with pytest.raises(IntegrityError):
            Category.objects.create(user=user, name='Food')
    
    def test_category_same_name_different_users_allowed(self):
        """Test that different users can have categories with same name."""
        user1 = User.objects.create_user(
            email='user1@example.com',
            password='pass123'
        )
        user2 = User.objects.create_user(
            email='user2@example.com',
            password='pass123'
        )
        
        category1 = Category.objects.create(user=user1, name='Food')
        category2 = Category.objects.create(user=user2, name='Food')
        
        assert category1.name == category2.name
        assert category1.user != category2.user
    
    def test_category_str_representation(self, user):
        """Test category string representation."""
        category = Category.objects.create(
            user=user,
            name='Entertainment'
        )
        expected = f"{user.email} - Entertainment"
        assert str(category) == expected
    
    def test_category_ordering(self, user):
        """Test that categories are ordered by name."""
        Category.objects.create(user=user, name='Zebra')
        Category.objects.create(user=user, name='Apple')
        Category.objects.create(user=user, name='Banana')
        
        categories = list(Category.objects.filter(user=user))
        names = [cat.name for cat in categories]
        assert names == ['Apple', 'Banana', 'Zebra']
    
    def test_category_cascade_delete_with_user(self, user):
        """Test that categories are deleted when user is deleted."""
        category = Category.objects.create(user=user, name='Test Category')
        category_id = category.id
        
        user.delete()
        
        assert not Category.objects.filter(id=category_id).exists()


@pytest.mark.django_db
class TestTransactionModel:
    """
    Comprehensive tests for Transaction model with all field validations.
    """
    
    def test_create_transaction_with_valid_data(self, user, category):
        """Test creating a transaction with all valid fields."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('125.75'),
            description='Grocery shopping at Whole Foods',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        assert transaction.user == user
        assert transaction.amount == Decimal('125.75')
        assert transaction.description == 'Grocery shopping at Whole Foods'
        assert transaction.category == category
        assert transaction.transaction_type == 'expense'
        assert transaction.date == date(2024, 1, 15)
        assert transaction.created_at is not None
        assert transaction.updated_at is not None
    
    def test_create_transaction_without_category(self, user):
        """Test creating a transaction without category (should be allowed)."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('50.00'),
            description='Cash withdrawal',
            transaction_type='expense',
            date=date.today()
        )
        assert transaction.category is None
        assert transaction.user == user
    
    def test_transaction_amount_minimum_validation(self, user):
        """Test that transaction amount must be greater than 0."""
        transaction = Transaction(
            user=user,
            amount=Decimal('0.00'),
            description='Invalid amount',
            transaction_type='expense',
            date=date.today()
        )
        with pytest.raises(ValidationError):
            transaction.full_clean()
    
    def test_transaction_amount_negative_validation(self, user):
        """Test that transaction amount cannot be negative."""
        transaction = Transaction(
            user=user,
            amount=Decimal('-10.00'),
            description='Negative amount',
            transaction_type='expense',
            date=date.today()
        )
        with pytest.raises(ValidationError):
            transaction.full_clean()
    
    def test_transaction_amount_precision_validation(self, user):
        """Test that transaction amount respects decimal precision."""
        # This should work - 2 decimal places
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('123.45'),
            description='Valid precision',
            transaction_type='expense',
            date=date.today()
        )
        assert transaction.amount == Decimal('123.45')
    
    def test_transaction_description_max_length(self, user):
        """Test that transaction description respects max_length constraint."""
        long_description = 'x' * 256  # Exceeds max_length of 255
        transaction = Transaction(
            user=user,
            amount=Decimal('10.00'),
            description=long_description,
            transaction_type='expense',
            date=date.today()
        )
        with pytest.raises(ValidationError):
            transaction.full_clean()
    
    def test_transaction_type_choices_validation(self, user):
        """Test that transaction_type only accepts valid choices."""
        # Valid choices should work
        for valid_type in ['income', 'expense']:
            transaction = Transaction.objects.create(
                user=user,
                amount=Decimal('10.00'),
                description=f'Test {valid_type}',
                transaction_type=valid_type,
                date=date.today()
            )
            assert transaction.transaction_type == valid_type
    
    def test_transaction_invalid_type_validation(self, user):
        """Test that invalid transaction_type raises ValidationError."""
        transaction = Transaction(
            user=user,
            amount=Decimal('10.00'),
            description='Invalid type',
            transaction_type='invalid_type',
            date=date.today()
        )
        with pytest.raises(ValidationError):
            transaction.full_clean()
    
    def test_transaction_str_representation(self, user, category):
        """Test transaction string representation."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('75.25'),
            description='Restaurant dinner',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        expected = f"{user.email} - Restaurant dinner (75.25)"
        assert str(transaction) == expected
    
    def test_transaction_ordering(self, user):
        """Test that transactions are ordered by date (desc) then created_at (desc)."""
        # Create transactions with different dates
        old_transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('10.00'),
            description='Old transaction',
            transaction_type='expense',
            date=date(2024, 1, 1)
        )
        new_transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('20.00'),
            description='New transaction',
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        transactions = list(Transaction.objects.filter(user=user))
        assert transactions[0] == new_transaction  # Should be first (newer date)
        assert transactions[1] == old_transaction  # Should be second (older date)
    
    def test_transaction_cascade_delete_with_user(self, user, category):
        """Test that transactions are deleted when user is deleted."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('10.00'),
            description='Test transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        transaction_id = transaction.id
        
        user.delete()
        
        assert not Transaction.objects.filter(id=transaction_id).exists()
    
    def test_transaction_set_null_when_category_deleted(self, user, category):
        """Test that transaction.category is set to NULL when category is deleted."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('10.00'),
            description='Test transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        category.delete()
        transaction.refresh_from_db()
        
        assert transaction.category is None


@pytest.mark.django_db
class TestBudgetModel:
    """
    Comprehensive tests for Budget model with monthly tracking capabilities.
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
            amount=Decimal('200.00'),
            month=month
        )
        
        assert budget1.category != budget2.category
        assert budget1.month == budget2.month
    
    def test_budget_str_representation(self, user, category):
        """Test budget string representation."""
        month = date(2024, 3, 1)
        budget = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('750.00'),
            month=month
        )
        expected = f"{user.email} - {category.name} (2024-03)"
        assert str(budget) == expected
    
    def test_budget_ordering(self, user):
        """Test that budgets are ordered by month (desc) then category name."""
        category1 = Category.objects.create(user=user, name='Food')
        category2 = Category.objects.create(user=user, name='Transport')
        
        # Create budgets in different order
        budget_old = Budget.objects.create(
            user=user,
            category=category2,
            amount=Decimal('200.00'),
            month=date(2024, 1, 1)
        )
        budget_new = Budget.objects.create(
            user=user,
            category=category1,
            amount=Decimal('500.00'),
            month=date(2024, 2, 1)
        )
        
        budgets = list(Budget.objects.filter(user=user))
        assert budgets[0] == budget_new  # Should be first (newer month)
        assert budgets[1] == budget_old  # Should be second (older month)
    
    def test_budget_cascade_delete_with_user(self, user, category):
        """Test that budgets are deleted when user is deleted."""
        budget = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=date(2024, 1, 1)
        )
        budget_id = budget.id
        
        user.delete()
        
        assert not Budget.objects.filter(id=budget_id).exists()
    
    def test_budget_cascade_delete_with_category(self, user, category):
        """Test that budgets are deleted when category is deleted."""
        budget = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=date(2024, 1, 1)
        )
        budget_id = budget.id
        
        category.delete()
        
        assert not Budget.objects.filter(id=budget_id).exists()


@pytest.mark.django_db
class TestModelIntegration:
    """
    Integration tests for model relationships and constraints.
    """
    
    def test_user_categories_relationship(self, user):
        """Test that user can access their categories through reverse relationship."""
        category1 = Category.objects.create(user=user, name='Food')
        category2 = Category.objects.create(user=user, name='Transport')
        
        user_categories = user.categories.all()
        assert category1 in user_categories
        assert category2 in user_categories
        assert user_categories.count() == 2
    
    def test_user_transactions_relationship(self, user, category):
        """Test that user can access their transactions through reverse relationship."""
        transaction1 = Transaction.objects.create(
            user=user,
            amount=Decimal('10.00'),
            description='Test 1',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        transaction2 = Transaction.objects.create(
            user=user,
            amount=Decimal('20.00'),
            description='Test 2',
            transaction_type='income',
            date=date.today()
        )
        
        user_transactions = user.transactions.all()
        assert transaction1 in user_transactions
        assert transaction2 in user_transactions
        assert user_transactions.count() == 2
    
    def test_category_transactions_relationship(self, user, category):
        """Test that category can access its transactions through reverse relationship."""
        transaction1 = Transaction.objects.create(
            user=user,
            amount=Decimal('10.00'),
            description='Test 1',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        transaction2 = Transaction.objects.create(
            user=user,
            amount=Decimal('20.00'),
            description='Test 2',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        category_transactions = category.transactions.all()
        assert transaction1 in category_transactions
        assert transaction2 in category_transactions
        assert category_transactions.count() == 2
    
    def test_category_budgets_relationship(self, user, category):
        """Test that category can access its budgets through reverse relationship."""
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
        
        category_budgets = category.budgets.all()
        assert budget1 in category_budgets
        assert budget2 in category_budgets
        assert category_budgets.count() == 2


@pytest.mark.django_db
class TestDatabaseMigrations:
    """
    Tests to verify database migrations work correctly.
    """
    
    def test_models_can_be_imported(self):
        """Test that all models can be imported without errors."""
        from finance.models import CustomUser, Category, Transaction, Budget
        assert CustomUser is not None
        assert Category is not None
        assert Transaction is not None
        assert Budget is not None
    
    def test_database_connection_works(self):
        """Test that database connection is working."""
        user_count = User.objects.count()
        assert user_count >= 0  # Should not raise an exception
    
    def test_all_model_operations_work(self):
        """Test that basic CRUD operations work for all models."""
        # Create user
        user = User.objects.create_user(
            email='integration@example.com',
            password='testpass123',
            first_name='Integration',
            last_name='Test'
        )
        
        # Create category
        category = Category.objects.create(
            user=user,
            name='Integration Test Category'
        )
        
        # Create transaction
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Integration test transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        # Create budget
        budget = Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal('500.00'),
            month=date.today().replace(day=1)
        )
        
        # Verify all objects were created
        assert User.objects.filter(email='integration@example.com').exists()
        assert Category.objects.filter(name='Integration Test Category').exists()
        assert Transaction.objects.filter(description='Integration test transaction').exists()
        assert Budget.objects.filter(user=user, category=category).exists()
        
        # Test updates
        category.name = 'Updated Category Name'
        category.save()
        category.refresh_from_db()
        assert category.name == 'Updated Category Name'
        
        # Test deletions work properly with cascades
        user.delete()
        assert not Category.objects.filter(name='Updated Category Name').exists()
        assert not Transaction.objects.filter(description='Integration test transaction').exists()
        assert not Budget.objects.filter(category=category).exists()