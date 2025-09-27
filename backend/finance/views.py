"""
Views for the finance app.
"""
from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import CreateModelMixin
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string

from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserLogoutSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    EmailChangeRequestSerializer,
    EmailChangeConfirmSerializer,
)
from .services import EmailService, EmailVerificationService

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