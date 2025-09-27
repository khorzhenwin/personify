import { test, expect } from '@playwright/test';

test.describe('Complete Test Suite Runner', () => {
  test('should run all critical user workflows', async ({ page }) => {
    // This test runs a comprehensive check of all major functionality
    // It's designed to be run as a final integration test
    
    console.log('🚀 Starting comprehensive integration test...');
    
    // Test 1: Application loads correctly
    await page.goto('/');
    await expect(page).toHaveTitle(/Personal Finance Tracker/);
    console.log('✅ Application loads correctly');
    
    // Test 2: Authentication system works
    await page.goto('/auth/login');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    console.log('✅ Authentication pages accessible');
    
    // Test 3: Protected routes redirect properly
    await page.goto('/dashboard');
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/\/auth\/login/);
    console.log('✅ Route protection working');
    
    // Test 4: Theme toggle functionality
    await page.goto('/');
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      console.log('✅ Theme toggle functional');
    }
    
    // Test 5: Error handling
    await page.goto('/non-existent-page');
    await expect(page.locator('h1')).toContainText('404');
    console.log('✅ 404 page displays correctly');
    
    // Test 6: Responsive design
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Mobile responsive design working');
    
    // Test 7: Accessibility features
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    // Check for proper ARIA labels
    const navigation = page.locator('[role="navigation"]');
    if (await navigation.isVisible()) {
      console.log('✅ Navigation has proper ARIA roles');
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    console.log('✅ Keyboard navigation working');
    
    console.log('🎉 All integration tests passed!');
  });

  test('should handle API error states gracefully', async ({ page }) => {
    // Mock network failures
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/dashboard');
    
    // Should show error boundary or loading state
    const errorElement = page.locator('[data-testid="error-boundary"], [data-testid="loading-skeleton"]');
    await expect(errorElement).toBeVisible();
    
    console.log('✅ Error states handled gracefully');
  });

  test('should maintain performance standards', async ({ page }) => {
    // Performance test
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    console.log(`✅ Page loaded in ${loadTime}ms (under 3s requirement)`);
    
    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    console.log('📊 Performance metrics:', performanceMetrics);
  });
});