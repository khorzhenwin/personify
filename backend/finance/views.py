"""
Views for the finance app.
"""
from rest_framework import status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ModelViewSet
from rest_framework.mixins import CreateModelMixin
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.pagination import PageNumberPagination

from .models import Transaction, Category, Budget
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserLogoutSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    EmailChangeRequestSerializer,
    EmailChangeConfirmSerializer,
    UserProfileUpdateSerializer,
    PasswordChangeSerializer,
    DataExportSerializer,
    TransactionSerializer,
    TransactionCreateSerializer,
    TransactionUpdateSerializer,
    TransactionListSerializer,
    CategorySerializer,
    BudgetSerializer,
    BudgetCreateSerializer,
    BudgetUpdateSerializer,
    BudgetStatusSerializer,
    BudgetAlertSerializer,
)
from .services import EmailService, EmailVerificationService, CategorySuggestionService, BudgetTrackingService

User = get_user_model()


class AuthViewSet(GenericViewSet, CreateModelMixin):
    """
    ViewSet for authentication operations.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'register':
            return UserRegistrationSerializer
        elif self.action == 'login':
            return UserLoginSerializer
        elif self.action == 'logout':
            return UserLogoutSerializer
        elif self.action == 'password_reset':
            return PasswordResetRequestSerializer
        elif self.action == 'password_reset_confirm':
            return PasswordResetConfirmSerializer
        return UserSerializer
    
    def get_permissions(self):
        """
        Return appropriate permissions based on action.
        """
        if self.action in ['register', 'login', 'password_reset', 'password_reset_confirm']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """
        Register a new user with email validation and password strength validation.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Send welcome email
            self._send_welcome_email(user)
            
            # Generate tokens for immediate login
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'message': 'Registration successful. Welcome email sent.'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Login user with JWT token generation.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'message': 'Login successful.'
            }, status=status.HTTP_200_OK)
        
        # Check if it's a validation error (missing fields) vs authentication error
        if any(field in ['email', 'password'] for field in serializer.errors.keys()):
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Logout user and invalidate refresh token.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response({
                    'message': 'Logout successful.'
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    'error': 'Failed to logout.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Get current user profile.
        """
        return Response(UserSerializer(request.user).data)
    
    @action(detail=False, methods=['post'], url_path='password-reset')
    def password_reset(self, request):
        """
        Request password reset email.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email)
                self._send_password_reset_email(user)
            except User.DoesNotExist:
                # Don't reveal whether user exists or not
                pass
            
            return Response({
                'message': 'If an account with this email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='password-reset-confirm')
    def password_reset_confirm(self, request):
        """
        Confirm password reset with token.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            password = serializer.validated_data['password']
            
            # Decode token to get user
            try:
                # This is a simplified implementation
                # In production, you'd want more secure token handling
                user_id = urlsafe_base64_decode(token).decode()
                user = User.objects.get(id=user_id)
                
                # Set new password
                user.set_password(password)
                user.save()
                
                return Response({
                    'message': 'Password reset successful.'
                }, status=status.HTTP_200_OK)
            
            except (ValueError, User.DoesNotExist):
                return Response({
                    'error': 'Invalid or expired reset token.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='email-change-request')
    def email_change_request(self, request):
        """
        Request email address change with verification.
        """
        serializer = EmailChangeRequestSerializer(data=request.data)
        if serializer.is_valid():
            new_email = serializer.validated_data['new_email']
            
            # Initiate email change process
            success = EmailVerificationService.initiate_email_change(
                request.user, new_email
            )
            
            if success:
                return Response({
                    'message': 'Verification email sent to new address. Please check your email to complete the change.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Failed to send verification email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='email-change-confirm')
    def email_change_confirm(self, request):
        """
        Confirm email address change with verification token.
        """
        serializer = EmailChangeConfirmSerializer(data=request.data)
        if serializer.is_valid():
            new_email = serializer.validated_data['new_email']
            token = serializer.validated_data['token']
            
            # Complete email change process
            success = EmailVerificationService.complete_email_change(
                request.user, new_email, token
            )
            
            if success:
                return Response({
                    'message': 'Email address changed successfully.',
                    'user': UserSerializer(request.user).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Invalid or expired verification token.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _send_welcome_email(self, user):
        """
        Send welcome email to newly registered user using EmailService.
        """
        return EmailService.send_welcome_email(user)
    
    def _send_password_reset_email(self, user):
        """
        Send password reset email with secure token using EmailService.
        """
        return EmailService.send_password_reset_email(user)
    
    @action(detail=False, methods=['put'], url_path='profile-update')
    def profile_update(self, request):
        """
        Update user profile information.
        """
        serializer = UserProfileUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': 'Profile updated successfully.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        """
        Change user password with current password validation.
        """
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Password changed successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='export-data')
    def export_data(self, request):
        """
        Export user data in various formats.
        """
        serializer = DataExportSerializer(data=request.data)
        if serializer.is_valid():
            export_format = serializer.validated_data['format']
            date_from = serializer.validated_data.get('date_from')
            date_to = serializer.validated_data.get('date_to')
            include_categories = serializer.validated_data['include_categories']
            include_budgets = serializer.validated_data['include_budgets']
            
            # Get user's data
            transactions = Transaction.objects.filter(user=request.user)
            if date_from:
                transactions = transactions.filter(date__gte=date_from)
            if date_to:
                transactions = transactions.filter(date__lte=date_to)
            
            categories = Category.objects.filter(user=request.user) if include_categories else Category.objects.none()
            budgets = Budget.objects.filter(user=request.user) if include_budgets else Budget.objects.none()
            
            if export_format == 'csv':
                return self._export_csv(transactions, categories, budgets)
            elif export_format == 'json':
                return self._export_json(transactions, categories, budgets)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _export_csv(self, transactions, categories, budgets):
        """
        Export data as CSV format.
        """
        import csv
        from django.http import HttpResponse
        from io import StringIO
        import zipfile
        from django.http import HttpResponse
        
        # Create a zip file containing multiple CSV files
        response = HttpResponse(content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="financial_data.zip"'
        
        import io
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Transactions CSV
            transactions_csv = StringIO()
            transactions_writer = csv.writer(transactions_csv)
            transactions_writer.writerow([
                'Date', 'Description', 'Amount', 'Type', 'Category', 'Created At'
            ])
            
            for transaction in transactions:
                transactions_writer.writerow([
                    transaction.date,
                    transaction.description,
                    transaction.amount,
                    transaction.transaction_type,
                    transaction.category.name if transaction.category else '',
                    transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')
                ])
            
            zip_file.writestr('transactions.csv', transactions_csv.getvalue())
            
            # Categories CSV
            if categories.exists():
                categories_csv = StringIO()
                categories_writer = csv.writer(categories_csv)
                categories_writer.writerow(['Name', 'Description', 'Color', 'Created At'])
                
                for category in categories:
                    categories_writer.writerow([
                        category.name,
                        category.description or '',
                        category.color,
                        category.created_at.strftime('%Y-%m-%d %H:%M:%S')
                    ])
                
                zip_file.writestr('categories.csv', categories_csv.getvalue())
            
            # Budgets CSV
            if budgets.exists():
                budgets_csv = StringIO()
                budgets_writer = csv.writer(budgets_csv)
                budgets_writer.writerow(['Category', 'Amount', 'Month', 'Created At'])
                
                for budget in budgets:
                    budgets_writer.writerow([
                        budget.category.name,
                        budget.amount,
                        budget.month.strftime('%Y-%m'),
                        budget.created_at.strftime('%Y-%m-%d %H:%M:%S')
                    ])
                
                zip_file.writestr('budgets.csv', budgets_csv.getvalue())
        
        response.write(zip_buffer.getvalue())
        return response
    
    def _export_json(self, transactions, categories, budgets):
        """
        Export data as JSON format.
        """
        from django.http import JsonResponse
        
        data = {
            'export_date': timezone.now().isoformat(),
            'transactions': [
                {
                    'date': transaction.date.isoformat(),
                    'description': transaction.description,
                    'amount': str(transaction.amount),
                    'type': transaction.transaction_type,
                    'category': transaction.category.name if transaction.category else None,
                    'created_at': transaction.created_at.isoformat()
                }
                for transaction in transactions
            ],
            'categories': [
                {
                    'name': category.name,
                    'description': category.description,
                    'color': category.color,
                    'created_at': category.created_at.isoformat()
                }
                for category in categories
            ] if categories.exists() else [],
            'budgets': [
                {
                    'category': budget.category.name,
                    'amount': str(budget.amount),
                    'month': budget.month.strftime('%Y-%m'),
                    'created_at': budget.created_at.isoformat()
                }
                for budget in budgets
            ] if budgets.exists() else []
        }
        
        response = JsonResponse(data)
        response['Content-Disposition'] = 'attachment; filename="financial_data.json"'
        return response


class TransactionPagination(PageNumberPagination):
    """
    Custom pagination for transactions with configurable page size.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class TransactionViewSet(ModelViewSet):
    """
    ViewSet for transaction management with full CRUD operations.
    Provides comprehensive transaction management with data validation,
    user isolation, pagination, and filtering capabilities.
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = TransactionPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['transaction_type', 'category', 'date']
    search_fields = ['description', 'amount']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        """
        Return transactions for the current user only.
        """
        return Transaction.objects.filter(user=self.request.user).select_related('category')
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'create':
            return TransactionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TransactionUpdateSerializer
        elif self.action == 'list':
            return TransactionListSerializer
        return TransactionSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new transaction with comprehensive validation.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            transaction = serializer.save()
            
            # Return full transaction data using the detail serializer
            response_serializer = TransactionSerializer(transaction, context={'request': request})
            
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """
        Update a transaction with validation and immediate response.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            transaction = serializer.save()
            
            # Return full transaction data using the detail serializer
            response_serializer = TransactionSerializer(transaction, context={'request': request})
            
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a transaction with proper cleanup.
        """
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def list(self, request, *args, **kwargs):
        """
        List transactions with running balance calculations and summary.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calculate summary statistics
        summary = self._calculate_summary(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data)
            response_data.data['summary'] = summary
            return response_data
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
            'summary': summary
        })
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Advanced search endpoint for transactions with multiple filters and running balance.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Additional custom filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        amount_min = request.query_params.get('amount_min')
        amount_max = request.query_params.get('amount_max')
        category = request.query_params.get('category')
        
        try:
            if date_from:
                from datetime import datetime
                datetime.strptime(date_from, '%Y-%m-%d')  # Validate date format
                queryset = queryset.filter(date__gte=date_from)
            if date_to:
                from datetime import datetime
                datetime.strptime(date_to, '%Y-%m-%d')  # Validate date format
                queryset = queryset.filter(date__lte=date_to)
            if amount_min:
                from decimal import Decimal, InvalidOperation
                try:
                    amount_min_decimal = Decimal(amount_min)
                    queryset = queryset.filter(amount__gte=amount_min_decimal)
                except InvalidOperation:
                    return Response(
                        {'error': 'Invalid amount_min format'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            if amount_max:
                from decimal import Decimal, InvalidOperation
                try:
                    amount_max_decimal = Decimal(amount_max)
                    queryset = queryset.filter(amount__lte=amount_max_decimal)
                except InvalidOperation:
                    return Response(
                        {'error': 'Invalid amount_max format'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            if category:
                try:
                    category_id = int(category)
                    # Verify category belongs to user
                    if not Category.objects.filter(id=category_id, user=request.user).exists():
                        return Response(
                            {'error': 'Category not found or access denied'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    queryset = queryset.filter(category_id=category_id)
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Invalid category ID'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate summary statistics for filtered results
        summary = self._calculate_summary(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data)
            response_data.data['summary'] = summary
            return response_data
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
            'summary': summary
        })
    
    def _calculate_summary(self, queryset):
        """
        Calculate running balance and summary statistics for transactions.
        """
        from django.db.models import Sum, Q
        from decimal import Decimal
        
        # Calculate totals
        income_total = queryset.filter(transaction_type='income').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        expense_total = queryset.filter(transaction_type='expense').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        net_balance = income_total - expense_total
        
        # For running balance, we need to consider all user's transactions up to the latest date in queryset
        if queryset.exists():
            latest_date = queryset.latest('date', 'created_at').date
            all_transactions_to_date = Transaction.objects.filter(
                user=self.request.user,
                date__lte=latest_date
            )
            
            running_income = all_transactions_to_date.filter(transaction_type='income').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            running_expense = all_transactions_to_date.filter(transaction_type='expense').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            running_balance = running_income - running_expense
        else:
            running_balance = Decimal('0.00')
        
        return {
            'total_income': str(income_total),
            'total_expenses': str(expense_total),
            'net_balance': str(net_balance),
            'running_balance': str(running_balance)
        }
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        Export transactions as CSV data.
        """
        import csv
        from django.http import HttpResponse
        from io import StringIO
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Description', 'Amount', 'Type', 'Category', 'Created At'
        ])
        
        for transaction in queryset:
            writer.writerow([
                transaction.date,
                transaction.description,
                transaction.amount,
                transaction.transaction_type,
                transaction.category.name if transaction.category else '',
                transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])
        
        return response


class CategoryViewSet(ModelViewSet):
    """
    ViewSet for category management with full CRUD operations.
    Provides comprehensive category management with user isolation,
    validation, and smart categorization features.
    """
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return categories for the current user only.
        """
        return Category.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new category with user assignment and validation.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Assign current user to the category
            category = serializer.save(user=request.user)
            
            return Response(
                CategorySerializer(category, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """
        Update a category with validation.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            category = serializer.save()
            return Response(CategorySerializer(category, context={'request': request}).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a category. Associated transactions will have category set to null.
        """
        instance = self.get_object()
        
        # Check if category has associated transactions
        transaction_count = instance.transactions.count()
        
        # Delete the category (transactions will have category set to null due to SET_NULL)
        instance.delete()
        
        return Response({
            'message': f'Category deleted successfully. {transaction_count} transactions were uncategorized.'
        }, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Get category suggestions for uncategorized transactions.
        """
        limit = int(request.query_params.get('limit', 5))
        
        suggestions = CategorySuggestionService.get_category_suggestions_for_user(
            request.user, limit
        )
        
        return Response({
            'suggestions': suggestions,
            'count': len(suggestions)
        })
    
    @action(detail=False, methods=['post'])
    def suggest_for_description(self, request):
        """
        Get category suggestion for a specific description.
        """
        description = request.data.get('description', '')
        
        if not description:
            return Response(
                {'error': 'Description is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        suggested_category = CategorySuggestionService.suggest_category_with_history(
            request.user, description
        )
        
        if suggested_category:
            return Response({
                'suggested_category': CategorySerializer(
                    suggested_category, 
                    context={'request': request}
                ).data,
                'confidence': 'high'
            })
        else:
            return Response({
                'suggested_category': None,
                'confidence': 'none'
            })
    
    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """
        Bulk assign category to multiple transactions.
        """
        category_id = request.data.get('category_id')
        transaction_ids = request.data.get('transaction_ids', [])
        
        if not category_id:
            return Response(
                {'error': 'category_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not transaction_ids:
            return Response(
                {'error': 'transaction_ids is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify category belongs to user
            category = Category.objects.get(id=category_id, user=request.user)
        except Category.DoesNotExist:
            return Response(
                {'error': 'Category not found or access denied'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update transactions
        updated_count = Transaction.objects.filter(
            id__in=transaction_ids,
            user=request.user
        ).update(category=category)
        
        return Response({
            'message': f'Successfully assigned category to {updated_count} transactions',
            'updated_count': updated_count,
            'category': CategorySerializer(category, context={'request': request}).data
        })
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """
        Get all transactions for a specific category.
        """
        category = self.get_object()
        transactions = category.transactions.all().order_by('-date', '-created_at')
        
        # Apply pagination
        paginator = TransactionPagination()
        page = paginator.paginate_queryset(transactions, request)
        
        if page is not None:
            serializer = TransactionListSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        
        serializer = TransactionListSerializer(transactions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get category statistics including transaction counts and totals.
        """
        from django.db.models import Count, Sum, Q
        from decimal import Decimal
        
        categories = self.get_queryset().annotate(
            transaction_count=Count('transactions'),
            total_income=Sum(
                'transactions__amount',
                filter=Q(transactions__transaction_type='income')
            ),
            total_expenses=Sum(
                'transactions__amount',
                filter=Q(transactions__transaction_type='expense')
            )
        )
        
        stats_data = []
        for category in categories:
            total_income = category.total_income or Decimal('0.00')
            total_expenses = category.total_expenses or Decimal('0.00')
            
            stats_data.append({
                'id': category.id,
                'name': category.name,
                'color': category.color,
                'transaction_count': category.transaction_count,
                'total_income': str(total_income),
                'total_expenses': str(total_expenses),
                'net_amount': str(total_income - total_expenses)
            })
        
        return Response({
            'categories': stats_data,
            'total_categories': len(stats_data)
        })


class BudgetViewSet(ModelViewSet):
    """
    ViewSet for budget management with full CRUD operations.
    Provides comprehensive budget management with real-time tracking,
    progress indicators, and alert system.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return budgets for the current user only.
        """
        return Budget.objects.filter(user=self.request.user).select_related('category')
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'create':
            return BudgetCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BudgetUpdateSerializer
        return BudgetSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new budget with comprehensive validation.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            budget = serializer.save()
            
            # Return full budget data using the detail serializer
            response_serializer = BudgetSerializer(budget, context={'request': request})
            
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """
        Update a budget with validation and immediate response.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            budget = serializer.save()
            
            # Return full budget data using the detail serializer
            response_serializer = BudgetSerializer(budget, context={'request': request})
            
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a budget.
        """
        instance = self.get_object()
        category_name = instance.category.name
        month_str = instance.month.strftime('%Y-%m')
        
        instance.delete()
        
        return Response({
            'message': f'Budget for {category_name} in {month_str} deleted successfully.'
        }, status=status.HTTP_204_NO_CONTENT)
    
    def list(self, request, *args, **kwargs):
        """
        List budgets with optional month filtering.
        """
        queryset = self.get_queryset()
        
        # Filter by month if provided
        month = request.query_params.get('month')
        if month:
            try:
                from datetime import datetime
                month_date = datetime.strptime(month, '%Y-%m-%d').date()
                queryset = queryset.filter(month=month_date)
            except ValueError:
                return Response(
                    {'error': 'Invalid month format. Use YYYY-MM-DD (first day of month)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Get budget status with progress indicators and remaining amounts.
        """
        month = request.query_params.get('month')
        
        if month:
            try:
                from datetime import datetime
                month_date = datetime.strptime(month, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid month format. Use YYYY-MM-DD (first day of month)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            from datetime import date
            today = date.today()
            month_date = date(today.year, today.month, 1)
        
        # Get budget summary for the month
        summary = BudgetTrackingService.get_monthly_budget_summary(request.user, month_date)
        
        # Serialize budget details
        budget_status_data = []
        for budget_detail in summary['budget_details']:
            budget_status_data.append(BudgetStatusSerializer(budget_detail).data)
        
        return Response({
            'month': summary['month'],
            'summary': {
                'total_budgeted': str(summary['total_budgeted']),
                'total_spent': str(summary['total_spent']),
                'total_remaining': str(summary['total_remaining']),
                'overall_percentage_used': summary['overall_percentage_used'],
                'budget_count': summary['budget_count'],
                'budgets_over_limit': summary['budgets_over_limit'],
                'budgets_near_limit': summary['budgets_near_limit'],
                'budgets_under_limit': summary['budgets_under_limit']
            },
            'budgets': budget_status_data
        })
    
    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """
        Get budget alerts for budgets that are approaching or exceeding limits.
        """
        month = request.query_params.get('month')
        
        if month:
            try:
                from datetime import datetime
                month_date = datetime.strptime(month, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid month format. Use YYYY-MM-DD (first day of month)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            month_date = None  # Use current month
        
        # Get budget alerts
        alerts = BudgetTrackingService.get_budget_alerts(request.user, month_date)
        
        # Serialize alerts
        alert_data = []
        for alert in alerts:
            alert_data.append(BudgetAlertSerializer(alert).data)
        
        return Response({
            'count': len(alert_data),
            'alerts': alert_data
        })
    
    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """
        Get comprehensive monthly budget summary with all details.
        """
        month = request.query_params.get('month')
        
        if month:
            try:
                from datetime import datetime
                month_date = datetime.strptime(month, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid month format. Use YYYY-MM-DD (first day of month)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            from datetime import date
            today = date.today()
            month_date = date(today.year, today.month, 1)
        
        # Get comprehensive summary
        summary = BudgetTrackingService.get_monthly_budget_summary(request.user, month_date)
        
        return Response({
            'month': summary['month'],
            'total_budgeted': str(summary['total_budgeted']),
            'total_spent': str(summary['total_spent']),
            'total_remaining': str(summary['total_remaining']),
            'overall_percentage_used': summary['overall_percentage_used'],
            'budget_count': summary['budget_count'],
            'budgets_over_limit': summary['budgets_over_limit'],
            'budgets_near_limit': summary['budgets_near_limit'],
            'budgets_under_limit': summary['budgets_under_limit'],
            'budget_details': summary['budget_details']
        })
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """
        Get all transactions for a specific budget's category and month.
        """
        budget = self.get_object()
        
        # Get the full month range
        from calendar import monthrange
        from datetime import date
        
        year = budget.month.year
        month = budget.month.month
        last_day = monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, last_day)
        
        # Get transactions for this category and month
        transactions = Transaction.objects.filter(
            user=request.user,
            category=budget.category,
            date__gte=month_start,
            date__lte=month_end
        ).order_by('-date', '-created_at')
        
        # Apply pagination
        paginator = TransactionPagination()
        page = paginator.paginate_queryset(transactions, request)
        
        if page is not None:
            serializer = TransactionListSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        
        serializer = TransactionListSerializer(transactions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def check_transaction_impact(self, request):
        """
        Check how a transaction would impact existing budgets.
        """
        transaction_data = request.data
        
        # Validate required fields
        required_fields = ['category', 'amount', 'date', 'transaction_type']
        for field in required_fields:
            if field not in transaction_data:
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            # Parse date
            from datetime import datetime
            date_str = transaction_data.get('date')
            if isinstance(date_str, list):
                date_str = date_str[0]
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            # Parse amount
            from decimal import Decimal
            amount_str = transaction_data.get('amount')
            if isinstance(amount_str, list):
                amount_str = amount_str[0]
            parsed_amount = Decimal(str(amount_str))
            
            # Get category
            category_id = transaction_data.get('category')
            if isinstance(category_id, list):
                category_id = category_id[0]
            category = Category.objects.get(id=category_id, user=request.user)
            
            # Get transaction type
            transaction_type = transaction_data.get('transaction_type')
            if isinstance(transaction_type, list):
                transaction_type = transaction_type[0]
            
            # Create clean transaction data dict
            transaction_data = {
                'date': parsed_date,
                'amount': parsed_amount,
                'category': category,
                'transaction_type': transaction_type
            }
            
        except (ValueError, Category.DoesNotExist) as e:
            return Response(
                {'error': f'Invalid transaction data: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check impact
        impact = BudgetTrackingService.check_transaction_impact_on_budget(request.user, transaction_data)
        
        return Response(impact)