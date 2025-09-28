"""
Comprehensive tests for Transaction API endpoints following TDD methodology.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from decimal import Decimal
from datetime import date, timedelta
import json

from .models import Category, Transaction

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for making requests."""
    return APIClient()


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
def other_user():
    """Create another test user for isolation tests."""
    return User.objects.create_user(
        email='otheruser@example.com',
        password='testpass123',
        first_name='Other',
        last_name='User'
    )


@pytest.fixture
def category(user):
    """Create a test category."""
    return Category.objects.create(
        user=user,
        name='Food & Dining',
        description='Food and dining expenses',
        color='#ff6b6b'
    )


@pytest.fixture
def other_category(other_user):
    """Create a category for another user."""
    return Category.objects.create(
        user=other_user,
        name='Transportation',
        description='Transport expenses',
        color='#4ecdc4'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """API client authenticated with test user."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def sample_transaction_data():
    """Sample transaction data for testing."""
    return {
        'amount': '125.75',
        'description': 'Grocery shopping at Whole Foods',
        'transaction_type': 'expense',
        'date': '2024-01-15'
    }


@pytest.mark.django_db
class TestTransactionCreation:
    """
    Tests for transaction creation with all required fields.
    """
    
    def test_create_transaction_with_valid_data_success(self, authenticated_client, category, sample_transaction_data):
        """Test creating a transaction with all valid required fields."""
        sample_transaction_data['category_id'] = category.id
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=sample_transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify response data
        response_data = response.json()
        assert response_data['amount'] == '125.75'
        assert response_data['description'] == 'Grocery shopping at Whole Foods'
        assert response_data['category'] == category.id
        assert response_data['category_name'] == category.name
        assert response_data['category_color'] == category.color
        assert response_data['transaction_type'] == 'expense'
        assert response_data['date'] == '2024-01-15'
        assert 'id' in response_data
        assert 'created_at' in response_data
        assert 'updated_at' in response_data
        
        # Verify database record
        transaction = Transaction.objects.get(id=response_data['id'])
        assert transaction.amount == Decimal('125.75')
        assert transaction.description == 'Grocery shopping at Whole Foods'
        assert transaction.category == category
        assert transaction.transaction_type == 'expense'
        assert transaction.date == date(2024, 1, 15)
        assert transaction.user == authenticated_client.handler._force_user
    
    def test_create_transaction_without_category_success(self, authenticated_client, sample_transaction_data):
        """Test creating a transaction without category (should be allowed)."""
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=sample_transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        response_data = response.json()
        assert response_data['category'] is None
        assert response_data['category_name'] is None
        assert response_data['category_color'] is None
        
        # Verify database record
        transaction = Transaction.objects.get(id=response_data['id'])
        assert transaction.category is None
    
    def test_create_transaction_with_income_type_success(self, authenticated_client, category):
        """Test creating an income transaction."""
        transaction_data = {
            'amount': '2500.00',
            'description': 'Monthly salary',
            'category_id': category.id,
            'transaction_type': 'income',
            'date': '2024-01-01'
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        response_data = response.json()
        assert response_data['transaction_type'] == 'income'
        assert response_data['amount'] == '2500.00'
    
    def test_create_transaction_missing_amount_fails(self, authenticated_client, category):
        """Test that creating transaction without amount fails."""
        transaction_data = {
            'description': 'Missing amount transaction',
            'category_id': category.id,
            'transaction_type': 'expense',
            'date': '2024-01-15'
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'amount' in response.json()
    
    def test_create_transaction_missing_description_fails(self, authenticated_client, category):
        """Test that creating transaction without description fails."""
        transaction_data = {
            'amount': '50.00',
            'category_id': category.id,
            'transaction_type': 'expense',
            'date': '2024-01-15'
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'description' in response.json()
    
    def test_create_transaction_missing_transaction_type_fails(self, authenticated_client, category):
        """Test that creating transaction without transaction_type fails."""
        transaction_data = {
            'amount': '50.00',
            'description': 'Missing type transaction',
            'category_id': category.id,
            'date': '2024-01-15'
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'transaction_type' in response.json()
    
    def test_create_transaction_missing_date_fails(self, authenticated_client, category):
        """Test that creating transaction without date fails."""
        transaction_data = {
            'amount': '50.00',
            'description': 'Missing date transaction',
            'category_id': category.id,
            'transaction_type': 'expense'
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'date' in response.json()
    
    def test_create_transaction_invalid_amount_fails(self, authenticated_client, category):
        """Test that creating transaction with invalid amount fails."""
        invalid_amounts = ['0', '-10.50', '0.001', 'invalid', '']
        
        for invalid_amount in invalid_amounts:
            transaction_data = {
                'amount': invalid_amount,
                'description': f'Invalid amount test: {invalid_amount}',
                'category_id': category.id,
                'transaction_type': 'expense',
                'date': '2024-01-15'
            }
            
            response = authenticated_client.post(
                reverse('transaction-list'),
                data=transaction_data,
                format='json'
            )
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert 'amount' in response.json()
    
    def test_create_transaction_invalid_transaction_type_fails(self, authenticated_client, category):
        """Test that creating transaction with invalid transaction_type fails."""
        transaction_data = {
            'amount': '50.00',
            'description': 'Invalid type transaction',
            'category_id': category.id,
            'transaction_type': 'invalid_type',
            'date': '2024-01-15'
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'transaction_type' in response.json()
    
    def test_create_transaction_future_date_fails(self, authenticated_client, category):
        """Test that creating transaction with future date fails."""
        future_date = (date.today() + timedelta(days=1)).isoformat()
        transaction_data = {
            'amount': '50.00',
            'description': 'Future date transaction',
            'category_id': category.id,
            'transaction_type': 'expense',
            'date': future_date
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'date' in response.json()
    
    def test_create_transaction_other_user_category_fails(self, authenticated_client, other_category):
        """Test that creating transaction with another user's category fails."""
        transaction_data = {
            'amount': '50.00',
            'description': 'Other user category transaction',
            'category_id': other_category.id,
            'transaction_type': 'expense',
            'date': '2024-01-15'
        }
        
        response = authenticated_client.post(
            reverse('transaction-list'),
            data=transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'category_id' in response.json()
    
    def test_create_transaction_unauthenticated_fails(self, api_client, sample_transaction_data):
        """Test that creating transaction without authentication fails."""
        response = api_client.post(
            reverse('transaction-list'),
            data=sample_transaction_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTransactionListing:
    """
    Tests for transaction listing with pagination and user filtering.
    """
    
    def test_list_transactions_empty_success(self, authenticated_client):
        """Test listing transactions when user has no transactions."""
        response = authenticated_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 0
        assert response_data['results'] == []
    
    def test_list_transactions_with_data_success(self, authenticated_client, user, category):
        """Test listing transactions with existing data."""
        # Create test transactions
        transaction1 = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction 1',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        transaction2 = Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Transaction 2',
            transaction_type='income',
            date=date(2024, 1, 10)
        )
        
        response = authenticated_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        assert len(response_data['results']) == 2
        
        # Verify ordering (should be by date desc, then created_at desc)
        results = response_data['results']
        assert results[0]['id'] == transaction1.id  # Newer date first
        assert results[1]['id'] == transaction2.id
        
        # Verify data structure
        first_transaction = results[0]
        assert first_transaction['amount'] == '100.00'
        assert first_transaction['description'] == 'Transaction 1'
        assert first_transaction['category_name'] == category.name
        assert first_transaction['category_color'] == category.color
        assert first_transaction['transaction_type'] == 'expense'
        assert first_transaction['date'] == '2024-01-15'
    
    def test_list_transactions_user_isolation(self, authenticated_client, user, other_user, category):
        """Test that users only see their own transactions."""
        # Create transaction for authenticated user
        user_transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='User transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        # Create transaction for other user
        other_category = Category.objects.create(user=other_user, name='Other Category')
        Transaction.objects.create(
            user=other_user,
            amount=Decimal('200.00'),
            description='Other user transaction',
            category=other_category,
            transaction_type='expense',
            date=date.today()
        )
        
        response = authenticated_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
        assert response_data['results'][0]['id'] == user_transaction.id
        assert response_data['results'][0]['description'] == 'User transaction'
    
    def test_list_transactions_pagination_success(self, authenticated_client, user, category):
        """Test transaction listing with pagination."""
        # Create multiple transactions
        for i in range(25):
            Transaction.objects.create(
                user=user,
                amount=Decimal(f'{i + 1}.00'),
                description=f'Transaction {i + 1}',
                category=category,
                transaction_type='expense',
                date=date.today()
            )
        
        # Test first page
        response = authenticated_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 25
        assert len(response_data['results']) == 20  # Default page size
        assert response_data['next'] is not None
        assert response_data['previous'] is None
        
        # Test second page
        response = authenticated_client.get(response_data['next'])
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data['results']) == 5  # Remaining items
        assert response_data['next'] is None
        assert response_data['previous'] is not None
    
    def test_list_transactions_custom_page_size(self, authenticated_client, user, category):
        """Test transaction listing with custom page size."""
        # Create test transactions
        for i in range(15):
            Transaction.objects.create(
                user=user,
                amount=Decimal(f'{i + 1}.00'),
                description=f'Transaction {i + 1}',
                category=category,
                transaction_type='expense',
                date=date.today()
            )
        
        response = authenticated_client.get(
            reverse('transaction-list'),
            {'page_size': 5}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 15
        assert len(response_data['results']) == 5
        assert response_data['next'] is not None
    
    def test_list_transactions_unauthenticated_fails(self, api_client):
        """Test that listing transactions without authentication fails."""
        response = api_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTransactionUpdate:
    """
    Tests for transaction editing and immediate updates.
    """
    
    def test_update_transaction_full_data_success(self, authenticated_client, user, category):
        """Test updating a transaction with all fields."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Original description',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        new_category = Category.objects.create(user=user, name='New Category')
        update_data = {
            'amount': '150.50',
            'description': 'Updated description',
            'category_id': new_category.id,
            'transaction_type': 'income',
            'date': '2024-01-20'
        }
        
        response = authenticated_client.put(
            reverse('transaction-detail', kwargs={'pk': transaction.id}),
            data=update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify response data
        response_data = response.json()
        assert response_data['amount'] == '150.50'
        assert response_data['description'] == 'Updated description'
        assert response_data['category'] == new_category.id
        assert response_data['category_name'] == new_category.name
        assert response_data['transaction_type'] == 'income'
        assert response_data['date'] == '2024-01-20'
        
        # Verify database update
        transaction.refresh_from_db()
        assert transaction.amount == Decimal('150.50')
        assert transaction.description == 'Updated description'
        assert transaction.category == new_category
        assert transaction.transaction_type == 'income'
        assert transaction.date == date(2024, 1, 20)
    
    def test_update_transaction_partial_data_success(self, authenticated_client, user, category):
        """Test updating a transaction with partial data (PATCH)."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Original description',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        update_data = {
            'amount': '75.25',
            'description': 'Partially updated description'
        }
        
        response = authenticated_client.patch(
            reverse('transaction-detail', kwargs={'pk': transaction.id}),
            data=update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify response data
        response_data = response.json()
        assert response_data['amount'] == '75.25'
        assert response_data['description'] == 'Partially updated description'
        assert response_data['category'] == category.id  # Should remain unchanged
        assert response_data['transaction_type'] == 'expense'  # Should remain unchanged
        
        # Verify database update
        transaction.refresh_from_db()
        assert transaction.amount == Decimal('75.25')
        assert transaction.description == 'Partially updated description'
        assert transaction.category == category  # Should remain unchanged
        assert transaction.transaction_type == 'expense'  # Should remain unchanged
    
    def test_update_transaction_remove_category_success(self, authenticated_client, user, category):
        """Test updating a transaction to remove category."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction with category',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        update_data = {
            'category_id': None
        }
        
        response = authenticated_client.patch(
            reverse('transaction-detail', kwargs={'pk': transaction.id}),
            data=update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        response_data = response.json()
        assert response_data['category'] is None
        assert response_data['category_name'] is None
        
        transaction.refresh_from_db()
        assert transaction.category is None
    
    def test_update_transaction_invalid_amount_fails(self, authenticated_client, user, category):
        """Test that updating transaction with invalid amount fails."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Valid transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        invalid_amounts = ['0', '-10.50', '0.001']
        
        for invalid_amount in invalid_amounts:
            update_data = {'amount': invalid_amount}
            
            response = authenticated_client.patch(
                reverse('transaction-detail', kwargs={'pk': transaction.id}),
                data=update_data,
                format='json'
            )
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert 'amount' in response.json()
    
    def test_update_transaction_other_user_category_fails(self, authenticated_client, user, category, other_category):
        """Test that updating transaction with another user's category fails."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='User transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        update_data = {
            'category_id': other_category.id
        }
        
        response = authenticated_client.patch(
            reverse('transaction-detail', kwargs={'pk': transaction.id}),
            data=update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'category_id' in response.json()
    
    def test_update_other_user_transaction_fails(self, authenticated_client, other_user, category):
        """Test that updating another user's transaction fails."""
        other_category = Category.objects.create(user=other_user, name='Other Category')
        transaction = Transaction.objects.create(
            user=other_user,
            amount=Decimal('100.00'),
            description='Other user transaction',
            category=other_category,
            transaction_type='expense',
            date=date.today()
        )
        
        update_data = {
            'amount': '200.00'
        }
        
        response = authenticated_client.patch(
            reverse('transaction-detail', kwargs={'pk': transaction.id}),
            data=update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_nonexistent_transaction_fails(self, authenticated_client):
        """Test that updating non-existent transaction fails."""
        update_data = {
            'amount': '200.00'
        }
        
        response = authenticated_client.patch(
            reverse('transaction-detail', kwargs={'pk': 99999}),
            data=update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_transaction_unauthenticated_fails(self, api_client, user, category):
        """Test that updating transaction without authentication fails."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        update_data = {
            'amount': '200.00'
        }
        
        response = api_client.patch(
            reverse('transaction-detail', kwargs={'pk': transaction.id}),
            data=update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTransactionDeletion:
    """
    Tests for transaction deletion and related calculations.
    """
    
    def test_delete_transaction_success(self, authenticated_client, user, category):
        """Test deleting a transaction successfully."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction to delete',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        transaction_id = transaction.id
        
        response = authenticated_client.delete(
            reverse('transaction-detail', kwargs={'pk': transaction.id})
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify transaction is deleted from database
        assert not Transaction.objects.filter(id=transaction_id).exists()
    
    def test_delete_transaction_with_category_success(self, authenticated_client, user, category):
        """Test deleting a transaction with category doesn't affect category."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction with category',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        transaction_id = transaction.id
        category_id = category.id
        
        response = authenticated_client.delete(
            reverse('transaction-detail', kwargs={'pk': transaction.id})
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify transaction is deleted but category remains
        assert not Transaction.objects.filter(id=transaction_id).exists()
        assert Category.objects.filter(id=category_id).exists()
    
    def test_delete_other_user_transaction_fails(self, authenticated_client, other_user):
        """Test that deleting another user's transaction fails."""
        other_category = Category.objects.create(user=other_user, name='Other Category')
        transaction = Transaction.objects.create(
            user=other_user,
            amount=Decimal('100.00'),
            description='Other user transaction',
            category=other_category,
            transaction_type='expense',
            date=date.today()
        )
        
        response = authenticated_client.delete(
            reverse('transaction-detail', kwargs={'pk': transaction.id})
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Verify transaction still exists
        assert Transaction.objects.filter(id=transaction.id).exists()
    
    def test_delete_nonexistent_transaction_fails(self, authenticated_client):
        """Test that deleting non-existent transaction fails."""
        response = authenticated_client.delete(
            reverse('transaction-detail', kwargs={'pk': 99999})
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_transaction_unauthenticated_fails(self, api_client, user, category):
        """Test that deleting transaction without authentication fails."""
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        response = api_client.delete(
            reverse('transaction-detail', kwargs={'pk': transaction.id})
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Verify transaction still exists
        assert Transaction.objects.filter(id=transaction.id).exists()


@pytest.mark.django_db
class TestTransactionSearch:
    """
    Tests for transaction search by description and amount.
    """
    
    def test_search_transactions_by_description_success(self, authenticated_client, user, category):
        """Test searching transactions by description."""
        # Create test transactions with different descriptions
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Grocery shopping at Whole Foods',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('50.00'),
            description='Coffee at Starbucks',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 14)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Gas station fill up',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 13)
        )
        
        # Search for "grocery"
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'search': 'grocery'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
        assert 'Grocery shopping' in response_data['results'][0]['description']
    
    def test_search_transactions_by_amount_success(self, authenticated_client, user, category):
        """Test searching transactions by amount."""
        # Create test transactions with different amounts
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction 100',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('50.00'),
            description='Transaction 50',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 14)
        )
        
        # Search for "100"
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'search': '100'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
        assert response_data['results'][0]['amount'] == '100.00'
    
    def test_search_transactions_case_insensitive(self, authenticated_client, user, category):
        """Test that transaction search is case insensitive."""
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='GROCERY Shopping',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Search with lowercase
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'search': 'grocery'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
    
    def test_search_transactions_partial_match(self, authenticated_client, user, category):
        """Test that transaction search supports partial matches."""
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Grocery shopping at Whole Foods',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Search with partial word
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'search': 'shop'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
    
    def test_search_transactions_no_results(self, authenticated_client, user, category):
        """Test searching transactions with no matching results."""
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Grocery shopping',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'search': 'nonexistent'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 0
        assert response_data['results'] == []
    
    def test_search_transactions_user_isolation(self, authenticated_client, user, other_user, category):
        """Test that search only returns current user's transactions."""
        # Create transaction for authenticated user
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='User grocery shopping',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Create transaction for other user
        other_category = Category.objects.create(user=other_user, name='Other Category')
        Transaction.objects.create(
            user=other_user,
            amount=Decimal('200.00'),
            description='Other user grocery shopping',
            category=other_category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'search': 'grocery'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
        assert 'User grocery' in response_data['results'][0]['description']


@pytest.mark.django_db
class TestTransactionDateRangeFiltering:
    """
    Tests for date range filtering functionality.
    """
    
    def test_filter_transactions_by_date_from_success(self, authenticated_client, user, category):
        """Test filtering transactions from a specific date."""
        # Create transactions with different dates
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Old transaction',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 10)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Recent transaction 1',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='Recent transaction 2',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 20)
        )
        
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'date_from': '2024-01-15'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        
        # Verify only transactions from 2024-01-15 onwards are returned
        for transaction in response_data['results']:
            assert transaction['date'] >= '2024-01-15'
    
    def test_filter_transactions_by_date_to_success(self, authenticated_client, user, category):
        """Test filtering transactions up to a specific date."""
        # Create transactions with different dates
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Early transaction 1',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 10)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Early transaction 2',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='Late transaction',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 20)
        )
        
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'date_to': '2024-01-15'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        
        # Verify only transactions up to 2024-01-15 are returned
        for transaction in response_data['results']:
            assert transaction['date'] <= '2024-01-15'
    
    def test_filter_transactions_by_date_range_success(self, authenticated_client, user, category):
        """Test filtering transactions within a specific date range."""
        # Create transactions with different dates
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Before range',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 5)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='In range 1',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 10)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='In range 2',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('400.00'),
            description='After range',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 25)
        )
        
        response = authenticated_client.get(
            reverse('transaction-search'),
            {
                'date_from': '2024-01-10',
                'date_to': '2024-01-15'
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        
        # Verify only transactions within range are returned
        for transaction in response_data['results']:
            assert '2024-01-10' <= transaction['date'] <= '2024-01-15'
    
    def test_filter_transactions_by_amount_range_success(self, authenticated_client, user, category):
        """Test filtering transactions by amount range."""
        # Create transactions with different amounts
        Transaction.objects.create(
            user=user,
            amount=Decimal('50.00'),
            description='Low amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Medium amount 1',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('150.00'),
            description='Medium amount 2',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='High amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get(
            reverse('transaction-search'),
            {
                'amount_min': '100',
                'amount_max': '200'
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        
        # Verify only transactions within amount range are returned
        for transaction in response_data['results']:
            amount = Decimal(transaction['amount'])
            assert Decimal('100.00') <= amount <= Decimal('200.00')
    
    def test_filter_transactions_invalid_date_format(self, authenticated_client, user, category):
        """Test filtering with invalid date format."""
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Test transaction',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'date_from': 'invalid-date'}
        )
        
        # Should return 400 or handle gracefully
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK]


@pytest.mark.django_db
class TestTransactionCategoryFiltering:
    """
    Tests for category-based filtering and sorting.
    """
    
    def test_filter_transactions_by_category_success(self, authenticated_client, user):
        """Test filtering transactions by category."""
        # Create categories
        food_category = Category.objects.create(user=user, name='Food', color='#ff6b6b')
        transport_category = Category.objects.create(user=user, name='Transport', color='#4ecdc4')
        
        # Create transactions with different categories
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Grocery shopping',
            category=food_category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('50.00'),
            description='Bus ticket',
            category=transport_category,
            transaction_type='expense',
            date=date(2024, 1, 14)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Restaurant dinner',
            category=food_category,
            transaction_type='expense',
            date=date(2024, 1, 13)
        )
        
        response = authenticated_client.get(
            reverse('transaction-list'),
            {'category': food_category.id}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        
        # Verify only food category transactions are returned
        for transaction in response_data['results']:
            assert transaction['category_name'] == 'Food'
    
    def test_filter_transactions_by_transaction_type_success(self, authenticated_client, user, category):
        """Test filtering transactions by transaction type."""
        # Create transactions with different types
        Transaction.objects.create(
            user=user,
            amount=Decimal('2500.00'),
            description='Salary',
            category=category,
            transaction_type='income',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Grocery shopping',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 14)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('1000.00'),
            description='Freelance payment',
            category=category,
            transaction_type='income',
            date=date(2024, 1, 13)
        )
        
        response = authenticated_client.get(
            reverse('transaction-list'),
            {'transaction_type': 'income'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        
        # Verify only income transactions are returned
        for transaction in response_data['results']:
            assert transaction['transaction_type'] == 'income'
    
    def test_sort_transactions_by_amount_success(self, authenticated_client, user, category):
        """Test sorting transactions by amount."""
        # Create transactions with different amounts
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='High amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Low amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Medium amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Sort by amount ascending
        response = authenticated_client.get(
            reverse('transaction-list'),
            {'ordering': 'amount'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 3
        
        amounts = [Decimal(t['amount']) for t in response_data['results']]
        assert amounts == sorted(amounts)
    
    def test_sort_transactions_by_amount_descending_success(self, authenticated_client, user, category):
        """Test sorting transactions by amount in descending order."""
        # Create transactions with different amounts
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Low amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='High amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Medium amount',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        
        # Sort by amount descending
        response = authenticated_client.get(
            reverse('transaction-list'),
            {'ordering': '-amount'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 3
        
        amounts = [Decimal(t['amount']) for t in response_data['results']]
        assert amounts == sorted(amounts, reverse=True)
    
    def test_combined_filters_success(self, authenticated_client, user):
        """Test combining multiple filters."""
        # Create categories
        food_category = Category.objects.create(user=user, name='Food', color='#ff6b6b')
        transport_category = Category.objects.create(user=user, name='Transport', color='#4ecdc4')
        
        # Create transactions
        Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Grocery shopping',
            category=food_category,
            transaction_type='expense',
            date=date(2024, 1, 15)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('50.00'),
            description='Bus ticket',
            category=transport_category,
            transaction_type='expense',
            date=date(2024, 1, 14)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Restaurant dinner',
            category=food_category,
            transaction_type='expense',
            date=date(2024, 1, 10)
        )
        
        # Filter by category and date range
        response = authenticated_client.get(
            reverse('transaction-search'),
            {
                'category': food_category.id,
                'date_from': '2024-01-12'
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
        assert response_data['results'][0]['description'] == 'Grocery shopping'


@pytest.mark.django_db
class TestTransactionRunningBalance:
    """
    Tests for running balance calculations and totals.
    """
    
    def test_transaction_list_with_running_balance_success(self, authenticated_client, user, category):
        """Test that transaction list includes running balance calculations."""
        # Create transactions in chronological order
        Transaction.objects.create(
            user=user,
            amount=Decimal('1000.00'),
            description='Initial income',
            category=category,
            transaction_type='income',
            date=date(2024, 1, 1)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Expense 1',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 5)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='Expense 2',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 10)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('500.00'),
            description='Additional income',
            category=category,
            transaction_type='income',
            date=date(2024, 1, 15)
        )
        
        response = authenticated_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 4
        
        # Verify running balance is included in response
        assert 'summary' in response_data
        summary = response_data['summary']
        assert 'total_income' in summary
        assert 'total_expenses' in summary
        assert 'net_balance' in summary
        assert 'running_balance' in summary
        
        # Verify calculations
        assert summary['total_income'] == '1500.00'  # 1000 + 500
        assert summary['total_expenses'] == '500.00'  # 200 + 300
        assert summary['net_balance'] == '1000.00'  # 1500 - 500
    
    def test_transaction_search_with_running_balance_success(self, authenticated_client, user, category):
        """Test that transaction search includes running balance for filtered results."""
        # Create transactions
        Transaction.objects.create(
            user=user,
            amount=Decimal('1000.00'),
            description='Salary income',
            category=category,
            transaction_type='income',
            date=date(2024, 1, 1)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('200.00'),
            description='Grocery expense',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 5)
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal('300.00'),
            description='Restaurant expense',
            category=category,
            transaction_type='expense',
            date=date(2024, 1, 10)
        )
        
        # Search for expenses only
        response = authenticated_client.get(
            reverse('transaction-search'),
            {'transaction_type': 'expense'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 2
        
        # Verify summary for filtered results
        assert 'summary' in response_data
        summary = response_data['summary']
        assert summary['total_income'] == '0.00'  # No income in filtered results
        assert summary['total_expenses'] == '500.00'  # 200 + 300
        assert summary['net_balance'] == '-500.00'  # 0 - 500
    
    def test_running_balance_user_isolation(self, authenticated_client, user, other_user, category):
        """Test that running balance calculations only include current user's transactions."""
        # Create transaction for authenticated user
        Transaction.objects.create(
            user=user,
            amount=Decimal('1000.00'),
            description='User income',
            category=category,
            transaction_type='income',
            date=date(2024, 1, 1)
        )
        
        # Create transaction for other user
        other_category = Category.objects.create(user=other_user, name='Other Category')
        Transaction.objects.create(
            user=other_user,
            amount=Decimal('5000.00'),
            description='Other user income',
            category=other_category,
            transaction_type='income',
            date=date(2024, 1, 1)
        )
        
        response = authenticated_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 1
        
        # Verify summary only includes current user's data
        summary = response_data['summary']
        assert summary['total_income'] == '1000.00'  # Only user's income
        assert summary['net_balance'] == '1000.00'
    
    def test_empty_transactions_running_balance(self, authenticated_client):
        """Test running balance calculations with no transactions."""
        response = authenticated_client.get(reverse('transaction-list'))
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data['count'] == 0
        
        # Verify summary with zero values
        assert 'summary' in response_data
        summary = response_data['summary']
        assert summary['total_income'] == '0.00'
        assert summary['total_expenses'] == '0.00'
        assert summary['net_balance'] == '0.00'


@pytest.mark.django_db
class TestTransactionIntegration:
    """
    Integration tests for transaction CRUD operations with authentication and database integrity.
    """
    
    def test_complete_transaction_crud_workflow(self, authenticated_client, user, category):
        """Test complete CRUD workflow for transactions."""
        # CREATE
        create_data = {
            'amount': '125.75',
            'description': 'Initial transaction',
            'category_id': category.id,
            'transaction_type': 'expense',
            'date': '2024-01-15'
        }
        
        create_response = authenticated_client.post(
            reverse('transaction-list'),
            data=create_data,
            format='json'
        )
        
        assert create_response.status_code == status.HTTP_201_CREATED
        transaction_id = create_response.json()['id']
        
        # READ (List)
        list_response = authenticated_client.get(reverse('transaction-list'))
        assert list_response.status_code == status.HTTP_200_OK
        assert list_response.json()['count'] == 1
        
        # READ (Detail)
        detail_response = authenticated_client.get(
            reverse('transaction-detail', kwargs={'pk': transaction_id})
        )
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.json()['id'] == transaction_id
        
        # UPDATE
        update_data = {
            'amount': '200.00',
            'description': 'Updated transaction'
        }
        
        update_response = authenticated_client.patch(
            reverse('transaction-detail', kwargs={'pk': transaction_id}),
            data=update_data,
            format='json'
        )
        
        assert update_response.status_code == status.HTTP_200_OK
        assert update_response.json()['amount'] == '200.00'
        assert update_response.json()['description'] == 'Updated transaction'
        
        # DELETE
        delete_response = authenticated_client.delete(
            reverse('transaction-detail', kwargs={'pk': transaction_id})
        )
        
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify deletion
        final_list_response = authenticated_client.get(reverse('transaction-list'))
        assert final_list_response.json()['count'] == 0
    
    def test_transaction_database_integrity_with_user_deletion(self, authenticated_client, user, category):
        """Test that transactions are properly cleaned up when user is deleted."""
        # Create transaction
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction for deletion test',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        transaction_id = transaction.id
        
        # Verify transaction exists
        assert Transaction.objects.filter(id=transaction_id).exists()
        
        # Delete user (should cascade delete transactions)
        user.delete()
        
        # Verify transaction is deleted
        assert not Transaction.objects.filter(id=transaction_id).exists()
    
    def test_transaction_database_integrity_with_category_deletion(self, authenticated_client, user, category):
        """Test that transactions handle category deletion properly (set to NULL)."""
        # Create transaction with category
        transaction = Transaction.objects.create(
            user=user,
            amount=Decimal('100.00'),
            description='Transaction with category',
            category=category,
            transaction_type='expense',
            date=date.today()
        )
        
        # Delete category
        category.delete()
        
        # Verify transaction still exists but category is NULL
        transaction.refresh_from_db()
        assert transaction.category is None
        assert transaction.description == 'Transaction with category'
    
    def test_concurrent_transaction_operations(self, authenticated_client, user, category):
        """Test that concurrent transaction operations maintain data integrity."""
        # Create multiple transactions rapidly
        transactions = []
        for i in range(10):
            create_data = {
                'amount': f'{i + 1}.00',
                'description': f'Concurrent transaction {i + 1}',
                'category_id': category.id,
                'transaction_type': 'expense',
                'date': date.today().isoformat()
            }
            
            response = authenticated_client.post(
                reverse('transaction-list'),
                data=create_data,
                format='json'
            )
            
            assert response.status_code == status.HTTP_201_CREATED
            transactions.append(response.json()['id'])
        
        # Verify all transactions were created
        list_response = authenticated_client.get(reverse('transaction-list'))
        assert list_response.json()['count'] == 10
        
        # Update and delete some transactions concurrently
        for i, transaction_id in enumerate(transactions[:5]):
            # Update
            update_response = authenticated_client.patch(
                reverse('transaction-detail', kwargs={'pk': transaction_id}),
                data={'description': f'Updated transaction {i + 1}'},
                format='json'
            )
            assert update_response.status_code == status.HTTP_200_OK
        
        for transaction_id in transactions[5:]:
            # Delete
            delete_response = authenticated_client.delete(
                reverse('transaction-detail', kwargs={'pk': transaction_id})
            )
            assert delete_response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify final state
        final_list_response = authenticated_client.get(reverse('transaction-list'))
        assert final_list_response.json()['count'] == 5
        
        # Verify updates were applied
        for result in final_list_response.json()['results']:
            assert 'Updated transaction' in result['description']