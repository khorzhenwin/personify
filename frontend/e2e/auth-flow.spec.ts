import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete registration flow with modern UI interactions', async ({ page }) => {
    // Navigate to registration
    await page.click('[data-testid="register-link"]');
    await expect(page).toHaveURL('/auth/register');

    // Test modern form interactions
    const firstNameInput = page.locator('[data-testid="first-name-input"]');
    const lastNameInput = page.locator('[data-testid="last-name-input"]');
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]');

    // Test floating labels and focus states
    await firstNameInput.focus();
    await expect(firstNameInput).toBeFocused();
    
    // Fill form with smooth transitions
    await firstNameInput.fill('John');
    await lastNameInput.fill('Doe');
    await emailInput.fill('john.doe@example.com');
    await passwordInput.fill('SecurePass123!');
    await confirmPasswordInput.fill('SecurePass123!');

    // Test form validation feedback
    await page.click('[data-testid="register-button"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="register-button"]')).toHaveAttribute('data-loading', 'true');
    
    // Should redirect to login after successful registration
    await expect(page).toHaveURL('/auth/login');
    
    // Should show success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('Registration successful');
  });

  test('should complete login flow with error handling', async ({ page }) => {
    await page.goto('/auth/login');

    // Test invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Should show error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');

    // Test valid credentials (mock successful login)
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Should show loading state
    await expect(page.locator('[data-testid="login-button"]')).toHaveAttribute('data-loading', 'true');
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]');
    
    // Fill email for password reset
    await page.fill('[data-testid="reset-email-input"]', 'test@example.com');
    await page.click('[data-testid="reset-password-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset email sent');
  });
});