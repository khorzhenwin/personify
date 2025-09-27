"""
TDD tests for email service integration with ProtonMail.
"""
import pytest
from django.test import TestCase, override_settings
from django.core import mail
from django.contrib.auth import get_user_model
from django.conf import settings
from unittest.mock import patch, MagicMock
from django.core.mail import get_connection
from django.core.mail.backends.locmem import EmailBackend

from .services import EmailService, EmailVerificationService

User = get_user_model()


@pytest.mark.django_db
class TestEmailServiceConfiguration:
    """
    TDD tests for email service configuration and connection.
    """
    
    def test_email_service_exists(self):
        """Test that EmailService class exists and can be instantiated."""
        service = EmailService()
        assert service is not None
    
    def test_email_settings_configured(self):
        """Test that email settings are properly configured for ProtonMail."""
        assert hasattr(settings, 'EMAIL_HOST')
        assert hasattr(settings, 'EMAIL_PORT')
        assert hasattr(settings, 'EMAIL_USE_TLS')
        assert hasattr(settings, 'EMAIL_HOST_USER')
        assert hasattr(settings, 'DEFAULT_FROM_EMAIL')
        
        # Check ProtonMail specific settings
        assert settings.EMAIL_HOST == 'smtp.protonmail.com'
        assert settings.EMAIL_PORT == 587
        assert settings.EMAIL_USE_TLS is True
        assert 'protonmail.com' in settings.EMAIL_HOST_USER
    
    @patch('django.core.mail.get_connection')
    def test_email_connection_test_success(self, mock_get_connection):
        """Test successful email connection test."""
        # Mock successful connection
        mock_connection = MagicMock()
        mock_connection.open.return_value = None
        mock_connection.close.return_value = None
        mock_get_connection.return_value = mock_connection
        
        result = EmailService.test_connection()
        
        assert result is True
        mock_connection.open.assert_called_once()
        mock_connection.close.assert_called_once()
    
    @patch('django.core.mail.get_connection')
    def test_email_connection_test_failure(self, mock_get_connection):
        """Test email connection test failure handling."""
        # Mock connection failure
        mock_connection = MagicMock()
        mock_connection.open.side_effect = Exception("Connection failed")
        mock_get_connection.return_value = mock_connection
        
        result = EmailService.test_connection()
        
        assert result is False
        mock_connection.open.assert_called_once()
    
    def test_email_backend_configured(self):
        """Test that email backend is configured for SMTP (or locmem for testing)."""
        # In testing, Django uses locmem backend, in production it should be SMTP
        expected_backends = [
            'django.core.mail.backends.smtp.EmailBackend',
            'django.core.mail.backends.locmem.EmailBackend'  # For testing
        ]
        assert settings.EMAIL_BACKEND in expected_backends


@pytest.mark.django_db
class TestWelcomeEmailSending:
    """
    TDD tests for welcome email sending after registration.
    """
    
    def setup_method(self):
        """Set up test user for each test."""
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='SecurePass123!',
            first_name='John',
            last_name='Doe'
        )
    
    def test_send_welcome_email_success(self):
        """Test successful welcome email sending."""
        result = EmailService.send_welcome_email(self.user)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        welcome_email = mail.outbox[0]
        assert welcome_email.to == ['testuser@example.com']
        assert 'welcome' in welcome_email.subject.lower()
        assert 'John' in welcome_email.body
        assert 'Personal Finance Tracker' in welcome_email.body
    
    def test_welcome_email_contains_user_name(self):
        """Test that welcome email contains user's first name."""
        EmailService.send_welcome_email(self.user)
        
        assert len(mail.outbox) == 1
        welcome_email = mail.outbox[0]
        assert self.user.first_name in welcome_email.body
    
    def test_welcome_email_contains_app_features(self):
        """Test that welcome email mentions app features."""
        EmailService.send_welcome_email(self.user)
        
        assert len(mail.outbox) == 1
        welcome_email = mail.outbox[0]
        
        # Check for key features mentioned
        body_lower = welcome_email.body.lower()
        assert any(feature in body_lower for feature in [
            'tracking', 'budget', 'expense', 'income', 'categories'
        ])
    
    def test_welcome_email_html_format(self):
        """Test that welcome email is sent in HTML format."""
        EmailService.send_welcome_email(self.user)
        
        assert len(mail.outbox) == 1
        welcome_email = mail.outbox[0]
        
        # Check that email has HTML content
        assert '<html>' in welcome_email.body
        assert '<body>' in welcome_email.body
        assert '<h2>' in welcome_email.body
    
    def test_welcome_email_from_address(self):
        """Test that welcome email is sent from correct address."""
        EmailService.send_welcome_email(self.user)
        
        assert len(mail.outbox) == 1
        welcome_email = mail.outbox[0]
        assert welcome_email.from_email == settings.DEFAULT_FROM_EMAIL
    
    @patch('finance.services.EmailMessage.send')
    def test_welcome_email_failure_handling(self, mock_send):
        """Test welcome email failure handling."""
        # Mock email sending failure
        mock_send.side_effect = Exception("SMTP Error")
        
        result = EmailService.send_welcome_email(self.user)
        
        assert result is False
        mock_send.assert_called_once()
    
    def test_welcome_email_with_special_characters_in_name(self):
        """Test welcome email with special characters in user name."""
        user_with_special_chars = User.objects.create_user(
            email='special@example.com',
            password='SecurePass123!',
            first_name='José',
            last_name='García'
        )
        
        result = EmailService.send_welcome_email(user_with_special_chars)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        welcome_email = mail.outbox[0]
        assert 'José' in welcome_email.body


@pytest.mark.django_db
class TestPasswordResetEmailGeneration:
    """
    TDD tests for password reset email generation and sending.
    """
    
    def setup_method(self):
        """Set up test user for each test."""
        self.user = User.objects.create_user(
            email='resetuser@example.com',
            password='OldPass123!',
            first_name='Reset',
            last_name='User'
        )
    
    def test_send_password_reset_email_success(self):
        """Test successful password reset email sending."""
        result = EmailService.send_password_reset_email(self.user)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        reset_email = mail.outbox[0]
        assert reset_email.to == ['resetuser@example.com']
        assert 'password reset' in reset_email.subject.lower()
        assert 'Reset' in reset_email.body
    
    def test_password_reset_email_contains_token(self):
        """Test that password reset email contains a reset token."""
        EmailService.send_password_reset_email(self.user)
        
        assert len(mail.outbox) == 1
        reset_email = mail.outbox[0]
        
        # Check for token-like content (base64 encoded strings)
        import re
        token_pattern = r'[a-zA-Z0-9]{10,}'
        assert re.search(token_pattern, reset_email.body)
    
    def test_password_reset_email_security_notice(self):
        """Test that password reset email contains security notice."""
        EmailService.send_password_reset_email(self.user)
        
        assert len(mail.outbox) == 1
        reset_email = mail.outbox[0]
        
        body_lower = reset_email.body.lower()
        assert 'security' in body_lower
        assert 'expire' in body_lower
        assert '24 hours' in body_lower
    
    def test_password_reset_email_with_custom_url(self):
        """Test password reset email with custom reset URL."""
        custom_url = "https://frontend.example.com/reset-password"
        
        EmailService.send_password_reset_email(self.user, custom_url)
        
        assert len(mail.outbox) == 1
        reset_email = mail.outbox[0]
        assert custom_url in reset_email.body
    
    def test_password_reset_email_html_format(self):
        """Test that password reset email is sent in HTML format."""
        EmailService.send_password_reset_email(self.user)
        
        assert len(mail.outbox) == 1
        reset_email = mail.outbox[0]
        
        # Check that email has HTML content
        assert '<html>' in reset_email.body
        assert '<body>' in reset_email.body
        assert '<h2>' in reset_email.body
    
    @patch('finance.services.EmailMessage.send')
    def test_password_reset_email_failure_handling(self, mock_send):
        """Test password reset email failure handling."""
        # Mock email sending failure
        mock_send.side_effect = Exception("SMTP Error")
        
        result = EmailService.send_password_reset_email(self.user)
        
        assert result is False
        mock_send.assert_called_once()
    
    def test_password_reset_email_from_address(self):
        """Test that password reset email is sent from correct address."""
        EmailService.send_password_reset_email(self.user)
        
        assert len(mail.outbox) == 1
        reset_email = mail.outbox[0]
        assert reset_email.from_email == settings.DEFAULT_FROM_EMAIL


@pytest.mark.django_db
class TestEmailVerificationForProfileUpdates:
    """
    TDD tests for email verification during profile updates.
    """
    
    def setup_method(self):
        """Set up test user for each test."""
        self.user = User.objects.create_user(
            email='current@example.com',
            password='SecurePass123!',
            first_name='Current',
            last_name='User'
        )
        self.new_email = 'newemail@example.com'
    
    def test_email_verification_service_exists(self):
        """Test that EmailVerificationService exists."""
        service = EmailVerificationService()
        assert service is not None
    
    def test_generate_verification_token(self):
        """Test verification token generation."""
        token = EmailVerificationService.generate_verification_token(
            self.user, self.new_email
        )
        
        assert token is not None
        assert len(token) > 10  # Should be a reasonable length
        assert isinstance(token, str)
    
    def test_verify_email_token_valid(self):
        """Test verification of valid email token."""
        token = EmailVerificationService.generate_verification_token(
            self.user, self.new_email
        )
        
        is_valid = EmailVerificationService.verify_email_token(
            token, self.user, self.new_email
        )
        
        assert is_valid is True
    
    def test_verify_email_token_invalid(self):
        """Test verification of invalid email token."""
        invalid_token = "invalid.token.here"
        
        is_valid = EmailVerificationService.verify_email_token(
            invalid_token, self.user, self.new_email
        )
        
        assert is_valid is False
    
    def test_verify_email_token_wrong_user(self):
        """Test verification fails with wrong user."""
        token = EmailVerificationService.generate_verification_token(
            self.user, self.new_email
        )
        
        # Create different user
        other_user = User.objects.create_user(
            email='other@example.com',
            password='SecurePass123!',
            first_name='Other',
            last_name='User'
        )
        
        is_valid = EmailVerificationService.verify_email_token(
            token, other_user, self.new_email
        )
        
        assert is_valid is False
    
    def test_verify_email_token_wrong_email(self):
        """Test verification fails with wrong email."""
        token = EmailVerificationService.generate_verification_token(
            self.user, self.new_email
        )
        
        wrong_email = 'wrong@example.com'
        is_valid = EmailVerificationService.verify_email_token(
            token, self.user, wrong_email
        )
        
        assert is_valid is False
    
    def test_send_email_verification_success(self):
        """Test successful email verification sending."""
        token = "test_verification_token"
        
        result = EmailService.send_email_verification(
            self.user, self.new_email, token
        )
        
        assert result is True
        assert len(mail.outbox) == 1
        
        verification_email = mail.outbox[0]
        assert verification_email.to == [self.new_email]
        assert 'verification' in verification_email.subject.lower()
        assert token in verification_email.body
    
    def test_email_verification_contains_both_emails(self):
        """Test that verification email mentions both old and new email."""
        token = "test_verification_token"
        
        EmailService.send_email_verification(self.user, self.new_email, token)
        
        assert len(mail.outbox) == 1
        verification_email = mail.outbox[0]
        
        assert self.user.email in verification_email.body
        assert self.new_email in verification_email.body
    
    def test_email_verification_security_notice(self):
        """Test that verification email contains security notice."""
        token = "test_verification_token"
        
        EmailService.send_email_verification(self.user, self.new_email, token)
        
        assert len(mail.outbox) == 1
        verification_email = mail.outbox[0]
        
        body_lower = verification_email.body.lower()
        assert 'security' in body_lower
        assert 'expire' in body_lower
        assert '24 hours' in body_lower
    
    def test_initiate_email_change_process(self):
        """Test initiating email change process."""
        result = EmailVerificationService.initiate_email_change(
            self.user, self.new_email
        )
        
        assert result is True
        assert len(mail.outbox) == 1
        
        verification_email = mail.outbox[0]
        assert verification_email.to == [self.new_email]
    
    def test_complete_email_change_success(self):
        """Test successful email change completion."""
        # Generate token
        token = EmailVerificationService.generate_verification_token(
            self.user, self.new_email
        )
        
        # Complete email change
        result = EmailVerificationService.complete_email_change(
            self.user, self.new_email, token
        )
        
        assert result is True
        
        # Refresh user from database
        self.user.refresh_from_db()
        assert self.user.email == self.new_email
        assert self.user.username == self.new_email
        assert self.user.is_email_verified is True
    
    def test_complete_email_change_sends_notification(self):
        """Test that completing email change sends notification to old email."""
        old_email = self.user.email
        token = EmailVerificationService.generate_verification_token(
            self.user, self.new_email
        )
        
        EmailVerificationService.complete_email_change(
            self.user, self.new_email, token
        )
        
        # Should have notification email
        assert len(mail.outbox) == 1
        notification_email = mail.outbox[0]
        assert notification_email.to == [old_email]
        assert 'changed' in notification_email.subject.lower()
    
    def test_complete_email_change_invalid_token(self):
        """Test email change completion with invalid token."""
        invalid_token = "invalid.token"
        
        result = EmailVerificationService.complete_email_change(
            self.user, self.new_email, invalid_token
        )
        
        assert result is False
        
        # User email should remain unchanged
        self.user.refresh_from_db()
        assert self.user.email == 'current@example.com'
    
    @patch('finance.services.EmailMessage.send')
    def test_email_verification_failure_handling(self, mock_send):
        """Test email verification failure handling."""
        mock_send.side_effect = Exception("SMTP Error")
        
        result = EmailService.send_email_verification(
            self.user, self.new_email, "test_token"
        )
        
        assert result is False


@pytest.mark.django_db
class TestEmailChangeNotification:
    """
    TDD tests for email change notification functionality.
    """
    
    def setup_method(self):
        """Set up test user for each test."""
        self.user = User.objects.create_user(
            email='newemail@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User'
        )
        self.old_email = 'oldemail@example.com'
    
    def test_send_email_change_notification_success(self):
        """Test successful email change notification sending."""
        result = EmailService.send_email_change_notification(
            self.user, self.old_email
        )
        
        assert result is True
        assert len(mail.outbox) == 1
        
        notification_email = mail.outbox[0]
        assert notification_email.to == [self.old_email]
        assert 'changed' in notification_email.subject.lower()
    
    def test_email_change_notification_contains_both_emails(self):
        """Test that notification contains both old and new email addresses."""
        EmailService.send_email_change_notification(self.user, self.old_email)
        
        assert len(mail.outbox) == 1
        notification_email = mail.outbox[0]
        
        assert self.old_email in notification_email.body
        assert self.user.email in notification_email.body
    
    def test_email_change_notification_security_warning(self):
        """Test that notification contains security warning."""
        EmailService.send_email_change_notification(self.user, self.old_email)
        
        assert len(mail.outbox) == 1
        notification_email = mail.outbox[0]
        
        body_lower = notification_email.body.lower()
        assert 'security' in body_lower
        assert 'contact' in body_lower
        assert 'support' in body_lower
    
    @patch('finance.services.EmailMessage.send')
    def test_email_change_notification_failure_handling(self, mock_send):
        """Test email change notification failure handling."""
        mock_send.side_effect = Exception("SMTP Error")
        
        result = EmailService.send_email_change_notification(
            self.user, self.old_email
        )
        
        assert result is False


@pytest.mark.django_db
class TestSecurityAlertEmails:
    """
    TDD tests for security alert email functionality.
    """
    
    def setup_method(self):
        """Set up test user for each test."""
        self.user = User.objects.create_user(
            email='security@example.com',
            password='SecurePass123!',
            first_name='Security',
            last_name='User'
        )
    
    def test_send_security_alert_success(self):
        """Test successful security alert email sending."""
        alert_type = "Suspicious Login Attempt"
        details = "Login from unknown device"
        
        result = EmailService.send_security_alert(
            self.user, alert_type, details
        )
        
        assert result is True
        assert len(mail.outbox) == 1
        
        alert_email = mail.outbox[0]
        assert alert_email.to == [self.user.email]
        assert 'security alert' in alert_email.subject.lower()
        assert alert_type in alert_email.body
        assert details in alert_email.body
    
    def test_security_alert_without_details(self):
        """Test security alert email without additional details."""
        alert_type = "Password Changed"
        
        result = EmailService.send_security_alert(self.user, alert_type)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        alert_email = mail.outbox[0]
        assert alert_type in alert_email.body
    
    def test_security_alert_contains_instructions(self):
        """Test that security alert contains user instructions."""
        EmailService.send_security_alert(self.user, "Test Alert")
        
        assert len(mail.outbox) == 1
        alert_email = mail.outbox[0]
        
        body_lower = alert_email.body.lower()
        assert 'what should you do' in body_lower
        assert 'password' in body_lower
        assert 'support' in body_lower
    
    @patch('finance.services.EmailMessage.send')
    def test_security_alert_failure_handling(self, mock_send):
        """Test security alert failure handling."""
        mock_send.side_effect = Exception("SMTP Error")
        
        result = EmailService.send_security_alert(self.user, "Test Alert")
        
        assert result is False


@pytest.mark.django_db
class TestEmailServiceIntegration:
    """
    Integration tests for email service with authentication system.
    """
    
    def setup_method(self):
        """Set up test user for each test."""
        self.user = User.objects.create_user(
            email='integration@example.com',
            password='SecurePass123!',
            first_name='Integration',
            last_name='Test'
        )
    
    def test_complete_email_change_workflow(self):
        """Test complete email change workflow."""
        new_email = 'newintegration@example.com'
        old_email = self.user.email
        
        # 1. Initiate email change
        result = EmailVerificationService.initiate_email_change(
            self.user, new_email
        )
        assert result is True
        assert len(mail.outbox) == 1
        
        # 2. Extract token from email (simplified)
        verification_email = mail.outbox[0]
        # In real implementation, user would get this from email
        token = EmailVerificationService.generate_verification_token(
            self.user, new_email
        )
        
        # 3. Complete email change
        mail.outbox.clear()  # Clear previous emails
        result = EmailVerificationService.complete_email_change(
            self.user, new_email, token
        )
        assert result is True
        
        # 4. Verify user email updated
        self.user.refresh_from_db()
        assert self.user.email == new_email
        
        # 5. Verify notification sent to old email
        assert len(mail.outbox) == 1
        notification_email = mail.outbox[0]
        assert notification_email.to == [old_email]
    
    def test_email_service_with_authentication_system_compatibility(self):
        """Test that email service works with existing authentication system."""
        # Test welcome email (already integrated in auth views)
        result = EmailService.send_welcome_email(self.user)
        assert result is True
        
        # Test password reset email (already integrated in auth views)
        result = EmailService.send_password_reset_email(self.user)
        assert result is True
        
        # Verify both emails sent
        assert len(mail.outbox) == 2
        
        # Verify email addresses and subjects
        welcome_email = mail.outbox[0]
        reset_email = mail.outbox[1]
        
        assert welcome_email.to == [self.user.email]
        assert reset_email.to == [self.user.email]
        assert 'welcome' in welcome_email.subject.lower()
        assert 'password reset' in reset_email.subject.lower()
    
    def test_all_email_types_use_correct_from_address(self):
        """Test that all email types use the correct from address."""
        new_email = 'test@example.com'
        
        # Send all types of emails
        EmailService.send_welcome_email(self.user)
        EmailService.send_password_reset_email(self.user)
        EmailService.send_email_verification(self.user, new_email, "token")
        EmailService.send_email_change_notification(self.user, "old@example.com")
        EmailService.send_security_alert(self.user, "Test Alert")
        
        # Verify all emails use correct from address
        assert len(mail.outbox) == 5
        for email in mail.outbox:
            assert email.from_email == settings.DEFAULT_FROM_EMAIL
    
    def test_email_service_error_logging(self):
        """Test that email service errors are properly logged."""
        with patch('finance.services.logger') as mock_logger:
            with patch('finance.services.EmailMessage.send') as mock_send:
                mock_send.side_effect = Exception("Test error")
                
                # Try to send email
                result = EmailService.send_welcome_email(self.user)
                
                assert result is False
                mock_logger.error.assert_called_once()
                
                # Verify error message contains relevant information
                error_call = mock_logger.error.call_args[0][0]
                assert 'Failed to send welcome email' in error_call
                assert self.user.email in error_call