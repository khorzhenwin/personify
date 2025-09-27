import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
    await page.goto('/profile');
  });

  test('should handle profile settings with modern tabbed interface', async ({ page }) => {
    // Should show tabbed interface
    await expect(page.locator('[data-testid="profile-tabs"]')).toBeVisible();
    
    // Test profile information tab
    await page.click('[data-testid="profile-info-tab"]');
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
    
    // Update profile information
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Smith');
    await page.fill('[data-testid="email-input"]', 'john.smith@example.com');
    
    // Save changes
    await page.click('[data-testid="save-profile-button"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="save-profile-button"]')).toHaveAttribute('data-loading', 'true');
    
    // Should show success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('Profile updated successfully');
  });

  test('should handle password change with security indicators', async ({ page }) => {
    // Navigate to security tab
    await page.click('[data-testid="security-tab"]');
    await expect(page.locator('[data-testid="password-change-form"]')).toBeVisible();
    
    // Fill current password
    await page.fill('[data-testid="current-password-input"]', 'currentpassword');
    
    // Test password strength indicator
    await page.fill('[data-testid="new-password-input"]', 'weak');
    await expect(page.locator('[data-testid="password-strength-weak"]')).toBeVisible();
    
    await page.fill('[data-testid="new-password-input"]', 'StrongPassword123!');
    await expect(page.locator('[data-testid="password-strength-strong"]')).toBeVisible();
    
    // Confirm new password
    await page.fill('[data-testid="confirm-password-input"]', 'StrongPassword123!');
    
    // Submit password change
    await page.click('[data-testid="change-password-button"]');
    
    // Should show success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('Password changed successfully');
  });

  test('should handle data export functionality', async ({ page }) => {
    // Navigate to data export tab
    await page.click('[data-testid="data-export-tab"]');
    await expect(page.locator('[data-testid="data-export-form"]')).toBeVisible();
    
    // Test export options
    await page.check('[data-testid="export-transactions-checkbox"]');
    await page.check('[data-testid="export-budgets-checkbox"]');
    await page.check('[data-testid="export-categories-checkbox"]');
    
    // Select date range
    await page.click('[data-testid="export-date-range"]');
    await page.click('[data-testid="export-range-all-time"]');
    
    // Select format
    await page.click('[data-testid="export-format-select"]');
    await page.click('[data-testid="format-csv"]');
    
    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-data-button"]');
    
    // Should show progress indicator
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-progress-bar"]')).toBeVisible();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('personal-finance-data');
    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('should handle notification preferences', async ({ page }) => {
    // Navigate to notifications tab
    await page.click('[data-testid="notifications-tab"]');
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
    
    // Test toggle switches
    await page.click('[data-testid="budget-alerts-toggle"]');
    await expect(page.locator('[data-testid="budget-alerts-toggle"]')).toBeChecked();
    
    await page.click('[data-testid="transaction-reminders-toggle"]');
    await expect(page.locator('[data-testid="transaction-reminders-toggle"]')).toBeChecked();
    
    await page.click('[data-testid="monthly-reports-toggle"]');
    await expect(page.locator('[data-testid="monthly-reports-toggle"]')).toBeChecked();
    
    // Test email frequency selection
    await page.click('[data-testid="email-frequency-select"]');
    await page.click('[data-testid="frequency-weekly"]');
    
    // Save notification preferences
    await page.click('[data-testid="save-notifications-button"]');
    
    // Should show success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('Notification preferences updated');
  });

  test('should handle account deletion with proper warnings', async ({ page }) => {
    // Navigate to account settings
    await page.click('[data-testid="account-tab"]');
    await expect(page.locator('[data-testid="account-settings"]')).toBeVisible();
    
    // Click delete account button
    await page.click('[data-testid="delete-account-button"]');
    
    // Should show warning modal
    await expect(page.locator('[data-testid="delete-account-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-warning"]')).toContainText('This action cannot be undone');
    
    // Test confirmation requirement
    await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE');
    await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeEnabled();
    
    // Cancel deletion
    await page.click('[data-testid="cancel-delete-button"]');
    await expect(page.locator('[data-testid="delete-account-modal"]')).not.toBeVisible();
  });
});