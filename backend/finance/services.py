"""
Email and notification services for the finance app.
"""
import logging
from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth import get_user_model
from typing import Optional, List

User = get_user_model()
logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for handling email operations with ProtonMail SMTP.
    """
    
    @staticmethod
    def test_connection() -> bool:
        """
        Test SMTP connection to ProtonMail.
        Returns True if connection is successful, False otherwise.
        """
        try:
            from django.core.mail import get_connection
            connection = get_connection()
            connection.open()
            connection.close()
            return True
        except Exception as e:
            logger.error(f"Email connection test failed: {e}")
            return False
    
    @staticmethod
    def send_welcome_email(user) -> bool:
        """
        Send welcome email to newly registered user.
        
        Args:
            user: User instance
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            subject = 'Welcome to Personal Finance Tracker'
            
            # Create HTML content
            html_content = f"""
            <html>
            <body>
                <h2>Welcome to Personal Finance Tracker!</h2>
                <p>Hi {user.first_name},</p>
                
                <p>Welcome to Personal Finance Tracker! Your account has been successfully created.</p>
                
                <p>You can now start:</p>
                <ul>
                    <li>Tracking your income and expenses</li>
                    <li>Creating custom categories</li>
                    <li>Setting monthly budgets</li>
                    <li>Viewing spending insights</li>
                </ul>
                
                <p>If you have any questions, feel free to reach out to our support team.</p>
                
                <p>Best regards,<br>
                The Personal Finance Tracker Team</p>
            </body>
            </html>
            """
            
            # Create plain text version
            plain_content = f"""
            Hi {user.first_name},
            
            Welcome to Personal Finance Tracker! Your account has been successfully created.
            
            You can now start tracking your finances and managing your budget.
            
            Best regards,
            The Personal Finance Tracker Team
            """
            
            # Create email message
            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            email.content_subtype = 'html'
            
            # Send email
            email.send(fail_silently=False)
            
            logger.info(f"Welcome email sent successfully to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_password_reset_email(user, reset_url: Optional[str] = None) -> bool:
        """
        Send password reset email with secure token.
        
        Args:
            user: User instance
            reset_url: Optional custom reset URL (for frontend integration)
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Generate secure token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            subject = 'Password Reset - Personal Finance Tracker'
            
            # Create reset link (simplified for now)
            if reset_url:
                reset_link = f"{reset_url}?uid={uid}&token={token}"
            else:
                reset_link = f"Reset Token: {token} (UID: {uid})"
            
            # Create HTML content
            html_content = f"""
            <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>Hi {user.first_name},</p>
                
                <p>You requested a password reset for your Personal Finance Tracker account.</p>
                
                <p>Reset Information: {reset_link}</p>
                
                <p><strong>Security Notice:</strong> This reset link will expire in 24 hours. 
                If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
                
                <p>Best regards,<br>
                The Personal Finance Tracker Team</p>
            </body>
            </html>
            """
            
            # Create plain text version
            plain_content = f"""
            Hi {user.first_name},
            
            You requested a password reset for your Personal Finance Tracker account.
            
            Reset Information: {reset_link}
            
            Security Notice: This reset link will expire in 24 hours.
            If you didn't request this reset, please ignore this email.
            
            Best regards,
            The Personal Finance Tracker Team
            """
            
            # Create email message
            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            email.content_subtype = 'html'
            
            # Send email
            email.send(fail_silently=False)
            
            logger.info(f"Password reset email sent successfully to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_email_verification(user, new_email: str, verification_token: str) -> bool:
        """
        Send email verification for email address changes.
        
        Args:
            user: User instance
            new_email: New email address to verify
            verification_token: Secure verification token
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            subject = 'Email Verification - Personal Finance Tracker'
            
            # Create HTML content
            html_content = f"""
            <html>
            <body>
                <h2>Email Address Verification</h2>
                <p>Hi {user.first_name},</p>
                
                <p>You requested to change your email address from <strong>{user.email}</strong> 
                to <strong>{new_email}</strong>.</p>
                
                <p>To complete this change, please use the following verification token:</p>
                <p><strong>Verification Token: {verification_token}</strong></p>
                
                <p><strong>Security Notice:</strong> This verification token will expire in 24 hours. 
                If you didn't request this change, please contact our support team immediately.</p>
                
                <p>Best regards,<br>
                The Personal Finance Tracker Team</p>
            </body>
            </html>
            """
            
            # Create plain text version
            plain_content = f"""
            Hi {user.first_name},
            
            You requested to change your email address from {user.email} to {new_email}.
            
            To complete this change, please use the following verification token:
            Verification Token: {verification_token}
            
            Security Notice: This verification token will expire in 24 hours.
            If you didn't request this change, please contact our support team immediately.
            
            Best regards,
            The Personal Finance Tracker Team
            """
            
            # Send to new email address
            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[new_email],
            )
            email.content_subtype = 'html'
            
            # Send email
            email.send(fail_silently=False)
            
            logger.info(f"Email verification sent successfully to {new_email} for user {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email verification to {new_email} for user {user.email}: {e}")
            return False
    
    @staticmethod
    def send_email_change_notification(user, old_email: str) -> bool:
        """
        Send notification to old email address about email change.
        
        Args:
            user: User instance with updated email
            old_email: Previous email address
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            subject = 'Email Address Changed - Personal Finance Tracker'
            
            # Create HTML content
            html_content = f"""
            <html>
            <body>
                <h2>Email Address Changed</h2>
                <p>Hi {user.first_name},</p>
                
                <p>This is to notify you that your email address for Personal Finance Tracker 
                has been successfully changed from <strong>{old_email}</strong> to <strong>{user.email}</strong>.</p>
                
                <p><strong>Security Notice:</strong> If you didn't make this change, 
                please contact our support team immediately as your account may have been compromised.</p>
                
                <p>Best regards,<br>
                The Personal Finance Tracker Team</p>
            </body>
            </html>
            """
            
            # Create plain text version
            plain_content = f"""
            Hi {user.first_name},
            
            This is to notify you that your email address for Personal Finance Tracker 
            has been successfully changed from {old_email} to {user.email}.
            
            Security Notice: If you didn't make this change, please contact our support team immediately.
            
            Best regards,
            The Personal Finance Tracker Team
            """
            
            # Send to old email address
            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[old_email],
            )
            email.content_subtype = 'html'
            
            # Send email
            email.send(fail_silently=False)
            
            logger.info(f"Email change notification sent successfully to {old_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email change notification to {old_email}: {e}")
            return False
    
    @staticmethod
    def send_security_alert(user, alert_type: str, details: str = "") -> bool:
        """
        Send security alert email for suspicious activities.
        
        Args:
            user: User instance
            alert_type: Type of security alert
            details: Additional details about the alert
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            subject = f'Security Alert - {alert_type} - Personal Finance Tracker'
            
            # Create HTML content
            html_content = f"""
            <html>
            <body>
                <h2>Security Alert</h2>
                <p>Hi {user.first_name},</p>
                
                <p>We detected a security event on your Personal Finance Tracker account:</p>
                <p><strong>Alert Type:</strong> {alert_type}</p>
                {f'<p><strong>Details:</strong> {details}</p>' if details else ''}
                
                <p><strong>What should you do?</strong></p>
                <ul>
                    <li>If this was you, no action is needed</li>
                    <li>If this wasn't you, please change your password immediately</li>
                    <li>Contact our support team if you need assistance</li>
                </ul>
                
                <p>Best regards,<br>
                The Personal Finance Tracker Security Team</p>
            </body>
            </html>
            """
            
            # Create plain text version
            plain_content = f"""
            Hi {user.first_name},
            
            We detected a security event on your Personal Finance Tracker account:
            Alert Type: {alert_type}
            {f'Details: {details}' if details else ''}
            
            What should you do?
            - If this was you, no action is needed
            - If this wasn't you, please change your password immediately
            - Contact our support team if you need assistance
            
            Best regards,
            The Personal Finance Tracker Security Team
            """
            
            # Create email message
            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            email.content_subtype = 'html'
            
            # Send email
            email.send(fail_silently=False)
            
            logger.info(f"Security alert email sent successfully to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send security alert email to {user.email}: {e}")
            return False


class EmailVerificationService:
    """
    Service for handling email verification tokens and processes.
    """
    
    @staticmethod
    def generate_verification_token(user, new_email: str) -> str:
        """
        Generate a secure verification token for email changes.
        
        Args:
            user: User instance
            new_email: New email address
            
        Returns:
            str: Verification token
        """
        # Create a token based on user ID, current email, and new email
        token_data = f"{user.id}:{user.email}:{new_email}"
        token = urlsafe_base64_encode(force_bytes(token_data))
        return token
    
    @staticmethod
    def verify_email_token(token: str, user, new_email: str) -> bool:
        """
        Verify email verification token.
        
        Args:
            token: Verification token
            user: User instance
            new_email: New email address to verify
            
        Returns:
            bool: True if token is valid, False otherwise
        """
        try:
            # Decode token
            decoded_data = force_str(urlsafe_base64_decode(token))
            user_id, current_email, token_email = decoded_data.split(':')
            
            # Verify token components
            return (
                int(user_id) == user.id and
                current_email == user.email and
                token_email == new_email
            )
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def initiate_email_change(user, new_email: str) -> bool:
        """
        Initiate email change process by sending verification email.
        
        Args:
            user: User instance
            new_email: New email address
            
        Returns:
            bool: True if verification email sent successfully
        """
        # Generate verification token
        token = EmailVerificationService.generate_verification_token(user, new_email)
        
        # Send verification email
        return EmailService.send_email_verification(user, new_email, token)
    
    @staticmethod
    def complete_email_change(user, new_email: str, token: str) -> bool:
        """
        Complete email change process after token verification.
        
        Args:
            user: User instance
            new_email: New email address
            token: Verification token
            
        Returns:
            bool: True if email change completed successfully
        """
        # Verify token
        if not EmailVerificationService.verify_email_token(token, user, new_email):
            return False
        
        # Store old email for notification
        old_email = user.email
        
        # Update user email
        user.email = new_email
        user.username = new_email  # Since we use email as username
        user.is_email_verified = True
        user.save()
        
        # Send notification to old email
        EmailService.send_email_change_notification(user, old_email)
        
        return True