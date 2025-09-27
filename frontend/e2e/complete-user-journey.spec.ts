import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('should complete full user workflow from registration to analytics', async ({ page }) => {
    // Step 1: Registration
    await page.goto('/');
    await page.click('[data-testid="register-link"]');
    
    // Fill registration form
    await page.fill('[data-testid="first-name-input"]', 'Jane');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.fill('[data-testid="email-input"]', 'jane.doe@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
    
    // Step 2: Login
    await page.fill('[data-testid="email-input"]', 'jane.doe@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Step 3: Create categories
    await page.goto('/budgets');
    await page.click('[data-testid="manage-categories-button"]');
    
    // Create Food category
    await page.click('[data-testid="add-category-button"]');
    await page.fill('[data-testid="category-name-input"]', 'Food');
    await page.fill('[data-testid="category-description-input"]', 'Groceries and dining');
    await page.click('[data-testid="color-option-green"]');
    await page.click('[data-testid="save-category-button"]');
    
    // Create Transportation category
    await page.click('[data-testid="add-category-button"]');
    await page.fill('[data-testid="category-name-input"]', 'Transportation');
    await page.fill('[data-testid="category-description-input"]', 'Gas, public transport');
    await page.click('[data-testid="color-option-blue"]');
    await page.click('[data-testid="save-category-button"]');
    
    // Step 4: Set up budgets
    await page.click('[data-testid="back-to-budgets-button"]');
    
    // Create Food budget
    await page.click('[data-testid="create-budget-button"]');
    await page.click('[data-testid="budget-category-select"]');
    await page.click('[data-testid="category-option-food"]');
    await page.fill('[data-testid="budget-amount-input"]', '500');
    await page.click('[data-testid="save-budget-button"]');
    
    // Create Transportation budget
    await page.click('[data-testid="create-budget-button"]');
    await page.click('[data-testid="budget-category-select"]');
    await page.click('[data-testid="category-option-transportation"]');
    await page.fill('[data-testid="budget-amount-input"]', '200');
    await page.click('[data-testid="save-budget-button"]');
    
    // Step 5: Add transactions
    await page.goto('/transactions');
    
    // Add income transaction
    await page.click('[data-testid="add-transaction-button"]');
    await page.fill('[data-testid="amount-input"]', '3000');
    await page.fill('[data-testid="description-input"]', 'Monthly salary');
    await page.click('[data-testid="type-income"]');
    await page.click('[data-testid="save-transaction-button"]');
    
    // Add food expense
    await page.click('[data-testid="add-transaction-button"]');
    await page.fill('[data-testid="amount-input"]', '85.50');
    await page.fill('[data-testid="description-input"]', 'Grocery shopping at Whole Foods');
    await page.click('[data-testid="category-select"]');
    await page.click('[data-testid="category-option-food"]');
    await page.click('[data-testid="type-expense"]');
    await page.click('[data-testid="save-transaction-button"]');
    
    // Add transportation expense
    await page.click('[data-testid="add-transaction-button"]');
    await page.fill('[data-testid="amount-input"]', '45.00');
    await page.fill('[data-testid="description-input"]', 'Gas station fill-up');
    await page.click('[data-testid="category-select"]');
    await page.click('[data-testid="category-option-transportation"]');
    await page.click('[data-testid="type-expense"]');
    await page.click('[data-testid="save-transaction-button"]');
    
    // Step 6: View analytics dashboard
    await page.goto('/dashboard');
    
    // Should show updated balance
    await expect(page.locator('[data-testid="total-balance-card"]')).toContainText('$2,869.50');
    
    // Should show spending breakdown
    await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-segment-food"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-segment-transportation"]')).toBeVisible();
    
    // Test chart interactions
    await page.hover('[data-testid="chart-segment-food"]');
    await expect(page.locator('[data-testid="chart-tooltip"]')).toContainText('Food: $85.50');
    
    // Step 7: Check budget status
    await page.goto('/budgets');
    
    // Should show budget progress
    await expect(page.locator('[data-testid="budget-progress-food"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-remaining-food"]')).toContainText('$414.50');
    
    await expect(page.locator('[data-testid="budget-progress-transportation"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-remaining-transportation"]')).toContainText('$155.00');
    
    // Step 8: Test filtering and search
    await page.goto('/transactions');
    
    // Search for specific transaction
    await page.fill('[data-testid="search-input"]', 'grocery');
    await expect(page.locator('[data-testid="transaction-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="transaction-item"]')).toContainText('Grocery shopping');
    
    // Filter by category
    await page.fill('[data-testid="search-input"]', '');
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-filter-food"]');
    await expect(page.locator('[data-testid="transaction-item"]')).toHaveCount(1);
    
    // Step 9: Export data
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-range-all-time"]');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-csv-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('transactions');
    
    // Step 10: Update profile
    await page.goto('/profile');
    await page.fill('[data-testid="first-name-input"]', 'Jane Marie');
    await page.click('[data-testid="save-profile-button"]');
    await expect(page.locator('[data-testid="notification"]')).toContainText('Profile updated successfully');
    
    // Step 11: Test responsive design
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Should show mobile layout
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Navigate to transactions on mobile
    await page.click('[data-testid="mobile-nav-transactions"]');
    await expect(page).toHaveURL('/transactions');
    await expect(page.locator('[data-testid="mobile-transaction-list"]')).toBeVisible();
    
    // Step 12: Test logout
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
    
    // Should clear authentication state
    const authToken = await page.evaluate(() => localStorage.getItem('auth-token'));
    expect(authToken).toBeNull();
  });

  test('should handle error states gracefully throughout the journey', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/dashboard');
    
    // Should show error boundary
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong');
    
    // Should provide retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/**');
    await page.click('[data-testid="retry-button"]');
    
    // Should recover and show dashboard
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });
});