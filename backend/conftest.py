"""
Pytest configuration and fixtures.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from finance.models import Category, Transaction, Budget
from decimal import Decimal
from datetime import date, datetime

User = get_user_model()


@pytest.fixture
def api_client():
    """
    API client fixture.
    """
    return APIClient()


@pytest.fixture
def user():
    """
    Test user fixture.
    """
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """
    Authenticated API client fixture.
    """
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def category(user):
    """
    Test category fixture.
    """
    return Category.objects.create(
        user=user,
        name='Food',
        description='Food and dining expenses',
        color='#ff6b6b'
    )


@pytest.fixture
def transaction(user, category):
    """
    Test transaction fixture.
    """
    return Transaction.objects.create(
        user=user,
        amount=Decimal('25.50'),
        description='Lunch at restaurant',
        category=category,
        transaction_type='expense',
        date=date.today()
    )


@pytest.fixture
def budget(user, category):
    """
    Test budget fixture.
    """
    return Budget.objects.create(
        user=user,
        category=category,
        amount=Decimal('500.00'),
        month=date.today().replace(day=1)
    )