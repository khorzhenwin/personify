"""
Email and notification services for the finance app.
"""
import logging
import re
from collections import Counter
from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from typing import Optional, List, Dict

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


class CategorySuggestionService:
    """
    Service for smart category suggestions based on transaction descriptions.
    """
    
    # Predefined keyword patterns for common categories
    CATEGORY_KEYWORDS = {
        'groceries': [
            'grocery', 'groceries', 'supermarket', 'walmart', 'target', 'costco',
            'safeway', 'kroger', 'whole foods', 'trader joe', 'market', 'store',
            'food', 'produce', 'milk', 'bread', 'shopping'
        ],
        'transportation': [
            'uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus',
            'train', 'subway', 'transport', 'commute', 'car', 'vehicle',
            'station', 'fare', 'toll', 'ride', 'bus ticket', 'train ticket'
        ],
        'dining': [
            'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'pizza',
            'burger', 'lunch', 'dinner', 'breakfast', 'takeout', 'delivery',
            'dining', 'eat', 'food truck', 'bar', 'pub'
        ],
        'entertainment': [
            'movie', 'cinema', 'theater', 'netflix', 'spotify', 'game', 'gaming',
            'concert', 'show', 'movie ticket', 'entertainment', 'fun', 'park',
            'museum', 'zoo', 'beach', 'recreation'
        ],
        'shopping': [
            'amazon', 'ebay', 'online', 'purchase', 'buy', 'shop', 'mall',
            'store', 'retail', 'clothing', 'shoes', 'electronics'
        ],
        'utilities': [
            'electric', 'electricity', 'water', 'gas bill', 'internet',
            'phone', 'cable', 'utility', 'bill', 'service'
        ],
        'healthcare': [
            'doctor', 'hospital', 'pharmacy', 'medical', 'health', 'dentist',
            'clinic', 'medicine', 'prescription', 'insurance'
        ]
    }
    
    @classmethod
    def suggest_category(cls, user, description: str):
        """
        Suggest a category based on transaction description using keyword matching.
        
        Args:
            user: User instance
            description: Transaction description
            
        Returns:
            Category instance or None if no match found
        """
        if not description:
            return None
        
        # Import here to avoid circular imports
        from .models import Category
        
        # Get user's categories
        user_categories = Category.objects.filter(user=user)
        
        # Convert description to lowercase for case-insensitive matching
        description_lower = description.lower()
        
        # Score each category based on keyword matches
        category_scores = {}
        
        for category in user_categories:
            score = cls._calculate_category_score(category, description_lower)
            if score > 0:
                category_scores[category] = score
        
        # Return category with highest score
        if category_scores:
            # If there are ties, prefer the category with more specific matches
            max_score = max(category_scores.values())
            tied_categories = [cat for cat, score in category_scores.items() if score == max_score]
            
            if len(tied_categories) == 1:
                return tied_categories[0]
            else:
                # For ties, prefer categories that match more keywords
                best_category = None
                best_keyword_count = 0
                
                for category in tied_categories:
                    keyword_count = cls._count_keyword_matches(category, description_lower)
                    if keyword_count > best_keyword_count:
                        best_keyword_count = keyword_count
                        best_category = category
                
                return best_category or tied_categories[0]
        
        return None
    
    @classmethod
    def _calculate_description_similarity(cls, desc1: str, desc2: str) -> float:
        """
        Calculate similarity between two descriptions using simple word matching.
        
        Args:
            desc1: First description
            desc2: Second description
            
        Returns:
            Similarity score between 0 and 1
        """
        words1 = set(desc1.lower().split())
        words2 = set(desc2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    @classmethod
    def suggest_category_with_history(cls, user, description: str):
        """
        Suggest category based on description and historical transaction patterns.
        
        Args:
            user: User instance
            description: Transaction description
            
        Returns:
            Category instance or None if no match found
        """
        # Import here to avoid circular imports
        from .models import Category, Transaction
        
        # First try keyword-based suggestion
        keyword_suggestion = cls.suggest_category(user, description)
        if keyword_suggestion:
            return keyword_suggestion
        
        # If no keyword match, try historical pattern matching
        description_lower = description.lower()
        
        # Find similar historical transactions
        similar_transactions = Transaction.objects.filter(
            user=user,
            category__isnull=False
        ).exclude(category=None)
        
        # Score categories based on description similarity
        category_scores = Counter()
        
        for transaction in similar_transactions:
            similarity_score = cls._calculate_description_similarity(
                description_lower, 
                transaction.description.lower()
            )
            
            if similarity_score > 0.3:  # Threshold for similarity
                category_scores[transaction.category] += similarity_score
        
        # Return most frequent category from similar transactions
        if category_scores:
            return category_scores.most_common(1)[0][0]
        
        return None
    
    @classmethod
    def _calculate_category_score(cls, category, description_lower: str) -> float:
        """
        Calculate score for a category based on keyword matches.
        
        Args:
            category: Category instance
            description_lower: Lowercase transaction description
            
        Returns:
            float: Score between 0 and 1
        """
        score = 0.0
        category_name_lower = category.name.lower()
        
        # Direct category name match (highest score)
        if category_name_lower in description_lower:
            score += 1.0
        
        # Check predefined keywords for common category types
        for category_type, keywords in cls.CATEGORY_KEYWORDS.items():
            # Check if category name matches this type
            category_matches_type = False
            
            # Direct type match
            if category_type in category_name_lower:
                category_matches_type = True
            # Check for related words in category name
            elif category_type == 'transportation' and any(word in category_name_lower for word in ['transport', 'travel', 'commute']):
                category_matches_type = True
            elif category_type == 'dining' and any(word in category_name_lower for word in ['dining', 'restaurant', 'food']):
                category_matches_type = True
            elif category_type == 'groceries' and any(word in category_name_lower for word in ['grocery', 'groceries', 'food']):
                category_matches_type = True
            elif category_type == 'entertainment' and any(word in category_name_lower for word in ['entertainment', 'fun', 'leisure']):
                category_matches_type = True
            
            if category_matches_type:
                # This category matches a known type, check for keywords in description
                keyword_matches = 0
                for keyword in keywords:
                    # Use word boundaries to avoid partial matches
                    if ' ' in keyword:
                        # For multi-word keywords, check exact phrase
                        if keyword in description_lower:
                            keyword_matches += 1
                    else:
                        # For single words, check word boundaries
                        import re
                        pattern = r'\b' + re.escape(keyword) + r'\b'
                        if re.search(pattern, description_lower):
                            keyword_matches += 1
                
                if keyword_matches > 0:
                    # Give higher score for more keyword matches
                    score += 0.6 + (keyword_matches * 0.2)
                    # Cap the score contribution from this category type
                    score = min(score, 1.0)
        
        # Partial name matches
        category_words = category_name_lower.split()
        for word in category_words:
            if len(word) > 2 and word in description_lower:
                score += 0.5
        
        # Description-based matching
        if category.description:
            description_words = category.description.lower().split()
            for word in description_words:
                if len(word) > 3 and word in description_lower:
                    score += 0.3
        
        return min(score, 1.0)  # Cap at 1.0
    
    @classmethod
    def _count_keyword_matches(cls, category, description_lower: str) -> int:
        """
        Count the number of keyword matches for a category.
        
        Args:
            category: Category instance
            description_lower: Lowercase transaction description
            
        Returns:
            int: Number of keyword matches
        """
        count = 0
        category_name_lower = category.name.lower()
        
        # Check predefined keywords for common category types
        for category_type, keywords in cls.CATEGORY_KEYWORDS.items():
            # Check if category name matches this type
            category_matches_type = False
            
            if category_type in category_name_lower:
                category_matches_type = True
            elif category_type == 'transportation' and any(word in category_name_lower for word in ['transport', 'travel', 'commute']):
                category_matches_type = True
            elif category_type == 'dining' and any(word in category_name_lower for word in ['dining', 'restaurant', 'food']):
                category_matches_type = True
            elif category_type == 'groceries' and any(word in category_name_lower for word in ['grocery', 'groceries', 'food']):
                category_matches_type = True
            elif category_type == 'entertainment' and any(word in category_name_lower for word in ['entertainment', 'fun', 'leisure']):
                category_matches_type = True
            
            if category_matches_type:
                for keyword in keywords:
                    # Use word boundaries to avoid partial matches
                    if ' ' in keyword:
                        # For multi-word keywords, check exact phrase
                        if keyword in description_lower:
                            count += 1
                    else:
                        # For single words, check word boundaries
                        import re
                        pattern = r'\b' + re.escape(keyword) + r'\b'
                        if re.search(pattern, description_lower):
                            count += 1
        
        return count

    @classmethod
    def get_category_suggestions_for_user(cls, user, limit: int = 5):
        """
        Get category suggestions for uncategorized transactions for a user.
        
        Args:
            user: User instance
            limit: Maximum number of suggestions to return
            
        Returns:
            List of dictionaries with transaction and suggested category info
        """
        from .models import Transaction
        
        # Get uncategorized transactions
        uncategorized_transactions = Transaction.objects.filter(
            user=user,
            category__isnull=True
        ).order_by('-date')[:limit * 2]  # Get more to filter down
        
        suggestions = []
        for transaction in uncategorized_transactions:
            suggested_category = cls.suggest_category_with_history(user, transaction.description)
            if suggested_category:
                suggestions.append({
                    'transaction_id': transaction.id,
                    'transaction_description': transaction.description,
                    'transaction_amount': transaction.amount,
                    'transaction_date': transaction.date,
                    'suggested_category': {
                        'id': suggested_category.id,
                        'name': suggested_category.name,
                        'description': suggested_category.description
                    }
                })
                
                if len(suggestions) >= limit:
                    break
        
        return suggestions


class BudgetTrackingService:
    """
    Service for budget tracking and alert management.
    """
    
    @staticmethod
    def calculate_budget_status(budget):
        """
        Calculate budget status with progress indicators.
        
        Args:
            budget: Budget instance
            
        Returns:
            dict: Budget status information
        """
        from django.db.models import Sum
        from calendar import monthrange
        from datetime import date
        from decimal import Decimal
        
        # Import here to avoid circular imports
        from .models import Transaction
        
        # Get the full month range
        year = budget.month.year
        month = budget.month.month
        last_day = monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, last_day)
        
        # Calculate spent amount for this category in this month
        spent = Transaction.objects.filter(
            user=budget.user,
            category=budget.category,
            transaction_type='expense',
            date__gte=month_start,
            date__lte=month_end
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Calculate remaining amount and percentage
        remaining = budget.amount - spent
        percentage_used = float((spent / budget.amount) * 100) if budget.amount > 0 else 0.0
        
        # Determine status and alert level
        if percentage_used >= 100:
            status = 'over_budget'
            alert_level = 'danger'
        elif percentage_used >= 80:
            status = 'near_limit'
            alert_level = 'warning'
        else:
            status = 'under_budget'
            alert_level = 'none'
        
        return {
            'budget_id': budget.id,
            'category_id': budget.category.id,
            'category_name': budget.category.name,
            'category_color': budget.category.color,
            'budget_amount': budget.amount,
            'spent_amount': spent,
            'remaining_amount': remaining,
            'percentage_used': round(percentage_used, 2),
            'status': status,
            'alert_level': alert_level,
            'month': budget.month
        }
    
    @staticmethod
    def get_budget_alerts(user, month=None):
        """
        Get budget alerts for budgets that are approaching or exceeding limits.
        
        Args:
            user: User instance
            month: Optional specific month (defaults to current month)
            
        Returns:
            list: List of budget alerts
        """
        from datetime import date
        from .models import Budget
        
        if month is None:
            today = date.today()
            month = date(today.year, today.month, 1)
        
        # Get all budgets for the specified month
        budgets = Budget.objects.filter(user=user, month=month)
        
        alerts = []
        for budget in budgets:
            status = BudgetTrackingService.calculate_budget_status(budget)
            
            # Create alerts for budgets that need attention
            if status['alert_level'] in ['warning', 'danger']:
                alert_type = 'limit_exceeded' if status['status'] == 'over_budget' else 'approaching_limit'
                
                if alert_type == 'limit_exceeded':
                    message = f"You have exceeded your budget for {status['category_name']} by ${abs(status['remaining_amount']):.2f}"
                else:
                    message = f"You have used {status['percentage_used']:.1f}% of your budget for {status['category_name']}"
                
                alerts.append({
                    'budget_id': budget.id,
                    'category_name': status['category_name'],
                    'budget_amount': status['budget_amount'],
                    'spent_amount': status['spent_amount'],
                    'percentage_used': status['percentage_used'],
                    'alert_type': alert_type,
                    'message': message,
                    'month': budget.month
                })
        
        return alerts
    
    @staticmethod
    def get_monthly_budget_summary(user, month=None):
        """
        Get comprehensive budget summary for a month.
        
        Args:
            user: User instance
            month: Optional specific month (defaults to current month)
            
        Returns:
            dict: Monthly budget summary
        """
        from datetime import date
        from decimal import Decimal
        from .models import Budget
        
        if month is None:
            today = date.today()
            month = date(today.year, today.month, 1)
        
        # Get all budgets for the specified month
        budgets = Budget.objects.filter(user=user, month=month)
        
        if not budgets.exists():
            return {
                'month': month,
                'total_budgeted': Decimal('0.00'),
                'total_spent': Decimal('0.00'),
                'total_remaining': Decimal('0.00'),
                'overall_percentage_used': 0.0,
                'budget_count': 0,
                'budgets_over_limit': 0,
                'budgets_near_limit': 0,
                'budgets_under_limit': 0,
                'budget_details': []
            }
        
        # Calculate summary statistics
        total_budgeted = Decimal('0.00')
        total_spent = Decimal('0.00')
        budgets_over_limit = 0
        budgets_near_limit = 0
        budgets_under_limit = 0
        budget_details = []
        
        for budget in budgets:
            status = BudgetTrackingService.calculate_budget_status(budget)
            budget_details.append(status)
            
            total_budgeted += status['budget_amount']
            total_spent += status['spent_amount']
            
            if status['status'] == 'over_budget':
                budgets_over_limit += 1
            elif status['status'] == 'near_limit':
                budgets_near_limit += 1
            else:
                budgets_under_limit += 1
        
        total_remaining = total_budgeted - total_spent
        overall_percentage_used = float((total_spent / total_budgeted) * 100) if total_budgeted > 0 else 0.0
        
        return {
            'month': month,
            'total_budgeted': total_budgeted,
            'total_spent': total_spent,
            'total_remaining': total_remaining,
            'overall_percentage_used': round(overall_percentage_used, 2),
            'budget_count': len(budget_details),
            'budgets_over_limit': budgets_over_limit,
            'budgets_near_limit': budgets_near_limit,
            'budgets_under_limit': budgets_under_limit,
            'budget_details': budget_details
        }
    
    @staticmethod
    def check_transaction_impact_on_budget(user, transaction):
        """
        Check how a new transaction affects existing budgets.
        
        Args:
            user: User instance
            transaction: Transaction instance or transaction data
            
        Returns:
            dict: Impact analysis
        """
        from datetime import date
        from .models import Budget
        
        # Only check for expense transactions with categories
        if (hasattr(transaction, 'transaction_type') and transaction.transaction_type != 'expense') or \
           (isinstance(transaction, dict) and transaction.get('transaction_type') != 'expense'):
            return {'has_impact': False, 'message': 'Transaction is not an expense'}
        
        category = getattr(transaction, 'category', None) or transaction.get('category')
        transaction_date = getattr(transaction, 'date', None) or transaction.get('date')
        amount = getattr(transaction, 'amount', None) or transaction.get('amount')
        
        if not category or not transaction_date or not amount:
            return {'has_impact': False, 'message': 'Missing required transaction data'}
        
        # Find budget for this category and month
        month_start = date(transaction_date.year, transaction_date.month, 1)
        
        try:
            budget = Budget.objects.get(
                user=user,
                category=category,
                month=month_start
            )
        except Budget.DoesNotExist:
            return {'has_impact': False, 'message': 'No budget found for this category and month'}
        
        # Calculate current status
        current_status = BudgetTrackingService.calculate_budget_status(budget)
        
        # Calculate new status with this transaction
        new_spent = current_status['spent_amount'] + amount
        new_remaining = budget.amount - new_spent
        new_percentage = float((new_spent / budget.amount) * 100) if budget.amount > 0 else 0.0
        
        # Determine if this transaction causes a status change
        old_alert_level = current_status['alert_level']
        
        if new_percentage >= 100:
            new_alert_level = 'danger'
        elif new_percentage >= 80:
            new_alert_level = 'warning'
        else:
            new_alert_level = 'none'
        
        status_changed = old_alert_level != new_alert_level
        
        return {
            'has_impact': True,
            'budget_id': budget.id,
            'category_name': budget.category.name,
            'old_spent': current_status['spent_amount'],
            'new_spent': new_spent,
            'old_remaining': current_status['remaining_amount'],
            'new_remaining': new_remaining,
            'old_percentage': current_status['percentage_used'],
            'new_percentage': round(new_percentage, 2),
            'status_changed': status_changed,
            'old_alert_level': old_alert_level,
            'new_alert_level': new_alert_level,
            'budget_amount': budget.amount
        }
    
    @classmethod
    def _calculate_description_similarity(cls, desc1: str, desc2: str) -> float:
        """
        Calculate similarity between two descriptions using word overlap.
        
        Args:
            desc1: First description (lowercase)
            desc2: Second description (lowercase)
            
        Returns:
            float: Similarity score between 0 and 1
        """
        # Simple word-based similarity
        words1 = set(re.findall(r'\w+', desc1))
        words2 = set(re.findall(r'\w+', desc2))
        
        if not words1 or not words2:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    @classmethod
    def get_category_suggestions_for_user(cls, user, limit: int = 5) -> List[Dict]:
        """
        Get category suggestions for uncategorized transactions.
        
        Args:
            user: User instance
            limit: Maximum number of suggestions to return
            
        Returns:
            List of dictionaries with transaction and suggested category
        """
        # Import here to avoid circular imports
        from .models import Transaction
        
        uncategorized_transactions = Transaction.objects.filter(
            user=user,
            category__isnull=True
        ).order_by('-date')[:limit * 2]  # Get more to filter
        
        suggestions = []
        
        for transaction in uncategorized_transactions:
            suggested_category = cls.suggest_category_with_history(
                user, transaction.description
            )
            
            if suggested_category:
                suggestions.append({
                    'transaction_id': transaction.id,
                    'transaction_description': transaction.description,
                    'suggested_category_id': suggested_category.id,
                    'suggested_category_name': suggested_category.name,
                    'confidence': 'high'  # Could be calculated based on score
                })
            
            if len(suggestions) >= limit:
                break
        
        return suggestions