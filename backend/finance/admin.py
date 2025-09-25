"""
Finance app admin configuration.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Category, Transaction, Budget


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Custom user admin configuration.
    """
    list_display = ('email', 'first_name', 'last_name', 'is_email_verified', 'is_active', 'date_joined')
    list_filter = ('is_email_verified', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'is_email_verified')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """
    Category admin configuration.
    """
    list_display = ('name', 'user', 'color', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'user__email', 'description')
    ordering = ('user', 'name')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """
    Transaction admin configuration.
    """
    list_display = ('description', 'user', 'amount', 'transaction_type', 'category', 'date', 'created_at')
    list_filter = ('transaction_type', 'date', 'created_at', 'category')
    search_fields = ('description', 'user__email')
    ordering = ('-date', '-created_at')
    date_hierarchy = 'date'


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    """
    Budget admin configuration.
    """
    list_display = ('user', 'category', 'amount', 'month', 'created_at')
    list_filter = ('month', 'created_at')
    search_fields = ('user__email', 'category__name')
    ordering = ('-month', 'user', 'category')