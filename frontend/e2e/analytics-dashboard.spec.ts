import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
    await page.goto('/dashboard');
  });

  test('should display modern analytics dashboard', async ({ page }) => {
    // Should show main dashboard cards
    await expect(page.locator('[data-testid="total-balance-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-income-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-expenses-card"]')).toBeVisible();
    
    // Test card hover effects
    await page.hover('[data-testid="total-balance-card"]');
    await expect(page.locator('[data-testid="total-balance-card"]')).toHaveClass(/.*hover.*/);
    
    // Should show spending chart
    await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
    
    // Test chart interactions
    await page.hover('[data-testid="chart-segment-food"]');
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-tooltip"]')).toContainText('Food');
  });

  test('should handle time period filtering', async ({ page }) => {
    // Test time period selector
    await page.click('[data-testid="time-period-selector"]');
    await page.click('[data-testid="period-last-3-months"]');
    
    // Should update all charts and data
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible();
    
    // Should show updated data
    await expect(page.locator('[data-testid="period-label"]')).toContainText('Last 3 Months');
  });

  test('should display trend analysis', async ({ page }) => {
    // Should show trend chart
    await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
    
    // Test trend indicators
    await expect(page.locator('[data-testid="spending-trend-up"]')).toBeVisible();
    await expect(page.locator('[data-testid="income-trend-down"]')).toBeVisible();
    
    // Test trend details
    await page.click('[data-testid="trend-details-button"]');
    await expect(page.locator('[data-testid="trend-analysis-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="trend-analysis-modal"]')).toContainText('Spending increased by 15% compared to last month');
  });

  test('should handle budget performance visualization', async ({ page }) => {
    // Should show budget progress charts
    await expect(page.locator('[data-testid="budget-progress-chart"]')).toBeVisible();
    
    // Test budget performance indicators
    await expect(page.locator('[data-testid="budget-status-on-track"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-status-over-budget"]')).toBeVisible();
    
    // Test drill-down functionality
    await page.click('[data-testid="budget-category-food"]');
    await expect(page.locator('[data-testid="category-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-transactions-list"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should show mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test swipe gestures on charts (simulate touch)
    await page.touchscreen.tap(200, 300);
    await page.touchscreen.tap(300, 300);
    
    // Should show mobile-friendly tooltips
    await expect(page.locator('[data-testid="mobile-tooltip"]')).toBeVisible();
  });
});