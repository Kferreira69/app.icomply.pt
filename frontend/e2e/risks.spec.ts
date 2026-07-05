/**
 * risks.spec.ts
 *
 * Tests the /risks page: list view, heatmap view, new-risk modal,
 * form validation, and mocked risk creation.
 *
 * Runs authenticated via the 'chromium' project (storageState from global-setup).
 */

import { test, expect } from '@playwright/test';

// ── Helpers ────────────────────────────────────────────────────

/** Intercept the risks list API with an empty payload */
async function mockEmptyRisksList(page: import('@playwright/test').Page) {
  await page.route('**/risks*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    } else {
      await route.continue();
    }
  });
}

/** Intercept the risks list API with sample risks */
async function mockRisksList(page: import('@playwright/test').Page) {
  await page.route('**/risks*', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET' && !url.includes('heatmap')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'risk-1',
              title: 'Acesso não autorizado a dados',
              category: 'Segurança de Informação',
              description: 'Risco de acesso não autorizado',
              likelihood: 'LIKELY',
              impact: 'MAJOR',
              status: 'IDENTIFIED',
              inherentScore: 16,
              riskLevel: 'HIGH',
              dueDate: null,
            },
            {
              id: 'risk-2',
              title: 'Falha no sistema de backup',
              category: 'Operacional',
              description: 'Risco operacional',
              likelihood: 'POSSIBLE',
              impact: 'MODERATE',
              status: 'ASSESSED',
              inherentScore: 9,
              riskLevel: 'MEDIUM',
              dueDate: null,
            },
          ],
          total: 2,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

// ── Tests ──────────────────────────────────────────────────────

test.describe('/risks page', () => {
  test('loads and shows the list view by default', async ({ page }) => {
    await mockRisksList(page);
    await page.goto('/risks');

    // Table should be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state when there are no risks', async ({ page }) => {
    await mockEmptyRisksList(page);
    await page.goto('/risks');

    // Empty state icon / text rendered inside <td>
    await expect(page.locator('td').filter({ hasText: /sem riscos|no risks/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('displays risk rows when API returns data', async ({ page }) => {
    await mockRisksList(page);
    await page.goto('/risks');

    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2);

    // Check first risk title appears
    await expect(rows.first()).toContainText('Acesso não autorizado');
  });

  test('switches to heatmap view', async ({ page }) => {
    await mockRisksList(page);
    // Mock heatmap endpoint too
    await page.route('**/risks/heatmap*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: { critical: 0, high: 1, medium: 1, low: 0 }, matrix: {} }),
      });
    });
    await page.goto('/risks');

    // Click the heatmap toggle button (second button in the view switcher)
    const heatmapBtn = page.locator('button').filter({ hasText: /heatmap|mapa/i }).first();
    await heatmapBtn.click();

    // Heatmap grid should render
    await expect(page.locator('.overflow-x-auto').first()).toBeVisible({ timeout: 5_000 });
  });

  test('summary KPI cards render (Critical/High/Medium/Low)', async ({ page }) => {
    await mockRisksList(page);
    await page.route('**/risks/heatmap*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: { critical: 1, high: 2, medium: 3, low: 4 }, matrix: {} }),
      });
    });
    await page.goto('/risks');

    // 4 KPI cards in the summary grid
    await expect(page.locator('.grid .rounded-xl.border-2')).toHaveCount(4, { timeout: 8_000 });
  });
});

test.describe('New risk modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockRisksList(page);
    await page.route('**/risks/heatmap*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: {}, matrix: {} }),
      });
    });
    await page.goto('/risks');
  });

  test('opens when the register risk button is clicked', async ({ page }) => {
    // The button text comes from the 'registerRisk' translation key
    const newBtn = page.locator('button').filter({ hasText: /registar risco|novo risco|register risk/i }).last();
    await newBtn.click();

    // Modal title
    await expect(page.locator('.fixed.inset-0 h3').first()).toBeVisible({ timeout: 5_000 });
  });

  test('has title, likelihood, and impact fields', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /registar risco|novo risco|register risk/i }).last();
    await newBtn.click();

    await expect(page.locator('.fixed.inset-0 input').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.fixed.inset-0 select').first()).toBeVisible();
  });

  test('can be closed with the cancel button', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /registar risco|novo risco|register risk/i }).last();
    await newBtn.click();

    await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5_000 });

    const cancelBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /cancel|cancelar/i }).first();
    await cancelBtn.click();

    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 3_000 });
  });

  test('creates a risk with valid data and closes modal on success', async ({ page }) => {
    // Mock successful POST
    await page.route('**/risks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-risk-1',
            title: 'Risco de Teste',
            likelihood: 'POSSIBLE',
            impact: 'MODERATE',
            status: 'IDENTIFIED',
            inherentScore: 9,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const newBtn = page.locator('button').filter({ hasText: /registar risco|novo risco|register risk/i }).last();
    await newBtn.click();

    // Fill required fields
    await page.fill('.fixed.inset-0 input[placeholder*="Risco"]', 'Risco de Teste');

    // Select likelihood and impact (first selects in the modal)
    const selects = page.locator('.fixed.inset-0 select');
    await selects.first().selectOption('POSSIBLE');
    await selects.nth(1).selectOption('MODERATE');

    // Submit
    const submitBtn = page.locator('.fixed.inset-0 button[type="submit"]');
    await submitBtn.click();

    // Modal should close after success (mutation onSuccess calls onClose)
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Edit risk modal', () => {
  test('opens when clicking the edit pencil icon on a row', async ({ page }) => {
    await mockRisksList(page);
    await page.route('**/risks/heatmap*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: {}, matrix: {} }),
      });
    });
    await page.goto('/risks');

    await page.waitForSelector('table tbody tr', { timeout: 10_000 });

    // Pencil edit button in the last column
    const editBtn = page.locator('table tbody tr').first().locator('button[title]');
    await editBtn.click();

    // Edit modal has tabs: Risco / Plano de Tratamento / Histórico
    await expect(page.locator('.fixed.inset-0 h3').filter({ hasText: /edit/i }).first()).toBeVisible({ timeout: 5_000 });
  });
});
