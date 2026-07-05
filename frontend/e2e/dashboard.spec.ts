/**
 * dashboard.spec.ts
 *
 * Tests the /dashboard page: KPI widgets, compliance score ring,
 * chart rendering, and no critical console errors.
 *
 * Runs authenticated via the 'chromium' project.
 */

import { test, expect } from '@playwright/test';

// ── Mock helpers ───────────────────────────────────────────────

function mockDashboardAPIs(page: import('@playwright/test').Page) {
  // Main dashboard data
  page.route('**/organizations/*/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tasks: { overdue: 3, byStatus: { TODO: 5, IN_PROGRESS: 8, DONE: 12, CANCELLED: 1 } },
        risks: { open: 7, high: 2 },
        projects: { active: 4, total: 6 },
        evidence: { pending: 2 },
        alerts: [],
        domainScores: [],
        maturityScores: [],
        overallMaturity: 0,
      }),
    });
  });

  // Reports summary
  page.route('**/reports/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        complianceScore: 78,
        openCapas: 3,
        auditsCompleted: 5,
        totalAudits: 8,
        openBreaches: 0,
      }),
    });
  });

  // Policies stats
  page.route('**/policies/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: 15,
        byStatus: { APPROVED: 10, DRAFT: 3, UNDER_REVIEW: 2 },
      }),
    });
  });

  // GDPR dashboard
  page.route('**/gdpr/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        activities: { active: 8, total: 12 },
        breaches: { open: 0, total: 1 },
      }),
    });
  });

  // Risks list (for heatmap widget)
  page.route('**/risks?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });

  // Tasks (for MyTasksWidget)
  page.route('**/tasks?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });

  // Audit logs (activity feed)
  page.route('**/audit-logs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });
}

// ── Tests ──────────────────────────────────────────────────────

test.describe('/dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    mockDashboardAPIs(page);
    await page.goto('/dashboard');
    // Wait for the main content — the greeting heading uses the user's first name
    await page.waitForSelector('h2', { timeout: 15_000 });
  });

  test('page loads without redirect to /login', async ({ page }) => {
    expect(page.url()).toContain('/dashboard');
    expect(page.url()).not.toContain('/login');
  });

  test('compliance score ring (SVG) is visible', async ({ page }) => {
    // ComplianceScoreRing renders an SVG with the score text
    await expect(page.locator('svg text tspan').filter({ hasText: '%' }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('score value is rendered as a percentage', async ({ page }) => {
    const scoreTspan = page.locator('svg text tspan').filter({ hasText: '%' }).first();
    await expect(scoreTspan).toBeVisible({ timeout: 8_000 });
    const text = await scoreTspan.textContent();
    expect(text).toMatch(/\d+%/);
  });

  test('KPI cards are visible on the page', async ({ page }) => {
    // KpiCards render inside rounded-2xl containers
    await expect(page.locator('.rounded-2xl.border.border-gray-100.shadow-sm').first()).toBeVisible({ timeout: 8_000 });
  });

  test('quick actions grid shows navigation links', async ({ page }) => {
    // QuickActions renders 6 Link items in a grid
    const quickActionsLinks = page.locator('a[href="/risks"], a[href="/policies"], a[href="/evidence"], a[href="/gdpr"]');
    await expect(quickActionsLinks.first()).toBeVisible({ timeout: 8_000 });
  });

  test('score trend chart (Recharts LineChart) renders', async ({ page }) => {
    // Recharts renders SVGs inside ResponsiveContainer
    // The ScoreTrendChart is in a .rounded-2xl with "Evolução do Score" heading
    const chartContainer = page.locator('.rounded-2xl').filter({ hasText: /evolução do score/i }).first();
    await expect(chartContainer).toBeVisible({ timeout: 8_000 });
    await expect(chartContainer.locator('svg').first()).toBeVisible({ timeout: 8_000 });
  });

  test('no uncaught JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      // Ignore known Next.js hydration warnings and unrelated browser warnings
      if (!error.message.includes('hydrat') && !error.message.includes('Warning:')) {
        errors.push(error.message);
      }
    });

    // Re-navigate to capture any errors on fresh load
    mockDashboardAPIs(page);
    await page.goto('/dashboard');
    await page.waitForSelector('h2', { timeout: 15_000 });
    // Give the page a moment to settle
    await page.waitForTimeout(1_000);

    expect(errors).toHaveLength(0);
  });

  test('personalizar (customise) button is visible', async ({ page }) => {
    const personalizeBtn = page.locator('button[aria-label="Personalizar dashboard"]');
    await expect(personalizeBtn).toBeVisible({ timeout: 8_000 });
  });

  test('personalizar panel opens and shows widget checkboxes', async ({ page }) => {
    const personalizeBtn = page.locator('button[aria-label="Personalizar dashboard"]');
    await personalizeBtn.click();

    // WidgetConfigPanel renders with checkboxes
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('closing personalizar panel hides checkboxes', async ({ page }) => {
    const personalizeBtn = page.locator('button[aria-label="Personalizar dashboard"]');
    await personalizeBtn.click();

    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 5_000 });

    // Close button in the panel
    const closeBtn = page.locator('button[aria-label="Fechar painel"]');
    await closeBtn.click();

    await expect(page.locator('input[type="checkbox"]').first()).not.toBeVisible({ timeout: 3_000 });
  });

  test('risk summary section links to /risks', async ({ page }) => {
    // RiskSummary has a "Ver mapa" link
    const risksLink = page.locator('a[href="/risks"]').first();
    await expect(risksLink).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('/dashboard responsive', () => {
  test('renders without errors on a mobile viewport', async ({ page }) => {
    mockDashboardAPIs(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForSelector('h2', { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard');
  });
});
