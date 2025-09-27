import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
    await page.goto('/transactions');
  });

  test('should complete transaction creation workflow', async ({ page }) => {
    // Click add transaction button
    await page.click('[data-testid="add-transaction-button"]');
    
    // Should open modern modal/form
    await expect(page.locator('[data-testid="transaction-form"]')).toBeVisible();
    
    // Test modern form interactions
    await page.fill('[data-testid="amount-input"]', '150.50');
    await page.fill('[data-testid="description-input"]', 'Grocery shopping');
    
    // Test category selection with modern dropdown
    await page.click('[data-testid="category-select"]');
    await page.click('[data-testid="category-option-food"]');
    
    // Test date picker
    await page.click('[data-testid="date-input"]');
    await page.click('[data-testid="date-today"]');
    
    // Test transaction type selection
    await page.click('[data-testid="type-expense"]');
    
    // Submit form
    await page.click('[data-testid="save-transaction-button"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="save-transaction-button"]')).toHaveAttribute('data-loading', 'true');
    
    // Should show success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('Transaction created successfully');
    
    // Should close form and update list
    await expect(page.locator('[data-testid="transaction-form"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="transaction-list"]')).toContainText('Grocery shopping');
  });

  test('should handle transaction filtering and search', async ({ page }) => {
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'grocery');
    await expect(page.locator('[data-testid="transaction-item"]')).toHaveCount(1);
    
    // Test date range filter
    await page.click('[data-testid="date-filter-button"]');
    await page.click('[data-testid="date-range-this-month"]');
    
    // Test category filter
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-filter-food"]');
    
    // Test amount range filter
    await page.fill('[data-testid="min-amount-input"]', '100');
    await page.fill('[data-testid="max-amount-input"]', '200');
    
    // Should update results with smooth transitions
    await expect(page.locator('[data-testid="filter-results"]')).toBeVisible();
  });

  test('should handle transaction editing and deletion', async ({ page }) => {
    // Click edit on first transaction
    await page.click('[data-testid="transaction-item"]:first-child [data-testid="edit-button"]');
    
    // Should open edit form with pre-filled data
    await expect(page.locator('[data-testid="transaction-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="amount-input"]')).toHaveValue('150.50');
    
    // Update transaction
    await page.fill('[data-testid="amount-input"]', '175.25');
    await page.click('[data-testid="save-transaction-button"]');
    
    // Should show success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('Transaction updated successfully');
    
    // Test deletion with confirmation modal
    await page.click('[data-testid="transaction-item"]:first-child [data-testid="delete-button"]');
    
    // Should show modern confirmation modal
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toContainText('Are you sure you want to delete this transaction?');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Should show success notification and remove item
    await expect(page.locator('[data-testid="notification"]')).toContainText('Transaction deleted successfully');
  });

  test('should handle CSV export functionality', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-button"]');
    
    // Should show export modal
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
    
    // Select date range
    await page.click('[data-testid="export-date-range"]');
    await page.click('[data-testid="export-range-all-time"]');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-csv-button"]');
    
    // Should show progress indicator
    await expect(page.locator('[data-testid="download-progress"]')).toBeVisible();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('transactions');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});