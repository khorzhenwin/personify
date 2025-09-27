"""
Tests for smart categorization system.
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta

from .models import Category, Transaction
from .services import CategorySuggestionService

User = get_user_model()


class CategorySuggestionServiceTest(TestCase):
    """
    Test cases for category suggestion based on description patterns.
    """
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create test categories
        self.grocery_category = Category.objects.create(
            user=self.user,
            name='Groceries',
            description='Food and household items'
        )
        
        self.transport_category = Category.objects.create(
            user=self.user,
            name='Transportation',
            description='Travel and commute expenses'
        )
        
        self.restaurant_category = Category.objects.create(
            user=self.user,
            name='Dining Out',
            description='Restaurant and takeout expenses'
        )
        
        self.entertainment_category = Category.objects.create(
            user=self.user,
            name='Entertainment',
            description='Movies, games, and fun activities'
        )
    
    def test_suggest_category_for_grocery_keywords(self):
        """Test category suggestion for grocery-related descriptions."""
        test_cases = [
            'Walmart grocery shopping',
            'Supermarket purchase',
            'Fresh produce from market',
            'Milk and bread from store',
            'Weekly grocery run'
        ]
        
        for description in test_cases:
            suggested_category = CategorySuggestionService.suggest_category(
                self.user, description
            )
            self.assertEqual(
                suggested_category, 
                self.grocery_category,
                f"Failed to suggest grocery category for: {description}"
            )
    
    def test_suggest_category_for_transport_keywords(self):
        """Test category suggestion for transportation-related descriptions."""
        test_cases = [
            'Uber ride to airport',
            'Gas station fill up',
            'Bus ticket purchase',
            'Taxi fare downtown',
            'Metro card refill',
            'Parking fee at mall'
        ]
        
        for description in test_cases:
            suggested_category = CategorySuggestionService.suggest_category(
                self.user, description
            )
            self.assertEqual(
                suggested_category, 
                self.transport_category,
                f"Failed to suggest transport category for: {description}"
            )
    
    def test_suggest_category_for_restaurant_keywords(self):
        """Test category suggestion for dining-related descriptions."""
        test_cases = [
            'Dinner at Italian restaurant',
            'McDonald\'s lunch',
            'Pizza delivery order',
            'Coffee shop visit',
            'Takeout from Chinese place'
        ]
        
        for description in test_cases:
            suggested_category = CategorySuggestionService.suggest_category(
                self.user, description
            )
            self.assertEqual(
                suggested_category, 
                self.restaurant_category,
                f"Failed to suggest restaurant category for: {description}"
            )
    
    def test_suggest_category_for_entertainment_keywords(self):
        """Test category suggestion for entertainment-related descriptions."""
        test_cases = [
            'Movie tickets for weekend',
            'Netflix subscription',
            'Concert tickets purchase',
            'Video game from Steam',
            'Theme park admission'
        ]
        
        for description in test_cases:
            suggested_category = CategorySuggestionService.suggest_category(
                self.user, description
            )
            self.assertEqual(
                suggested_category, 
                self.entertainment_category,
                f"Failed to suggest entertainment category for: {description}"
            )
    
    def test_suggest_category_returns_none_for_unknown_patterns(self):
        """Test that unknown descriptions return None."""
        unknown_descriptions = [
            'Random expense item',
            'Miscellaneous purchase',
            'Unknown transaction'
        ]
        
        for description in unknown_descriptions:
            suggested_category = CategorySuggestionService.suggest_category(
                self.user, description
            )
            self.assertIsNone(
                suggested_category,
                f"Should return None for unknown description: {description}"
            )
    
    def test_suggest_category_case_insensitive(self):
        """Test that category suggestion is case insensitive."""
        test_cases = [
            'WALMART GROCERY SHOPPING',
            'uber ride to airport',
            'McDonald\'S LUNCH',
            'movie TICKETS for weekend'
        ]
        
        expected_categories = [
            self.grocery_category,
            self.transport_category,
            self.restaurant_category,
            self.entertainment_category
        ]
        
        for description, expected in zip(test_cases, expected_categories):
            suggested_category = CategorySuggestionService.suggest_category(
                self.user, description
            )
            self.assertEqual(
                suggested_category, 
                expected,
                f"Case insensitive matching failed for: {description}"
            )
    
    def test_suggest_category_with_partial_matches(self):
        """Test category suggestion with partial keyword matches."""
        test_cases = [
            ('Groceries and household items', self.grocery_category),
            ('Transportation to work', self.transport_category),
            ('Restaurant bill payment', self.restaurant_category),
            ('Entertainment expenses', self.entertainment_category)
        ]
        
        for description, expected_category in test_cases:
            suggested_category = CategorySuggestionService.suggest_category(
                self.user, description
            )
            self.assertEqual(
                suggested_category, 
                expected_category,
                f"Partial matching failed for: {description}"
            )
    
    def test_suggest_category_user_isolation(self):
        """Test that category suggestions are isolated per user."""
        # Create another user with different categories
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='User'
        )
        
        other_category = Category.objects.create(
            user=other_user,
            name='Work Expenses',
            description='Business related expenses'
        )
        
        # Test that grocery description doesn't suggest other user's category
        suggested_category = CategorySuggestionService.suggest_category(
            self.user, 'Walmart grocery shopping'
        )
        
        self.assertEqual(suggested_category, self.grocery_category)
        self.assertNotEqual(suggested_category, other_category)
    
    def test_suggest_category_with_historical_transactions(self):
        """Test category suggestion based on historical transaction patterns."""
        # Create historical transactions with specific patterns
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('50.00'),
            description='Starbucks coffee',
            category=self.restaurant_category,
            transaction_type='expense',
            date=date.today() - timedelta(days=30)
        )
        
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('25.00'),
            description='Starbucks morning coffee',
            category=self.restaurant_category,
            transaction_type='expense',
            date=date.today() - timedelta(days=15)
        )
        
        # Test that new Starbucks transaction suggests restaurant category
        suggested_category = CategorySuggestionService.suggest_category_with_history(
            self.user, 'Starbucks afternoon coffee'
        )
        
        self.assertEqual(suggested_category, self.restaurant_category)


class CategoryCRUDTest(TestCase):
    """
    Test cases for category CRUD operations with user isolation.
    """
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        # Create test users
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='testpass123',
            first_name='User',
            last_name='One'
        )
        
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='testpass123',
            first_name='User',
            last_name='Two'
        )
        
        # Create test categories for user1
        self.category1 = Category.objects.create(
            user=self.user1,
            name='Groceries',
            description='Food and household items',
            color='#FF5733'
        )
        
        self.category2 = Category.objects.create(
            user=self.user1,
            name='Transportation',
            description='Travel expenses'
        )
        
        # Create test category for user2
        self.category3 = Category.objects.create(
            user=self.user2,
            name='Entertainment',
            description='Fun activities'
        )
    
    def test_create_category_success(self):
        """Test successful category creation."""
        self.client.force_authenticate(user=self.user1)
        
        data = {
            'name': 'Dining Out',
            'description': 'Restaurant expenses',
            'color': '#33FF57'
        }
        
        response = self.client.post('/api/categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Dining Out')
        self.assertEqual(response.data['description'], 'Restaurant expenses')
        self.assertEqual(response.data['color'], '#33FF57')
        
        # Verify category was created in database
        category = Category.objects.get(id=response.data['id'])
        self.assertEqual(category.user, self.user1)
        self.assertEqual(category.name, 'Dining Out')
    
    def test_create_category_duplicate_name_fails(self):
        """Test that creating category with duplicate name fails."""
        self.client.force_authenticate(user=self.user1)
        
        data = {
            'name': 'Groceries',  # Already exists for user1
            'description': 'Another grocery category'
        }
        
        response = self.client.post('/api/categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_create_category_same_name_different_users_success(self):
        """Test that different users can have categories with same name."""
        self.client.force_authenticate(user=self.user2)
        
        data = {
            'name': 'Groceries',  # Same name as user1's category
            'description': 'User2 grocery category'
        }
        
        response = self.client.post('/api/categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Groceries')
        
        # Verify both categories exist
        user1_categories = Category.objects.filter(user=self.user1, name='Groceries')
        user2_categories = Category.objects.filter(user=self.user2, name='Groceries')
        
        self.assertEqual(user1_categories.count(), 1)
        self.assertEqual(user2_categories.count(), 1)
    
    def test_list_categories_user_isolation(self):
        """Test that users only see their own categories."""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/categories/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if response has results key (paginated) or is direct list
        if 'results' in response.data:
            categories = response.data['results']
        else:
            categories = response.data
            
        self.assertEqual(len(categories), 2)  # user1 has 2 categories
        
        category_names = [cat['name'] for cat in categories]
        self.assertIn('Groceries', category_names)
        self.assertIn('Transportation', category_names)
        self.assertNotIn('Entertainment', category_names)  # user2's category
    
    def test_retrieve_category_success(self):
        """Test successful category retrieval."""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get(f'/api/categories/{self.category1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Groceries')
        self.assertEqual(response.data['description'], 'Food and household items')
        self.assertEqual(response.data['color'], '#FF5733')
    
    def test_retrieve_other_user_category_fails(self):
        """Test that users cannot retrieve other users' categories."""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get(f'/api/categories/{self.category3.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_category_success(self):
        """Test successful category update."""
        self.client.force_authenticate(user=self.user1)
        
        data = {
            'name': 'Food & Groceries',
            'description': 'Updated description',
            'color': '#FF9933'
        }
        
        response = self.client.put(f'/api/categories/{self.category1.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Food & Groceries')
        self.assertEqual(response.data['description'], 'Updated description')
        self.assertEqual(response.data['color'], '#FF9933')
        
        # Verify database was updated
        self.category1.refresh_from_db()
        self.assertEqual(self.category1.name, 'Food & Groceries')
    
    def test_update_other_user_category_fails(self):
        """Test that users cannot update other users' categories."""
        self.client.force_authenticate(user=self.user1)
        
        data = {'name': 'Hacked Category'}
        
        response = self.client.put(f'/api/categories/{self.category3.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_category_success(self):
        """Test successful category deletion."""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.delete(f'/api/categories/{self.category2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify category was deleted
        self.assertFalse(
            Category.objects.filter(id=self.category2.id).exists()
        )
    
    def test_delete_other_user_category_fails(self):
        """Test that users cannot delete other users' categories."""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.delete(f'/api/categories/{self.category3.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify category still exists
        self.assertTrue(
            Category.objects.filter(id=self.category3.id).exists()
        )
    
    def test_create_category_requires_authentication(self):
        """Test that category creation requires authentication."""
        data = {'name': 'Test Category'}
        
        response = self.client.post('/api/categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_category_validation_empty_name(self):
        """Test category validation with empty name."""
        self.client.force_authenticate(user=self.user1)
        
        data = {
            'name': '',
            'description': 'Test description'
        }
        
        response = self.client.post('/api/categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_category_validation_long_name(self):
        """Test category validation with name too long."""
        self.client.force_authenticate(user=self.user1)
        
        data = {
            'name': 'A' * 101,  # Exceeds 100 character limit
            'description': 'Test description'
        }
        
        response = self.client.post('/api/categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)


class CategoryAssignmentTest(TestCase):
    """
    Test cases for category assignment and reassignment to transactions.
    """
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create test categories
        self.grocery_category = Category.objects.create(
            user=self.user,
            name='Groceries',
            description='Food and household items'
        )
        
        self.transport_category = Category.objects.create(
            user=self.user,
            name='Transportation',
            description='Travel expenses'
        )
        
        # Create test transactions
        self.transaction1 = Transaction.objects.create(
            user=self.user,
            amount=Decimal('50.00'),
            description='Walmart grocery shopping',
            transaction_type='expense',
            date=date.today()
        )
        
        self.transaction2 = Transaction.objects.create(
            user=self.user,
            amount=Decimal('25.00'),
            description='Uber ride',
            category=self.transport_category,
            transaction_type='expense',
            date=date.today()
        )
    
    def test_assign_category_to_uncategorized_transaction(self):
        """Test assigning category to transaction without category."""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'category': self.grocery_category.id
        }
        
        response = self.client.patch(
            f'/api/transactions/{self.transaction1.id}/', 
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['category'], self.grocery_category.id)
        self.assertEqual(response.data['category_name'], 'Groceries')
        
        # Verify database was updated
        self.transaction1.refresh_from_db()
        self.assertEqual(self.transaction1.category, self.grocery_category)
    
    def test_reassign_category_to_categorized_transaction(self):
        """Test reassigning category to transaction that already has one."""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'category': self.grocery_category.id
        }
        
        response = self.client.patch(
            f'/api/transactions/{self.transaction2.id}/', 
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['category'], self.grocery_category.id)
        self.assertEqual(response.data['category_name'], 'Groceries')
        
        # Verify database was updated
        self.transaction2.refresh_from_db()
        self.assertEqual(self.transaction2.category, self.grocery_category)
    
    def test_remove_category_from_transaction(self):
        """Test removing category from transaction."""
        self.client.force_authenticate(user=self.user)
        
        # Use empty string instead of None for PATCH data
        data = {
            'category': ''
        }
        
        response = self.client.patch(
            f'/api/transactions/{self.transaction2.id}/', 
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])
        self.assertIsNone(response.data['category_name'])
        
        # Verify database was updated
        self.transaction2.refresh_from_db()
        self.assertIsNone(self.transaction2.category)
    
    def test_assign_other_user_category_fails(self):
        """Test that assigning other user's category fails."""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='User'
        )
        
        other_category = Category.objects.create(
            user=other_user,
            name='Other Category',
            description='Other user category'
        )
        
        self.client.force_authenticate(user=self.user)
        
        data = {
            'category': other_category.id
        }
        
        response = self.client.patch(
            f'/api/transactions/{self.transaction1.id}/', 
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category', response.data)
    
    def test_bulk_category_assignment(self):
        """Test bulk category assignment to multiple transactions."""
        # Create additional transactions
        transaction3 = Transaction.objects.create(
            user=self.user,
            amount=Decimal('30.00'),
            description='Supermarket visit',
            transaction_type='expense',
            date=date.today()
        )
        
        transaction4 = Transaction.objects.create(
            user=self.user,
            amount=Decimal('15.00'),
            description='Grocery store',
            transaction_type='expense',
            date=date.today()
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Assign grocery category to multiple transactions
        transaction_ids = [self.transaction1.id, transaction3.id, transaction4.id]
        
        for transaction_id in transaction_ids:
            data = {'category': self.grocery_category.id}
            response = self.client.patch(f'/api/transactions/{transaction_id}/', data)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify all transactions have the grocery category
        for transaction_id in transaction_ids:
            transaction = Transaction.objects.get(id=transaction_id)
            self.assertEqual(transaction.category, self.grocery_category)
    
    def test_category_assignment_with_auto_suggestion(self):
        """Test category assignment with automatic suggestion."""
        self.client.force_authenticate(user=self.user)
        
        # Create transaction with description that should suggest grocery category
        data = {
            'amount': '45.00',
            'description': 'Walmart grocery shopping',
            'transaction_type': 'expense',
            'date': date.today().isoformat()
        }
        
        response = self.client.post('/api/transactions/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check if category was auto-suggested (this will be implemented in the service)
        transaction = Transaction.objects.get(id=response.data['id'])
        
        # For now, we'll test the manual assignment
        # Auto-suggestion will be tested separately in the service tests
        self.assertIsNone(transaction.category)  # No auto-assignment yet
    
    def test_transaction_category_consistency_after_category_deletion(self):
        """Test transaction behavior when assigned category is deleted."""
        self.client.force_authenticate(user=self.user)
        
        # Assign category to transaction
        self.transaction1.category = self.grocery_category
        self.transaction1.save()
        
        # Delete the category
        response = self.client.delete(f'/api/categories/{self.grocery_category.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify transaction category is set to null (due to SET_NULL)
        self.transaction1.refresh_from_db()
        self.assertIsNone(self.transaction1.category)
    
    def test_category_transaction_count(self):
        """Test that category shows correct transaction count."""
        # Assign categories to transactions
        self.transaction1.category = self.grocery_category
        self.transaction1.save()
        
        self.transaction2.category = self.transport_category
        self.transaction2.save()
        
        # Create additional grocery transaction
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('35.00'),
            description='Another grocery trip',
            category=self.grocery_category,
            transaction_type='expense',
            date=date.today()
        )
        
        # Test transaction counts
        grocery_count = self.grocery_category.transactions.count()
        transport_count = self.transport_category.transactions.count()
        
        self.assertEqual(grocery_count, 2)
        self.assertEqual(transport_count, 1)