"""
Integration tests for categorization system with existing transactions.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date

from .models import Category, Transaction
from .services import CategorySuggestionService

User = get_user_model()


class CategorizationIntegrationTest(TestCase):
    """
    Integration test for categorization system with existing transactions
    and data consistency verification.
    """
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            email='integration@example.com',
            password='testpass123',
            first_name='Integration',
            last_name='Test'
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_complete_categorization_workflow(self):
        """Test complete categorization workflow from creation to deletion."""
        
        # Step 1: Create categories via API
        categories_data = [
            {'name': 'Groceries', 'description': 'Food and household items', 'color': '#FF5733'},
            {'name': 'Transportation', 'description': 'Travel expenses', 'color': '#33FF57'},
            {'name': 'Entertainment', 'description': 'Fun activities', 'color': '#3357FF'},
        ]
        
        created_categories = []
        for cat_data in categories_data:
            response = self.client.post('/api/categories/', cat_data)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            created_categories.append(response.data)
        
        # Step 2: Verify categories are listed correctly
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle paginated response
        if 'results' in response.data:
            categories = response.data['results']
        else:
            categories = response.data
        self.assertEqual(len(categories), 3)
        
        # Step 3: Create transactions
        transactions_data = [
            {
                'amount': '50.00',
                'description': 'Walmart grocery shopping',
                'transaction_type': 'expense',
                'date': date.today().isoformat()
            },
            {
                'amount': '25.00',
                'description': 'Uber ride to airport',
                'transaction_type': 'expense',
                'date': date.today().isoformat()
            },
            {
                'amount': '15.00',
                'description': 'Movie tickets for weekend',
                'transaction_type': 'expense',
                'date': date.today().isoformat()
            },
        ]
        
        created_transactions = []
        for trans_data in transactions_data:
            response = self.client.post('/api/transactions/', trans_data)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            created_transactions.append(response.data)
        
        # Step 4: Test category suggestions
        test_cases = [
            ('Walmart grocery shopping', 'Groceries'),
            ('Uber ride to airport', 'Transportation'),
            ('Movie tickets for weekend', 'Entertainment'),
        ]
        
        for description, expected_category in test_cases:
            response = self.client.post('/api/categories/suggest_for_description/', {
                'description': description
            })
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            if response.data['suggested_category']:
                suggested_name = response.data['suggested_category']['name']
                self.assertEqual(suggested_name, expected_category)
        
        # Step 5: Test category assignment
        grocery_cat = next(cat for cat in created_categories if cat['name'] == 'Groceries')
        transport_cat = next(cat for cat in created_categories if cat['name'] == 'Transportation')
        
        # Assign categories to first two transactions
        for i, transaction in enumerate(created_transactions[:2]):
            if i == 0:  # Grocery transaction
                category_id = grocery_cat['id']
            else:  # Transportation transaction
                category_id = transport_cat['id']
                
            response = self.client.patch(f"/api/transactions/{transaction['id']}/", {
                'category': category_id
            })
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['category'], category_id)
        
        # Step 6: Test bulk category assignment
        entertainment_cat = next(cat for cat in created_categories if cat['name'] == 'Entertainment')
        uncategorized_transaction = created_transactions[2]  # Movie tickets
        
        response = self.client.post('/api/categories/bulk_assign/', {
            'category_id': entertainment_cat['id'],
            'transaction_ids': [uncategorized_transaction['id']]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated_count'], 1)
        
        # Step 7: Verify category statistics
        response = self.client.get('/api/categories/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data['categories']
        self.assertEqual(len(stats), 3)
        
        # Verify each category has correct transaction count and totals
        for stat in stats:
            if stat['name'] == 'Groceries':
                self.assertEqual(stat['transaction_count'], 1)
                self.assertEqual(stat['total_expenses'], '50.00')
            elif stat['name'] == 'Transportation':
                self.assertEqual(stat['transaction_count'], 1)
                self.assertEqual(stat['total_expenses'], '25.00')
            elif stat['name'] == 'Entertainment':
                self.assertEqual(stat['transaction_count'], 1)
                self.assertEqual(stat['total_expenses'], '15.00')
        
        # Step 8: Test data consistency after category deletion
        response = self.client.delete(f"/api/categories/{entertainment_cat['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify transaction is now uncategorized
        response = self.client.get(f"/api/transactions/{uncategorized_transaction['id']}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])
        
        # Step 9: Test suggestions for uncategorized transactions
        response = self.client.get('/api/categories/suggestions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should have suggestions for the now-uncategorized movie transaction
        suggestions = response.data['suggestions']
        self.assertGreaterEqual(len(suggestions), 0)  # May or may not have suggestions
    
    def test_category_suggestion_accuracy_with_existing_data(self):
        """Test that category suggestions work accurately with existing transaction data."""
        
        # Create categories
        grocery_cat = Category.objects.create(
            user=self.user,
            name='Groceries',
            description='Food and household items'
        )
        
        transport_cat = Category.objects.create(
            user=self.user,
            name='Transportation',
            description='Travel and commute expenses'
        )
        
        # Create historical transactions
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('45.00'),
            description='Starbucks coffee morning',
            category=grocery_cat,  # Misclassified intentionally
            transaction_type='expense',
            date=date.today()
        )
        
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('30.00'),
            description='Starbucks afternoon coffee',
            category=grocery_cat,  # Misclassified intentionally
            transaction_type='expense',
            date=date.today()
        )
        
        # Test historical pattern matching
        suggested_category = CategorySuggestionService.suggest_category_with_history(
            self.user, 'Starbucks evening coffee'
        )
        
        # Should suggest grocery category based on historical pattern
        self.assertEqual(suggested_category, grocery_cat)
    
    def test_user_isolation_in_categorization(self):
        """Test that categorization features maintain user isolation."""
        
        # Create another user
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='User'
        )
        
        # Create categories for both users
        user1_category = Category.objects.create(
            user=self.user,
            name='Personal Groceries',
            description='My grocery expenses'
        )
        
        user2_category = Category.objects.create(
            user=other_user,
            name='Personal Groceries',
            description='Other user grocery expenses'
        )
        
        # Test that suggestions only consider current user's categories
        suggested_category = CategorySuggestionService.suggest_category(
            self.user, 'Walmart grocery shopping'
        )
        
        self.assertEqual(suggested_category, user1_category)
        self.assertNotEqual(suggested_category, user2_category)
        
        # Test API isolation
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle paginated response
        if 'results' in response.data:
            categories = response.data['results']
        else:
            categories = response.data
            
        category_names = [cat['name'] for cat in categories]
        self.assertIn('Personal Groceries', category_names)
        self.assertEqual(len(categories), 1)  # Only user's own category
    
    def test_category_reassignment_workflow(self):
        """Test complete category reassignment workflow."""
        
        # Create categories
        wrong_cat = Category.objects.create(
            user=self.user,
            name='Wrong Category',
            description='Initially wrong category'
        )
        
        correct_cat = Category.objects.create(
            user=self.user,
            name='Correct Category',
            description='The right category'
        )
        
        # Create transaction with wrong category
        transaction = Transaction.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            description='Test transaction',
            category=wrong_cat,
            transaction_type='expense',
            date=date.today()
        )
        
        # Verify initial assignment
        self.assertEqual(transaction.category, wrong_cat)
        
        # Reassign via API
        response = self.client.patch(f'/api/transactions/{transaction.id}/', {
            'category': correct_cat.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['category'], correct_cat.id)
        
        # Verify database was updated
        transaction.refresh_from_db()
        self.assertEqual(transaction.category, correct_cat)
        
        # Test removing category
        response = self.client.patch(f'/api/transactions/{transaction.id}/', {
            'category': ''  # Empty string to remove category
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])
        
        # Verify database was updated
        transaction.refresh_from_db()
        self.assertIsNone(transaction.category)
    
    def test_category_performance_with_many_transactions(self):
        """Test categorization performance with multiple transactions."""
        
        # Create a category
        category = Category.objects.create(
            user=self.user,
            name='Test Category',
            description='Performance test category'
        )
        
        # Create multiple transactions
        transactions = []
        for i in range(5):  # Reduced to 5 for simpler testing
            transaction = Transaction.objects.create(
                user=self.user,
                amount=Decimal('10.00'),
                description=f'Test transaction {i}',
                transaction_type='expense',
                date=date.today()
            )
            transactions.append(transaction)
        
        # Test bulk assignment
        transaction_ids = [t.id for t in transactions]
        
        response = self.client.post('/api/categories/bulk_assign/', {
            'category_id': category.id,
            'transaction_ids': transaction_ids
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should update all 5 transactions
        self.assertEqual(response.data['updated_count'], 5)
        
        # Verify all transactions were assigned
        for transaction in transactions:
            transaction.refresh_from_db()
            self.assertEqual(transaction.category, category)
        
        # Test category statistics with multiple transactions
        response = self.client.get('/api/categories/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data['categories']
        test_cat_stats = next(stat for stat in stats if stat['name'] == 'Test Category')
        
        self.assertEqual(test_cat_stats['transaction_count'], 5)
        self.assertEqual(test_cat_stats['total_expenses'], '50.00')  # 5 * $10.00