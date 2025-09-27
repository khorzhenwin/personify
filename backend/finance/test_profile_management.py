"""
Tests for profile management functionality.
"""
import json
import zipfile
from io import BytesIO
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal
from datetime import date

from .models import Category, Transaction, Budget

User = get_user_model()


class ProfileManagementTestCase(TestCase):
    """
    Test cases for profile management functionality.
    """
    
    def setUp(self):
        """
        Set up test data.
        """
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Generate JWT token for authentication
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create test data
        self.category = Category.objects.create(
            user=self.user,
            name='Food',
            description='Food expenses',
            color='#FF5733'
        )
        
        self.transaction = Transaction.objects.create(
            user=self.user,
            amount=Decimal('50.00'),
            description='Grocery shopping',
            transaction_type='expense',
            category=self.category,
            date=date.today()
        )
        
        self.budget = Budget.objects.create(
            user=self.user,
            category=self.category,
            amount=Decimal('500.00'),
            month=date.today().replace(day=1)  # First day of current month
        )
    
    def test_profile_update_success(self):
        """
        Test successful profile update.
        """
        url = reverse('auth-profile-update')
        data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Profile updated successfully.')
        self.assertEqual(response.data['user']['first_name'], 'Updated')
        self.assertEqual(response.data['user']['last_name'], 'Name')
        
        # Verify user was updated in database
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'Name')
    
    def test_profile_update_validation_error(self):
        """
        Test profile update with validation errors.
        """
        url = reverse('auth-profile-update')
        data = {
            'first_name': '',  # Empty first name should fail
            'last_name': 'Name'
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('first_name', response.data)
    
    def test_profile_update_unauthenticated(self):
        """
        Test profile update without authentication.
        """
        self.client.credentials()  # Remove authentication
        url = reverse('auth-profile-update')
        data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_change_password_success(self):
        """
        Test successful password change.
        """
        url = reverse('auth-change-password')
        data = {
            'current_password': 'testpass123',
            'new_password': 'newpass456',
            'new_password_confirm': 'newpass456'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Password changed successfully.')
        
        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass456'))
    
    def test_change_password_wrong_current_password(self):
        """
        Test password change with wrong current password.
        """
        url = reverse('auth-change-password')
        data = {
            'current_password': 'wrongpass',
            'new_password': 'newpass456',
            'new_password_confirm': 'newpass456'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_password', response.data)
    
    def test_change_password_mismatch(self):
        """
        Test password change with mismatched new passwords.
        """
        url = reverse('auth-change-password')
        data = {
            'current_password': 'testpass123',
            'new_password': 'newpass456',
            'new_password_confirm': 'differentpass'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
    
    def test_change_password_same_as_current(self):
        """
        Test password change with same password as current.
        """
        url = reverse('auth-change-password')
        data = {
            'current_password': 'testpass123',
            'new_password': 'testpass123',
            'new_password_confirm': 'testpass123'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
    
    def test_export_data_csv_format(self):
        """
        Test data export in CSV format.
        """
        url = reverse('auth-export-data')
        data = {
            'format': 'csv',
            'include_categories': True,
            'include_budgets': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/zip')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Verify zip file contains expected files
        zip_content = BytesIO(response.content)
        with zipfile.ZipFile(zip_content, 'r') as zip_file:
            file_names = zip_file.namelist()
            self.assertIn('transactions.csv', file_names)
            self.assertIn('categories.csv', file_names)
            self.assertIn('budgets.csv', file_names)
            
            # Check transactions CSV content
            transactions_csv = zip_file.read('transactions.csv').decode('utf-8')
            self.assertIn('Grocery shopping', transactions_csv)
            self.assertIn('50.00', transactions_csv)
    
    def test_export_data_json_format(self):
        """
        Test data export in JSON format.
        """
        url = reverse('auth-export-data')
        data = {
            'format': 'json',
            'include_categories': True,
            'include_budgets': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Parse JSON response
        export_data = json.loads(response.content)
        
        # Verify structure and content
        self.assertIn('export_date', export_data)
        self.assertIn('transactions', export_data)
        self.assertIn('categories', export_data)
        self.assertIn('budgets', export_data)
        
        # Check transaction data
        self.assertEqual(len(export_data['transactions']), 1)
        transaction_data = export_data['transactions'][0]
        self.assertEqual(transaction_data['description'], 'Grocery shopping')
        self.assertEqual(transaction_data['amount'], '50.00')
        
        # Check category data
        self.assertEqual(len(export_data['categories']), 1)
        category_data = export_data['categories'][0]
        self.assertEqual(category_data['name'], 'Food')
        
        # Check budget data
        self.assertEqual(len(export_data['budgets']), 1)
        budget_data = export_data['budgets'][0]
        self.assertEqual(budget_data['amount'], '500.00')
    
    def test_export_data_with_date_filter(self):
        """
        Test data export with date filtering.
        """
        # Create transaction with different date
        from datetime import timedelta
        old_date = date.today() - timedelta(days=30)
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('25.00'),
            description='Old transaction',
            transaction_type='expense',
            category=self.category,
            date=old_date
        )
        
        url = reverse('auth-export-data')
        data = {
            'format': 'json',
            'date_from': date.today().isoformat(),
            'date_to': date.today().isoformat(),
            'include_categories': False,
            'include_budgets': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        export_data = json.loads(response.content)
        
        # Should only include today's transaction
        self.assertEqual(len(export_data['transactions']), 1)
        self.assertEqual(export_data['transactions'][0]['description'], 'Grocery shopping')
        
        # Should not include categories and budgets
        self.assertEqual(len(export_data['categories']), 0)
        self.assertEqual(len(export_data['budgets']), 0)
    
    def test_export_data_validation_error(self):
        """
        Test data export with validation errors.
        """
        url = reverse('auth-export-data')
        data = {
            'format': 'invalid_format',  # Invalid format
            'include_categories': True,
            'include_budgets': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('format', response.data)
    
    def test_export_data_unauthenticated(self):
        """
        Test data export without authentication.
        """
        self.client.credentials()  # Remove authentication
        url = reverse('auth-export-data')
        data = {
            'format': 'csv',
            'include_categories': True,
            'include_budgets': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)