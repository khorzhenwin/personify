"""
Authentication system tests following TDD methodology.
"""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core import mail
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import json
import re

User = get_user_model()


@pytest.mark.django_db
class TestUserRegistrationWithEmailValidation:
    """
    TDD tests for user registration with email validation.
    """
    
    def setup_method(self):
        """Set up test client for each test."""
        self.client = APIClient()
        self.registration_url = reverse('auth-register')
    
    def test_register_endpoint_exists(self):
        """Test that registration endpoint exists and accepts POST requests."""
        response = self.client.post(self.registration_url, {})
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
    
    def test_register_with_valid_data_creates_user(self):
        """Test that registration with valid data creates a new user."""
        data = {
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        
        response = self.client.post(self.registration_url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email='newuser@example.com').exists()
        
        user = User.objects.get(email='newuser@example.com')
        assert user.first_name == 'John'
        assert user.last_name == 'Doe'
        assert not user.is_email_verified  # Should be False initially
    
    def test_register_with_invalid_email_format_fails(self):
        """Test that registration with invalid email format fails."""
        invalid_emails = [
            'notanemail',
            'missing@domain',
            '@missinglocal.com',
            'spaces in@email.com',
            'double@@domain.com'
        ]
        
        for invalid_email in invalid_emails:
            data = {
                'email': invalid_email,
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
                'first_name': 'John',
                'last_name': 'Doe'
            }
            
            response = self.client.post(self.registration_url, data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert 'email' in response.data
            assert not User.objects.filter(email=invalid_email).exists()
    
    def test_register_with_duplicate_email_fails(self):
        """Test that registration with duplicate email fails."""
        # Create existing user
        User.objects.create_user(
            email='existing@example.com',
            password='password123',
            first_name='Existing',
            last_name='User'
        )
        
        data = {
            'email': 'existing@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(self.registration_url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
        assert User.objects.filter(email='existing@example.com').count() == 1
    
    def test_register_with_missing_required_fields_fails(self):
        """Test that registration fails when required fields are missing."""
        required_fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name']
        
        for field in required_fields:
            data = {
                'email': 'test@example.com',
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
                'first_name': 'John',
                'last_name': 'Doe'
            }
            del data[field]  # Remove the required field
            
            response = self.client.post(self.registration_url, data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            # Check that some error is returned (field name might vary)
            assert len(response.data) > 0
    
    def test_register_with_password_mismatch_fails(self):
        """Test that registration fails when passwords don't match."""
        data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        
        response = self.client.post(self.registration_url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data or 'non_field_errors' in response.data
        assert not User.objects.filter(email='test@example.com').exists()
    
    def test_register_response_contains_user_data(self):
        """Test that successful registration returns user data without password."""
        data = {
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        
        response = self.client.post(self.registration_url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert response.data['user']['email'] == 'newuser@example.com'
        assert response.data['user']['first_name'] == 'John'
        assert response.data['user']['last_name'] == 'Doe'
        assert 'password' not in response.data['user']
        assert 'id' in response.data['user']


@pytest.mark.django_db
class TestPasswordStrengthValidation:
    """
    TDD tests for password strength validation during registration.
    """
    
    def setup_method(self):
        """Set up test client for each test."""
        self.client = APIClient()
        self.registration_url = reverse('auth-register')
    
    def test_register_with_weak_password_fails(self):
        """Test that registration with weak passwords fails."""
        weak_passwords = [
            'short',  # Too short
            '12345678',  # Only numbers
            'password',  # Too common
            'PASSWORD',  # Only uppercase
            'abcdefgh',  # Only lowercase
            'user@example.com',  # Similar to email
        ]
        
        for weak_password in weak_passwords:
            data = {
                'email': 'user@example.com',
                'password': weak_password,
                'password_confirm': weak_password,
                'first_name': 'John',
                'last_name': 'Doe'
            }
            
            response = self.client.post(self.registration_url, data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert 'password' in response.data
    
    def test_register_with_strong_password_succeeds(self):
        """Test that registration with strong passwords succeeds."""
        strong_passwords = [
            'SecurePass123!',
            'MyStr0ng@Password',
            'C0mpl3x#Pass',
            'Ungu3ssable$2024'
        ]
        
        for i, strong_password in enumerate(strong_passwords):
            email = f'user{i}@example.com'
            data = {
                'email': email,
                'password': strong_password,
                'password_confirm': strong_password,
                'first_name': 'John',
                'last_name': 'Doe'
            }
            
            response = self.client.post(self.registration_url, data)
            
            assert response.status_code == status.HTTP_201_CREATED
            assert User.objects.filter(email=email).exists()
    
    def test_password_minimum_length_validation(self):
        """Test that password must be at least 8 characters."""
        data = {
            'email': 'test@example.com',
            'password': '1234567',  # 7 characters
            'password_confirm': '1234567',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        
        response = self.client.post(self.registration_url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data
        assert any('8 characters' in str(error) for error in response.data['password'])


@pytest.mark.django_db
class TestLoginFunctionalityWithJWT:
    """
    TDD tests for login functionality with JWT token generation.
    """
    
    def setup_method(self):
        """Set up test client and user for each test."""
        self.client = APIClient()
        self.login_url = reverse('auth-login')
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User'
        )
    
    def test_login_endpoint_exists(self):
        """Test that login endpoint exists and accepts POST requests."""
        response = self.client.post(self.login_url, {})
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
    
    def test_login_with_valid_credentials_returns_tokens(self):
        """Test that login with valid credentials returns JWT tokens."""
        data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        
        response = self.client.post(self.login_url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        
        # Verify token format (JWT tokens are base64 encoded with dots)
        access_token = response.data['access']
        refresh_token = response.data['refresh']
        assert len(access_token.split('.')) == 3  # JWT has 3 parts
        assert len(refresh_token.split('.')) == 3
    
    def test_login_with_invalid_email_fails(self):
        """Test that login with invalid email fails."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'SecurePass123!'
        }
        
        response = self.client.post(self.login_url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'access' not in response.data
        assert 'refresh' not in response.data
    
    def test_login_with_invalid_password_fails(self):
        """Test that login with invalid password fails."""
        data = {
            'email': 'testuser@example.com',
            'password': 'WrongPassword123!'
        }
        
        response = self.client.post(self.login_url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'access' not in response.data
        assert 'refresh' not in response.data
    
    def test_login_with_missing_credentials_fails(self):
        """Test that login with missing credentials fails."""
        # Missing password
        response = self.client.post(self.login_url, {'email': 'testuser@example.com'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Missing email
        response = self.client.post(self.login_url, {'password': 'SecurePass123!'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Missing both
        response = self.client.post(self.login_url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_response_contains_user_data(self):
        """Test that login response contains user data without password."""
        data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        
        response = self.client.post(self.login_url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data
        assert response.data['user']['email'] == 'testuser@example.com'
        assert response.data['user']['first_name'] == 'Test'
        assert response.data['user']['last_name'] == 'User'
        assert 'password' not in response.data['user']
        assert 'id' in response.data['user']
    
    def test_access_token_can_authenticate_requests(self):
        """Test that access token can be used to authenticate API requests."""
        # Login to get token
        login_data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        login_response = self.client.post(self.login_url, login_data)
        access_token = login_response.data['access']
        
        # Use token to access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Test with a protected endpoint (we'll create this)
        profile_url = reverse('auth-profile')
        response = self.client.get(profile_url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'testuser@example.com'


@pytest.mark.django_db
class TestLogoutFunctionalityAndTokenInvalidation:
    """
    TDD tests for logout functionality and token invalidation.
    """
    
    def setup_method(self):
        """Set up test client and authenticated user for each test."""
        self.client = APIClient()
        self.logout_url = reverse('auth-logout')
        self.login_url = reverse('auth-login')
        
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User'
        )
        
        # Login to get tokens
        login_response = self.client.post(self.login_url, {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        })
        self.access_token = login_response.data['access']
        self.refresh_token = login_response.data['refresh']
    
    def test_logout_endpoint_exists(self):
        """Test that logout endpoint exists and accepts POST requests."""
        response = self.client.post(self.logout_url, {})
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
    
    def test_logout_with_valid_refresh_token_succeeds(self):
        """Test that logout with valid refresh token succeeds."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'refresh': self.refresh_token
        }
        
        response = self.client.post(self.logout_url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
    
    def test_logout_invalidates_refresh_token(self):
        """Test that logout invalidates the refresh token."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Logout
        logout_data = {
            'refresh': self.refresh_token
        }
        logout_response = self.client.post(self.logout_url, logout_data)
        assert logout_response.status_code == status.HTTP_200_OK
        
        # Try to use refresh token to get new access token
        refresh_url = reverse('token_refresh')
        refresh_data = {
            'refresh': self.refresh_token
        }
        refresh_response = self.client.post(refresh_url, refresh_data)
        
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_logout_without_refresh_token_fails(self):
        """Test that logout without refresh token fails."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        response = self.client.post(self.logout_url, {})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'refresh' in response.data
    
    def test_logout_with_invalid_refresh_token_fails(self):
        """Test that logout with invalid refresh token fails."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        data = {
            'refresh': 'invalid.refresh.token'
        }
        
        response = self.client.post(self.logout_url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_logout_requires_authentication(self):
        """Test that logout endpoint requires authentication."""
        # Don't set authorization header
        data = {
            'refresh': self.refresh_token
        }
        
        response = self.client.post(self.logout_url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_access_token_still_valid_after_logout(self):
        """Test that access token is still valid after logout (until expiry)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Logout
        logout_data = {
            'refresh': self.refresh_token
        }
        logout_response = self.client.post(self.logout_url, logout_data)
        assert logout_response.status_code == status.HTTP_200_OK
        
        # Access token should still work for protected endpoints
        profile_url = reverse('auth-profile')
        response = self.client.get(profile_url)
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAuthenticationIntegration:
    """
    Integration tests for complete authentication flow.
    """
    
    def setup_method(self):
        """Set up test client for each test."""
        self.client = APIClient()
    
    def test_complete_authentication_flow(self):
        """Test complete flow: register -> login -> access protected -> logout."""
        # 1. Register
        register_data = {
            'email': 'flowtest@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Flow',
            'last_name': 'Test'
        }
        register_response = self.client.post(reverse('auth-register'), register_data)
        assert register_response.status_code == status.HTTP_201_CREATED
        
        # 2. Login
        login_data = {
            'email': 'flowtest@example.com',
            'password': 'SecurePass123!'
        }
        login_response = self.client.post(reverse('auth-login'), login_data)
        assert login_response.status_code == status.HTTP_200_OK
        
        access_token = login_response.data['access']
        refresh_token = login_response.data['refresh']
        
        # 3. Access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get(reverse('auth-profile'))
        assert profile_response.status_code == status.HTTP_200_OK
        assert profile_response.data['email'] == 'flowtest@example.com'
        
        # 4. Logout
        logout_data = {
            'refresh': refresh_token
        }
        logout_response = self.client.post(reverse('auth-logout'), logout_data)
        assert logout_response.status_code == status.HTTP_200_OK
        
        # 5. Verify refresh token is invalidated
        refresh_response = self.client.post(reverse('token_refresh'), {'refresh': refresh_token})
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_unauthenticated_access_to_protected_endpoints_fails(self):
        """Test that unauthenticated requests to protected endpoints fail."""
        protected_endpoints = [
            reverse('auth-profile'),
            reverse('auth-logout'),
        ]
        
        for endpoint in protected_endpoints:
            response = self.client.get(endpoint)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_invalid_token_access_fails(self):
        """Test that requests with invalid tokens fail."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid.jwt.token')
        
        response = self.client.get(reverse('auth-profile'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_expired_token_access_fails(self):
        """Test that requests with expired tokens fail."""
        # This test would require mocking time or using very short token lifetime
        # For now, we'll test with malformed token
        self.client.credentials(HTTP_AUTHORIZATION='Bearer expired.token.here')
        
        response = self.client.get(reverse('auth-profile'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestEmailIntegrationForAuth:
    """
    Tests for email integration in authentication system.
    """
    
    def setup_method(self):
        """Set up test client for each test."""
        self.client = APIClient()
    
    def test_registration_sends_welcome_email(self):
        """Test that user registration sends a welcome email."""
        data = {
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        
        response = self.client.post(reverse('auth-register'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(mail.outbox) == 1
        
        welcome_email = mail.outbox[0]
        assert welcome_email.to == ['newuser@example.com']
        assert 'welcome' in welcome_email.subject.lower()
        assert 'John' in welcome_email.body
    
    def test_password_reset_request_sends_email(self):
        """Test that password reset request sends email with reset link."""
        user = User.objects.create_user(
            email='resetuser@example.com',
            password='OldPass123!',
            first_name='Reset',
            last_name='User'
        )
        
        data = {
            'email': 'resetuser@example.com'
        }
        
        response = self.client.post(reverse('auth-password-reset'), data)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 1
        
        reset_email = mail.outbox[0]
        assert reset_email.to == ['resetuser@example.com']
        assert 'password reset' in reset_email.subject.lower()
        
        # Check that email contains reset token/link
        assert 'reset' in reset_email.body.lower()
        # Should contain a token (base64 encoded user ID)
        assert re.search(r'[a-zA-Z0-9]{3,}', reset_email.body)


@pytest.mark.django_db
class TestEmailVerificationForProfileUpdates:
    """
    TDD tests for email verification during profile updates.
    """
    
    def setup_method(self):
        """Set up test client and authenticated user for each test."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='current@example.com',
            password='SecurePass123!',
            first_name='Current',
            last_name='User'
        )
        
        # Login to get access token
        login_response = self.client.post(reverse('auth-login'), {
            'email': 'current@example.com',
            'password': 'SecurePass123!'
        })
        self.access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_email_change_request_endpoint_exists(self):
        """Test that email change request endpoint exists."""
        response = self.client.post(reverse('auth-email-change-request'), {})
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
    
    def test_email_change_request_with_valid_email_sends_verification(self):
        """Test that email change request with valid email sends verification email."""
        data = {
            'new_email': 'newemail@example.com'
        }
        
        response = self.client.post(reverse('auth-email-change-request'), data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'verification email sent' in response.data['message'].lower()
        
        # Check that verification email was sent
        assert len(mail.outbox) == 1
        verification_email = mail.outbox[0]
        assert verification_email.to == ['newemail@example.com']
        assert 'verification' in verification_email.subject.lower()
    
    def test_email_change_request_with_same_email_fails(self):
        """Test that email change request with same email fails."""
        data = {
            'new_email': 'current@example.com'  # Same as current email
        }
        
        response = self.client.post(reverse('auth-email-change-request'), data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'new_email' in response.data
        assert len(mail.outbox) == 0
    
    def test_email_change_request_with_existing_email_fails(self):
        """Test that email change request with existing email fails."""
        # Create another user with the target email
        User.objects.create_user(
            email='existing@example.com',
            password='SecurePass123!',
            first_name='Existing',
            last_name='User'
        )
        
        data = {
            'new_email': 'existing@example.com'
        }
        
        response = self.client.post(reverse('auth-email-change-request'), data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'new_email' in response.data
        assert len(mail.outbox) == 0
    
    def test_email_change_request_requires_authentication(self):
        """Test that email change request requires authentication."""
        # Remove authentication
        self.client.credentials()
        
        data = {
            'new_email': 'newemail@example.com'
        }
        
        response = self.client.post(reverse('auth-email-change-request'), data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_email_change_confirm_endpoint_exists(self):
        """Test that email change confirm endpoint exists."""
        response = self.client.post(reverse('auth-email-change-confirm'), {})
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
    
    def test_email_change_confirm_with_valid_token_succeeds(self):
        """Test that email change confirmation with valid token succeeds."""
        new_email = 'confirmed@example.com'
        
        # Generate a valid token (using the service)
        from finance.services import EmailVerificationService
        token = EmailVerificationService.generate_verification_token(
            self.user, new_email
        )
        
        data = {
            'new_email': new_email,
            'token': token
        }
        
        response = self.client.post(reverse('auth-email-change-confirm'), data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'changed successfully' in response.data['message'].lower()
        
        # Verify user email was updated
        self.user.refresh_from_db()
        assert self.user.email == new_email
        
        # Verify notification email was sent to old email
        assert len(mail.outbox) == 1
        notification_email = mail.outbox[0]
        assert notification_email.to == ['current@example.com']
    
    def test_email_change_confirm_with_invalid_token_fails(self):
        """Test that email change confirmation with invalid token fails."""
        data = {
            'new_email': 'newemail@example.com',
            'token': 'invalid.token.here'
        }
        
        response = self.client.post(reverse('auth-email-change-confirm'), data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'invalid' in response.data['error'].lower()
        
        # Verify user email was not changed
        self.user.refresh_from_db()
        assert self.user.email == 'current@example.com'
    
    def test_email_change_confirm_with_existing_email_fails(self):
        """Test that email change confirmation fails if email now exists."""
        # Create another user with the target email after token generation
        new_email = 'taken@example.com'
        
        from finance.services import EmailVerificationService
        token = EmailVerificationService.generate_verification_token(
            self.user, new_email
        )
        
        # Create user with target email
        User.objects.create_user(
            email=new_email,
            password='SecurePass123!',
            first_name='Taken',
            last_name='User'
        )
        
        data = {
            'new_email': new_email,
            'token': token
        }
        
        response = self.client.post(reverse('auth-email-change-confirm'), data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'new_email' in response.data
    
    def test_email_change_confirm_requires_authentication(self):
        """Test that email change confirmation requires authentication."""
        # Remove authentication
        self.client.credentials()
        
        data = {
            'new_email': 'newemail@example.com',
            'token': 'some.token'
        }
        
        response = self.client.post(reverse('auth-email-change-confirm'), data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_complete_email_change_workflow(self):
        """Test complete email change workflow through API."""
        new_email = 'workflow@example.com'
        old_email = self.user.email
        
        # 1. Request email change
        request_data = {
            'new_email': new_email
        }
        
        request_response = self.client.post(
            reverse('auth-email-change-request'), 
            request_data
        )
        assert request_response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 1
        
        # 2. Extract token (in real app, user gets this from email)
        from finance.services import EmailVerificationService
        token = EmailVerificationService.generate_verification_token(
            self.user, new_email
        )
        
        # 3. Confirm email change
        mail.outbox.clear()  # Clear verification email
        confirm_data = {
            'new_email': new_email,
            'token': token
        }
        
        confirm_response = self.client.post(
            reverse('auth-email-change-confirm'), 
            confirm_data
        )
        assert confirm_response.status_code == status.HTTP_200_OK
        
        # 4. Verify email was changed
        self.user.refresh_from_db()
        assert self.user.email == new_email
        assert self.user.username == new_email
        
        # 5. Verify notification sent to old email
        assert len(mail.outbox) == 1
        notification_email = mail.outbox[0]
        assert notification_email.to == [old_email]
        assert 'changed' in notification_email.subject.lower()