import { test, expect } from '@playwright/test';

test.describe('Budget Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
    await page.goto('/budgets');
  });

  test('should complete budget creation workflow', async ({ page }) => {
    // Click create budget button
    await page.click('[data-testid="create-budget-button"]');
    
    // Should open modern budget form
    await expect(page.locator('[data-testid="budget-form"]')).toBeVisible();
    
    // Test category selection
    await page.click('[data-testid="budget-category-select"]');
    await page.click('[data-testid="category-option-food"]');
    
    // Test modern amount slider
    const amountSlider = page.locator('[data-testid="budget-amount-slider"]');
    await amountSlider.fill('500');
    
    // Should show real-time preview
    await expect(page.locator('[data-testid="budget-preview"]')).toContainText('$500.00');
    
    // Submit budget
    await page.click('[data-testid="save-budget-button"]');
    
    // Should show success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('Budget created successfully');
    
    // Should update budget overview
    await expect(page.locator('[data-testid="budget-overview"]')).toContainText('Food');
    await expect(page.locator('[data-testid="budget-overview"]')).toContainText('$500.00');
  });

  test('should display budget progress with modern visualizations', async ({ page }) => {
    // Should show progress rings
    await expect(page.locator('[data-testid="budget-progress-ring"]')).toBeVisible();
    
    // Test hover interactions
    await page.hover('[data-testid="budget-progress-ring"]');
    await expect(page.locator('[data-testid="budget-tooltip"]')).toBeVisible();
    
    // Should show spending breakdown
    await expect(page.locator('[data-testid="spending-breakdown"]')).toBeVisible();
    
    // Test drill-down functionality
    await page.click('[data-testid="budget-category-food"]');
    await expect(page.locator('[data-testid="category-transactions"]')).toBeVisible();
  });

  test('should handle budget alerts and notifications', async ({ page }) => {
    // Should show budget alerts when limits are approached
    await expect(page.locator('[data-testid="budget-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-alert"]')).toContainText('You have spent 85% of your Food budget');
    
    // Test alert dismissal
    await page.click('[data-testid="dismiss-alert-button"]');
    await expect(page.locator('[data-testid="budget-alert"]')).not.toBeVisible();
    
    // Test budget exceeded warning
    await expect(page.locator('[data-testid="budget-exceeded-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-exceeded-warning"]')).toHaveClass(/.*warning.*/);
  });

  test('should handle category management', async ({ page }) => {
    // Navigate to category management
    await page.click('[data-testid="manage-categories-button"]');
    
    // Should show category grid
    await expect(page.locator('[data-testid="category-grid"]')).toBeVisible();
    
    // Test category creation
    await page.click('[data-testid="add-category-button"]');
    await page.fill('[data-testid="category-name-input"]', 'Entertainment');
    await page.fill('[data-testid="category-description-input"]', 'Movies, games, etc.');
    
    // Test color picker
    await page.click('[data-testid="category-color-picker"]');
    await page.click('[data-testid="color-option-purple"]');
    
    // Save category
    await page.click('[data-testid="save-category-button"]');
    
    // Should show in category grid
    await expect(page.locator('[data-testid="category-card-entertainment"]')).toBeVisible();
    
    // Test category editing
    await page.hover('[data-testid="category-card-entertainment"]');
    await page.click('[data-testid="edit-category-button"]');
    
    // Update category
    await page.fill('[data-testid="category-name-input"]', 'Entertainment & Fun');
    await page.click('[data-testid="save-category-button"]');
    
    // Should update display
    await expect(page.locator('[data-testid="category-card-entertainment"]')).toContainText('Entertainment & Fun');
  });
});