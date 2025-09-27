"""
Serializers for the finance app.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework_simplejwt.tokens import RefreshToken

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
    
    def validate_new_email(self, value):
        """
        Validate that new email is not already in use.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return value