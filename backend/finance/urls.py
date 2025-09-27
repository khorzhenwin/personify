"""
URL configuration for finance app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse

from .views import AuthViewSet, TransactionViewSet, CategoryViewSet, BudgetViewSet

def health_check(request):
    return JsonResponse({'status': 'healthy', 'service': 'finance-tracker-backend'})

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'budgets', BudgetViewSet, basename='budget')

urlpatterns = [
    path('', include(router.urls)),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('health/', health_check, name='health_check'),
]