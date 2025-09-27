"""
Serializers for the finance app.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal
from datetime import date

from .models import Category, Transaction, Budget

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user data (without password).
    """
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'is_email_verified', 'created_at')
        read_only_fields = ('id', 'created_at')


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with email validation and password strength.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'first_name', 'last_name')
    
    def validate_email(self, value):
        """
        Validate email format and uniqueness.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_password(self, value):
        """
        Validate password strength using Django's password validators.
        """
        try:
            # Create a temporary user instance for validation
            user = User(
                email=self.initial_data.get('email', ''),
                first_name=self.initial_data.get('first_name', ''),
                last_name=self.initial_data.get('last_name', '')
            )
            validate_password(value, user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """
        Validate that passwords match.
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields must match.'
            })
        return attrs
    
    def create(self, validated_data):
        """
        Create user with validated data.
        """
        validated_data.pop('password_confirm')  # Remove confirmation field
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login with JWT token generation.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """
        Validate credentials and return user if valid.
        """
        email = attrs.get('email')
        password = attrs.get('password')
        
        if not email:
            raise serializers.ValidationError({'email': 'This field is required.'})
        if not password:
            raise serializers.ValidationError({'password': 'This field is required.'})
        
        user = authenticate(username=email, password=password)
        if user:
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Invalid email or password.')


class UserLogoutSerializer(serializers.Serializer):
    """
    Serializer for user logout with refresh token invalidation.
    """
    refresh = serializers.CharField()
    
    def validate(self, attrs):
        """
        Validate refresh token.
        """
        self.token = attrs['refresh']
        return attrs
    
    def save(self, **kwargs):
        """
        Blacklist the refresh token.
        """
        try:
            RefreshToken(self.token).blacklist()
        except Exception:
            raise serializers.ValidationError('Invalid or expired refresh token.')


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request.
    """
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """
        Validate that user with this email exists.
        """
        if not User.objects.filter(email=value).exists():
            # Don't reveal whether user exists or not for security
            pass
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation.
    """
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    def validate_password(self, value):
        """
        Validate password strength using Django's password validators.
        """
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """
        Validate that passwords match.
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields must match.'
            })
        return attrs


class EmailChangeRequestSerializer(serializers.Serializer):
    """
    Serializer for email change request.
    """
    new_email = serializers.EmailField()
    
    def validate_new_email(self, value):
        """
        Validate that new email is different and not already in use.
        """
        request = self.context.get('request')
        if request and request.user:
            if value == request.user.email:
                raise serializers.ValidationError("New email must be different from current email.")
        
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return value


class EmailChangeConfirmSerializer(serializers.Serializer):
    """
    Serializer for email change confirmation.
    """
    new_email = serializers.EmailField()
    token = serializers.CharField()


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile information.
    """
    class Meta:
        model = User
        fields = ('first_name', 'last_name')
    
    def validate_first_name(self, value):
        """
        Validate first name is not empty.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("First name cannot be empty.")
        return value.strip()
    
    def validate_last_name(self, value):
        """
        Validate last name is not empty.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Last name cannot be empty.")
        return value.strip()


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change with current password validation.
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_current_password(self, value):
        """
        Validate current password is correct.
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
    
    def validate_new_password(self, value):
        """
        Validate new password strength using Django's password validators.
        """
        try:
            user = self.context['request'].user
            validate_password(value, user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """
        Validate that new passwords match and are different from current.
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password': 'New password fields must match.'
            })
        
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                'new_password': 'New password must be different from current password.'
            })
        
        return attrs
    
    def save(self):
        """
        Save the new password.
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class DataExportSerializer(serializers.Serializer):
    """
    Serializer for data export requests.
    """
    FORMAT_CHOICES = [
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]
    
    format = serializers.ChoiceField(choices=FORMAT_CHOICES, default='csv')
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    include_categories = serializers.BooleanField(default=True)
    include_budgets = serializers.BooleanField(default=True)
    
    def validate(self, attrs):
        """
        Validate date range.
        """
        date_from = attrs.get('date_from')
        date_to = attrs.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({
                'date_from': 'Start date must be before end date.'
            })
        
        return attrs


class EmailChangeConfirmSerializer(serializers.Serializer):
    """
    Serializer for email change confirmation.
    """
    new_email = serializers.EmailField()
    token = serializers.CharField()
    
    def validate_new_email(self, value):
        """
        Validate that new email is not already in use.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return value


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Category model.
    """
    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'color', 'created_at')
        read_only_fields = ('id', 'created_at')
    
    def validate_name(self, value):
        """
        Validate category name uniqueness for the user.
        """
        request = self.context.get('request')
        if request and request.user:
            # Check for existing category with same name for this user
            existing = Category.objects.filter(
                user=request.user, 
                name=value
            )
            # Exclude current instance if updating
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError(
                    "You already have a category with this name."
                )
        return value


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for Transaction model with comprehensive validation.
    """
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    
    def get_category_name(self, obj):
        """Get category name or None if no category."""
        return obj.category.name if obj.category else None
    
    def get_category_color(self, obj):
        """Get category color or None if no category."""
        return obj.category.color if obj.category else None
    
    class Meta:
        model = Transaction
        fields = (
            'id', 'amount', 'description', 'category', 'category_name', 
            'category_color', 'transaction_type', 'date', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'category_name', 'category_color')
    
    def validate_amount(self, value):
        """
        Validate transaction amount is positive and has proper precision.
        """
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        
        # Check decimal places (max 2)
        if value.as_tuple().exponent < -2:
            raise serializers.ValidationError("Amount cannot have more than 2 decimal places.")
        
        return value
    
    def validate_category(self, value):
        """
        Validate that category belongs to the current user.
        """
        # Handle empty string as None
        if value == '':
            value = None
            
        if value is not None:
            request = self.context.get('request')
            if request and request.user:
                if value.user != request.user:
                    raise serializers.ValidationError(
                        "You can only assign your own categories to transactions."
                    )
        return value
    
    def validate_date(self, value):
        """
        Validate transaction date is not in the future.
        """
        if value > date.today():
            raise serializers.ValidationError("Transaction date cannot be in the future.")
        return value
    
    def create(self, validated_data):
        """
        Create transaction with current user.
        """
        request = self.context.get('request')
        if request and request.user:
            validated_data['user'] = request.user
        return super().create(validated_data)


class TransactionCreateSerializer(TransactionSerializer):
    """
    Specialized serializer for transaction creation with additional validation.
    """
    def validate(self, attrs):
        """
        Additional validation for transaction creation.
        """
        attrs = super().validate(attrs)
        
        # Ensure required fields are present
        required_fields = ['amount', 'description', 'transaction_type', 'date']
        for field in required_fields:
            if field not in attrs or attrs[field] is None:
                raise serializers.ValidationError({
                    field: f"This field is required."
                })
        
        return attrs


class TransactionUpdateSerializer(TransactionSerializer):
    """
    Specialized serializer for transaction updates with partial validation.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields optional for updates
        for field in self.fields:
            self.fields[field].required = False


class TransactionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for transaction listing with minimal data.
    """
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    
    def get_category_name(self, obj):
        """Get category name or None if no category."""
        return obj.category.name if obj.category else None
    
    def get_category_color(self, obj):
        """Get category color or None if no category."""
        return obj.category.color if obj.category else None
    
    class Meta:
        model = Transaction
        fields = (
            'id', 'amount', 'description', 'category_name', 
            'category_color', 'transaction_type', 'date'
        )


class BudgetSerializer(serializers.ModelSerializer):
    """
    Serializer for Budget model with comprehensive validation.
    """
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    spent_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()
    
    def get_category_name(self, obj):
        """Get category name."""
        return obj.category.name if obj.category else None
    
    def get_category_color(self, obj):
        """Get category color."""
        return obj.category.color if obj.category else None
    
    def get_spent_amount(self, obj):
        """Calculate spent amount for this budget's category and month."""
        from django.db.models import Sum
        from calendar import monthrange
        from datetime import date
        
        # Get the full month range
        year = obj.month.year
        month = obj.month.month
        last_day = monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, last_day)
        
        # Calculate spent amount for this category in this month
        spent = Transaction.objects.filter(
            user=obj.user,
            category=obj.category,
            transaction_type='expense',
            date__gte=month_start,
            date__lte=month_end
        ).aggregate(total=Sum('amount'))['total']
        
        return str(spent or Decimal('0.00'))
    
    def get_remaining_amount(self, obj):
        """Calculate remaining budget amount."""
        spent = Decimal(self.get_spent_amount(obj))
        remaining = obj.amount - spent
        return str(remaining)
    
    def get_percentage_used(self, obj):
        """Calculate percentage of budget used."""
        spent = Decimal(self.get_spent_amount(obj))
        if obj.amount > 0:
            percentage = (spent / obj.amount) * 100
            return round(float(percentage), 2)
        return 0.0
    
    class Meta:
        model = Budget
        fields = (
            'id', 'category', 'category_name', 'category_color', 'amount', 
            'month', 'spent_amount', 'remaining_amount', 'percentage_used',
            'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'category_name', 'category_color',
            'spent_amount', 'remaining_amount', 'percentage_used'
        )
    
    def validate_amount(self, value):
        """
        Validate budget amount is positive and has proper precision.
        """
        if value <= 0:
            raise serializers.ValidationError("Budget amount must be greater than 0.")
        
        # Check decimal places (max 2)
        if value.as_tuple().exponent < -2:
            raise serializers.ValidationError("Budget amount cannot have more than 2 decimal places.")
        
        return value
    
    def validate_category(self, value):
        """
        Validate that category belongs to the current user.
        """
        if value is not None:
            request = self.context.get('request')
            if request and request.user:
                if value.user != request.user:
                    raise serializers.ValidationError(
                        "You can only create budgets for your own categories."
                    )
        return value
    
    def validate_month(self, value):
        """
        Validate that month is the first day of a month.
        """
        if value.day != 1:
            raise serializers.ValidationError("Month must be the first day of the month (YYYY-MM-01).")
        return value
    
    def validate(self, attrs):
        """
        Validate unique constraint for user, category, and month.
        """
        request = self.context.get('request')
        if request and request.user:
            category = attrs.get('category')
            month = attrs.get('month')
            
            if category and month:
                # Check for existing budget
                existing_budget = Budget.objects.filter(
                    user=request.user,
                    category=category,
                    month=month
                )
                
                # Exclude current instance if updating
                if self.instance:
                    existing_budget = existing_budget.exclude(id=self.instance.id)
                
                if existing_budget.exists():
                    raise serializers.ValidationError(
                        "You already have a budget for this category in this month."
                    )
        
        return attrs
    
    def create(self, validated_data):
        """
        Create budget with current user.
        """
        request = self.context.get('request')
        if request and request.user:
            validated_data['user'] = request.user
        return super().create(validated_data)


class BudgetCreateSerializer(BudgetSerializer):
    """
    Specialized serializer for budget creation with additional validation.
    """
    def validate(self, attrs):
        """
        Additional validation for budget creation.
        """
        attrs = super().validate(attrs)
        
        # Ensure required fields are present
        required_fields = ['category', 'amount', 'month']
        for field in required_fields:
            if field not in attrs or attrs[field] is None:
                raise serializers.ValidationError({
                    field: f"This field is required."
                })
        
        return attrs


class BudgetUpdateSerializer(BudgetSerializer):
    """
    Specialized serializer for budget updates with partial validation.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields optional for updates except user-related fields
        for field in self.fields:
            if field not in ['category_name', 'category_color', 'spent_amount', 'remaining_amount', 'percentage_used']:
                self.fields[field].required = False


class BudgetStatusSerializer(serializers.Serializer):
    """
    Serializer for budget status display with progress indicators.
    """
    budget_id = serializers.IntegerField()
    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    category_color = serializers.CharField()
    budget_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    spent_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    percentage_used = serializers.FloatField()
    status = serializers.CharField()  # 'under_budget', 'near_limit', 'over_budget'
    alert_level = serializers.CharField()  # 'none', 'warning', 'danger'
    month = serializers.DateField()


class BudgetAlertSerializer(serializers.Serializer):
    """
    Serializer for budget alerts when limits are exceeded.
    """
    budget_id = serializers.IntegerField()
    category_name = serializers.CharField()
    budget_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    spent_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    percentage_used = serializers.FloatField()
    alert_type = serializers.CharField()  # 'approaching_limit', 'limit_exceeded'
    message = serializers.CharField()
    month = serializers.DateField()