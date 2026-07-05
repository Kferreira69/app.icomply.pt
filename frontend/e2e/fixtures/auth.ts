/**
 * fixtures/auth.ts
 *
 * Extends Playwright's base `test` with an `authenticatedPage` fixture that:
 *   - Loads the saved auth storageState from global-setup
 *   - Navigates to /dashboard to confirm the session is valid
 *
 * Import `test` and `expect` from this file in any test that needs auth.
 */

import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_FILE,
    });
    const page = await context.newPage();

    // Verify session is active
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    await use(page);

    await context.close();
  },
});

export { expect } from '@playwright/test';
