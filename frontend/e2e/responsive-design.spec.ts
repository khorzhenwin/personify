import { test, expect, devices } from '@playwright/test';

// Test responsive design across different devices
const testDevices = [
  { name: 'Desktop', ...devices['Desktop Chrome'] },
  { name: 'Tablet', ...devices['iPad Pro'] },
  { name: 'Mobile', ...devices['iPhone 12'] },
  { name: 'Mobile Landscape', ...devices['iPhone 12 landscape'] },
];

testDevices.forEach(({ name, ...device }) => {
  test.describe(`Responsive Design - ${name}`, () => {
    test.use({ ...device });

    test('should display homepage correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check if the page loads
      await expect(page).toHaveTitle(/Personal Finance Tracker/);
      
      // Check if navigation is visible and accessible
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
      
      // Check if main content is visible
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
      
      // Take screenshot for visual comparison
      await page.screenshot({ 
        path: `test-results/responsive-${name.toLowerCase().replace(' ', '-')}-homepage.png`,
        fullPage: true 
      });
    });

    test('should display login form correctly', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Check if login form is visible
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
      
      // Check if form fields are accessible
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Test form interaction
      await emailField.click();
      await emailField.fill('test@example.com');
      await passwordField.click();
      await passwordField.fill('password123');
      
      // Check if fields are properly filled
      await expect(emailField).toHaveValue('test@example.com');
      await expect(passwordField).toHaveValue('password123');
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/responsive-${name.toLowerCase().replace(' ', '-')}-login.png`,
        fullPage: true 
      });
    });

    test('should display registration form correctly', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Check if registration form is visible
      const registerForm = page.locator('form');
      await expect(registerForm).toBeVisible();
      
      // Check if all form fields are accessible
      const firstNameField = page.locator('input[name="first_name"]');
      const lastNameField = page.locator('input[name="last_name"]');
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(firstNameField).toBeVisible();
      await expect(lastNameField).toBeVisible();
      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Test form interaction
      await firstNameField.fill('John');
      await lastNameField.fill('Doe');
      await emailField.fill('john.doe@example.com');
      await passwordField.fill('SecurePassword123!');
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/responsive-${name.toLowerCase().replace(' ', '-')}-register.png`,
        fullPage: true 
      });
    });

    test('should display dashboard layout correctly', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check if main dashboard elements are visible
      const dashboardContent = page.locator('[data-testid="dashboard-content"]').or(page.locator('main'));
      await expect(dashboardContent).toBeVisible();
      
      // Check if navigation is accessible
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
      
      // For mobile devices, check if navigation is collapsible
      if (name === 'Mobile' || name === 'Mobile Landscape') {
        // Look for mobile menu button
        const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]').or(
          page.locator('button[aria-label*="menu"]')
        );
        
        if (await mobileMenuButton.isVisible()) {
          await mobileMenuButton.click();
          // Check if menu opens
          const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(
            page.locator('nav[aria-expanded="true"]')
          );
          await expect(mobileMenu).toBeVisible();
        }
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/responsive-${name.toLowerCase().replace(' ', '-')}-dashboard.png`,
        fullPage: true 
      });
    });

    test('should display transactions page correctly', async ({ page }) => {
      await page.goto('/transactions');
      
      // Check if transactions content is visible
      const transactionsContent = page.locator('main');
      await expect(transactionsContent).toBeVisible();
      
      // Check if transaction form or list is visible
      const transactionForm = page.locator('form');
      const transactionList = page.locator('[data-testid="transaction-list"]').or(
        page.locator('table, .transaction-item')
      );
      
      // At least one should be visible
      const formVisible = await transactionForm.isVisible();
      const listVisible = await transactionList.isVisible();
      expect(formVisible || listVisible).toBeTruthy();
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/responsive-${name.toLowerCase().replace(' ', '-')}-transactions.png`,
        fullPage: true 
      });
    });

    test('should display budgets page correctly', async ({ page }) => {
      await page.goto('/budgets');
      
      // Check if budgets content is visible
      const budgetsContent = page.locator('main');
      await expect(budgetsContent).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/responsive-${name.toLowerCase().replace(' ', '-')}-budgets.png`,
        fullPage: true 
      });
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      // Skip this test for desktop
      if (name === 'Desktop') {
        test.skip();
      }

      await page.goto('/');
      
      // Test touch interactions
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
      
      // Test tap interactions
      const loginLink = page.locator('a[href*="login"]');
      if (await loginLink.isVisible()) {
        await loginLink.tap();
        await expect(page).toHaveURL(/.*login/);
      }
    });

    test('should maintain proper spacing and layout', async ({ page }) => {
      await page.goto('/');
      
      // Check viewport meta tag
      const viewportMeta = page.locator('meta[name="viewport"]');
      await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
      
      // Check if content doesn't overflow horizontally
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      const viewportSize = page.viewportSize();
      
      if (bodyBox && viewportSize) {
        // Allow for small differences due to scrollbars
        expect(bodyBox.width).toBeLessThanOrEqual(viewportSize.width + 20);
      }
      
      // Check if text is readable (not too small)
      const textElements = page.locator('p, span, div').filter({ hasText: /\w+/ });
      const firstTextElement = textElements.first();
      
      if (await firstTextElement.isVisible()) {
        const fontSize = await firstTextElement.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });
        
        const fontSizeNum = parseInt(fontSize.replace('px', ''));
        expect(fontSizeNum).toBeGreaterThanOrEqual(14); // Minimum readable font size
      }
    });

    test('should handle orientation changes on mobile', async ({ page }) => {
      // Skip this test for desktop and tablet
      if (name === 'Desktop' || name === 'Tablet') {
        test.skip();
      }

      await page.goto('/');
      
      // Test portrait orientation
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('body')).toBeVisible();
      
      // Test landscape orientation
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(page.locator('body')).toBeVisible();
      
      // Check if navigation is still accessible
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
    });
  });
});

// Test specific responsive breakpoints
test.describe('Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'Mobile Small', width: 320, height: 568 },
    { name: 'Mobile Medium', width: 375, height: 667 },
    { name: 'Mobile Large', width: 414, height: 896 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Desktop Small', width: 1280, height: 720 },
    { name: 'Desktop Large', width: 1920, height: 1080 },
  ];

  breakpoints.forEach(({ name, width, height }) => {
    test(`should display correctly at ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      
      // Check if page loads without horizontal scroll
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      
      if (bodyBox) {
        expect(bodyBox.width).toBeLessThanOrEqual(width + 20);
      }
      
      // Check if navigation is accessible
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
      
      // Take screenshot for visual comparison
      await page.screenshot({ 
        path: `test-results/breakpoint-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    });
  });
});

// Test accessibility features
test.describe('Responsive Accessibility', () => {
  test('should maintain accessibility across devices', async ({ page }) => {
    const devices = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1280, height: 720 },
    ];

    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/auth/login');
      
      // Check if form labels are properly associated
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      if (await emailInput.isVisible()) {
        const emailLabel = await emailInput.getAttribute('aria-label') || 
                           await page.locator('label[for]').first().textContent();
        expect(emailLabel).toBeTruthy();
      }
      
      if (await passwordInput.isVisible()) {
        const passwordLabel = await passwordInput.getAttribute('aria-label') || 
                             await page.locator('label[for]').nth(1).textContent();
        expect(passwordLabel).toBeTruthy();
      }
      
      // Check if buttons have proper labels
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        const buttonText = await submitButton.textContent();
        const ariaLabel = await submitButton.getAttribute('aria-label');
        expect(buttonText || ariaLabel).toBeTruthy();
      }
    }
  });

  test('should support keyboard navigation on all devices', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const firstFocusable = await page.locator(':focus').first();
    await expect(firstFocusable).toBeVisible();
    
    await page.keyboard.press('Tab');
    const secondFocusable = await page.locator(':focus').first();
    await expect(secondFocusable).toBeVisible();
    
    // Ensure focus is visible
    const focusedElement = page.locator(':focus');
    const focusStyles = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        border: styles.border,
      };
    });
    
    // At least one focus indicator should be present
    const hasFocusIndicator = focusStyles.outline !== 'none' || 
                             focusStyles.boxShadow !== 'none' || 
                             focusStyles.border.includes('px');
    expect(hasFocusIndicator).toBeTruthy();
  });
});