/**
 * global-setup.ts
 *
 * Runs once before all tests. Logs in with TEST_EMAIL / TEST_PASSWORD and
 * saves the Zustand auth state (persisted to localStorage as 'icomply-auth')
 * plus the browser cookies to e2e/.auth/user.json.
 *
 * All authenticated test projects load this file as their storageState so
 * they skip the login UI on every test run.
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

async function globalSetup(_config: FullConfig) {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const email = process.env.TEST_EMAIL || 'admin@icomply.pt';
  const password = process.env.TEST_PASSWORD || 'password123';

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);

  // Fill login form — selectors match login/page.tsx inputs
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to /dashboard after successful login
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  // Save cookies + localStorage (Zustand persist) to auth file
  await page.context().storageState({ path: AUTH_FILE });

  await browser.close();
}

export default globalSetup;
