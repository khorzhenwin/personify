"""
URL configuration for finance app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import views will be added as we create them
# from .views import (
#     AuthViewSet,
#     TransactionViewSet,
#     CategoryViewSet,
#     BudgetViewSet,
# )

router = DefaultRouter()
# Router registrations will be added as we create viewsets
# router.register(r'auth', AuthViewSet, basename='auth')
# router.register(r'transactions', TransactionViewSet)
# router.register(r'categories', CategoryViewSet)
# router.register(r'budgets', BudgetViewSet)

urlpatterns = [
    path('', include(router.urls)),
]