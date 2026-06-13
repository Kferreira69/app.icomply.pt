/**
 * auth.spec.ts
 *
 * Tests authentication flows: login, logout, redirect guards, forgot-password.
 * All tests start unauthenticated (no storageState) via the 'unauthenticated'
 * project defined in playwright.config.ts.
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@icomply.pt';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// Ensure we have no session for this suite
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders login form with email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'somepassword');
    await page.click('button[type="submit"]');

    // Zod validation fires before API call
    await expect(page.locator('text=/invalid|inválido/i').first()).toBeVisible({ timeout: 3_000 });
  });

  test('shows error for password shorter than 8 chars', async ({ page }) => {
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', 'short');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/8/').first()).toBeVisible({ timeout: 3_000 });
  });

  test('shows error message for wrong credentials', async ({ page }) => {
    // Intercept the login API to return 401 so test is not environment-dependent
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    });

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error banner should appear (bg-red-50 div)
    await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 5_000 });
  });

  test('redirects to /dashboard after successful login', async ({ page }) => {
    // Mock successful login response
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'user-1',
            email: TEST_EMAIL,
            firstName: 'Test',
            lastName: 'User',
            role: 'ADMIN',
            organizationId: 'org-1',
          },
        }),
      });
    });

    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('has a link to forgot-password page', async ({ page }) => {
    const forgotLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await page.waitForURL('**/forgot-password');
    expect(page.url()).toContain('/forgot-password');
  });
});

test.describe('Route guard', () => {
  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated access to /risks redirects to /login', async ({ page }) => {
    await page.goto('/risks');
    await page.waitForURL('**/login', { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('Forgot password page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('renders forgot-password form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows success state after submitting a valid email', async ({ page }) => {
    await page.route('**/auth/forgot-password', async (route) => {
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.fill('input[type="email"]', 'user@company.com');
    await page.click('button[type="submit"]');

    // After success, the form is replaced by a success message
    // The forgot-password page shows an email icon + "checkEmail" translation key content
    await expect(page.locator('.bg-green-100').first()).toBeVisible({ timeout: 5_000 });
  });

  test('has a back link to login', async ({ page }) => {
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });
});

test.describe('Logout', () => {
  test('clearing localStorage removes auth and redirects protected page to /login', async ({ page }) => {
    // Simulate a session by setting Zustand persisted auth in localStorage
    await page.goto('/login');
    await page.evaluate(() => {
      const fakeAuth = {
        state: {
          user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADMIN', organizationId: 'o1' },
          accessToken: 'tok',
          refreshToken: 'rtok',
          isAuthenticated: true,
        },
        version: 0,
      };
      localStorage.setItem('icomply-auth', JSON.stringify(fakeAuth));
    });

    // Navigate to /dashboard — should succeed since isAuthenticated is set
    await page.goto('/dashboard');

    // Now clear auth (simulates logout)
    await page.evaluate(() => {
      const raw = localStorage.getItem('icomply-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.state.isAuthenticated = false;
        parsed.state.accessToken = null;
        parsed.state.user = null;
        localStorage.setItem('icomply-auth', JSON.stringify(parsed));
      }
    });

    // Navigate away and back — guard should redirect
    await page.goto('/risks');
    await page.waitForURL('**/login', { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });
});
