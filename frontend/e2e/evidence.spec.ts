/**
 * evidence.spec.ts
 *
 * Tests the /evidence page: list, empty state, upload modal, status filter,
 * and bulk actions.
 *
 * Runs authenticated via the 'chromium' project.
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// ── Mock helpers ───────────────────────────────────────────────

const MOCK_EVIDENCE = [
  {
    id: 'ev-1',
    title: 'Política de Segurança v2.1',
    fileName: 'security-policy-v2.1.pdf',
    fileSize: 204800,
    status: 'APPROVED',
    uploadedBy: { firstName: 'Ana', lastName: 'Silva' },
    createdAt: new Date().toISOString(),
    project: { name: 'ISO 27001' },
  },
  {
    id: 'ev-2',
    title: 'Relatório de Auditoria Q1',
    fileName: 'audit-q1.pdf',
    fileSize: 512000,
    status: 'PENDING',
    uploadedBy: { firstName: 'João', lastName: 'Costa' },
    createdAt: new Date().toISOString(),
    project: null,
  },
];

async function mockEvidenceAPI(
  page: import('@playwright/test').Page,
  evidences = MOCK_EVIDENCE,
) {
  await page.route('**/evidence*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: evidences, total: evidences.length }),
      });
    } else {
      await route.continue();
    }
  });
}

// ── Tests ──────────────────────────────────────────────────────

test.describe('/evidence page', () => {
  test.beforeEach(async ({ page }) => {
    await mockEvidenceAPI(page);
    await page.goto('/evidence');
    await page.waitForSelector('table', { timeout: 10_000 });
  });

  test('renders the evidence table', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });

  test('shows evidence items with titles', async ({ page }) => {
    await expect(page.locator('table tbody tr')).toHaveCount(2);
    await expect(page.locator('table tbody tr').first()).toContainText('Política de Segurança');
  });

  test('shows status badges for each evidence item', async ({ page }) => {
    // StatusIcon + status badge per row
    await expect(page.locator('table tbody tr').first()).toContainText(/APPROVED|PENDING|Aprovad|Pendente/i);
  });

  test('stat cards show counts per status', async ({ page }) => {
    // 4 stat cards: PENDING, APPROVED, REJECTED, EXPIRED
    const statCards = page.locator('.grid.grid-cols-4 .rounded-xl');
    await expect(statCards).toHaveCount(4);
  });

  test('"upload evidence" button is visible', async ({ page }) => {
    const uploadBtn = page.locator('button').filter({ hasText: /upload|submeter|nova evidência/i }).first();
    await expect(uploadBtn).toBeVisible();
  });

  test('status filter dropdown is visible', async ({ page }) => {
    const filterSelect = page.locator('select').first();
    await expect(filterSelect).toBeVisible();
    // Should have options for all statuses
    await expect(filterSelect.locator('option')).toHaveCount(5); // '' + 4 statuses
  });

  test('filtering by status makes a new API request', async ({ page }) => {
    let filteredRequestMade = false;
    await page.route('**/evidence*', async (route) => {
      if (route.request().url().includes('status=APPROVED')) {
        filteredRequestMade = true;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.locator('select').first().selectOption('APPROVED');
    await page.waitForTimeout(500); // let query refetch
    expect(filteredRequestMade).toBe(true);
  });
});

test.describe('Evidence empty state', () => {
  test('shows empty state when API returns no items', async ({ page }) => {
    await mockEvidenceAPI(page, []);
    await page.goto('/evidence');
    await page.waitForSelector('table', { timeout: 10_000 });

    await expect(page.locator('td').filter({ hasText: /sem evidências|no evidence/i }).first()).toBeVisible();
  });
});

test.describe('Upload modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockEvidenceAPI(page);
    await page.goto('/evidence');
    await page.waitForSelector('table', { timeout: 10_000 });

    // Open upload modal
    const uploadBtn = page.locator('button').filter({ hasText: /upload|submeter|nova evidência/i }).first();
    await uploadBtn.click();
    await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5_000 });
  });

  test('modal contains file drop zone and title input', async ({ page }) => {
    // Drop zone has "click to select" text
    await expect(page.locator('.border-dashed')).toBeVisible();
    // Name input
    await expect(page.locator('.fixed.inset-0 input[type="text"], .fixed.inset-0 input:not([type="file"]):not([type="hidden"])').first()).toBeVisible();
  });

  test('upload button is disabled when no file is selected', async ({ page }) => {
    // The upload button is disabled until file + title are set
    const submitBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /upload|enviar/i }).last();
    await expect(submitBtn).toBeDisabled();
  });

  test('can be closed with the X button', async ({ page }) => {
    const closeBtn = page.locator('.fixed.inset-0 button').filter({ hasText: '' }).first();
    // More targeted: button with X icon is the first button in modal header
    await page.locator('.fixed.inset-0 button svg').first().locator('..').click();

    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 3_000 });
  });

  test('can be closed with the cancel button', async ({ page }) => {
    const cancelBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /cancel|cancelar/i }).first();
    await cancelBtn.click();
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 3_000 });
  });

  test('uploads a file and closes modal on success', async ({ page }) => {
    await page.route('**/evidence/upload', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-ev-1',
          title: 'Test Evidence',
          fileName: 'test.pdf',
          status: 'PENDING',
        }),
      });
    });

    // Set file via the hidden file input
    const fileInput = page.locator('.fixed.inset-0 input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-policy.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content'),
    });

    // Wait for title to auto-populate from filename
    const titleInput = page.locator('.fixed.inset-0 input').filter({ hasText: '' }).nth(1);
    // Clear and set title explicitly
    await titleInput.fill('Test Evidence');

    // Now upload button should be enabled
    const submitBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /upload|enviar/i }).last();
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
    await submitBtn.click();

    // Modal should close
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Bulk actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockEvidenceAPI(page);
    await page.goto('/evidence');
    await page.waitForSelector('table', { timeout: 10_000 });
  });

  test('select all button appears in the bulk toolbar', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /seleccionar tudo|select all/i }).first()).toBeVisible();
  });

  test('clicking a row checkbox selects that item and shows approve/reject buttons', async ({ page }) => {
    // Click the checkbox button for the first row
    const firstRowCheckbox = page.locator('table tbody tr').first().locator('button').first();
    await firstRowCheckbox.click();

    // Approve and reject buttons should now be visible in the toolbar
    await expect(page.locator('button').filter({ hasText: /aprovar|approve/i }).first()).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('button').filter({ hasText: /rejeitar|reject/i }).first()).toBeVisible({ timeout: 3_000 });
  });
});
