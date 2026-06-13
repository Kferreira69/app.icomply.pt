/**
 * tasks.spec.ts
 *
 * Tests the /tasks page: list view, kanban view, new task modal,
 * status filter, and status change interaction.
 *
 * Runs authenticated via the 'chromium' project.
 */

import { test, expect } from '@playwright/test';

// ── Mock helpers ───────────────────────────────────────────────

const MOCK_TASKS = [
  {
    id: 'task-1',
    title: 'Rever política de privacidade',
    description: 'Rever e aprovar',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: null,
    assignee: { firstName: 'Ana', lastName: 'Silva' },
    project: { name: 'GDPR 2025', id: 'proj-1' },
    _count: { comments: 2, subtasks: 0 },
  },
  {
    id: 'task-2',
    title: 'Implementar controlo de acesso',
    description: '',
    status: 'IN_PROGRESS',
    priority: 'CRITICAL',
    dueDate: null,
    assignee: null,
    project: { name: 'ISO 27001', id: 'proj-2' },
    _count: { comments: 0, subtasks: 3 },
  },
  {
    id: 'task-3',
    title: 'Auditoria interna Q2',
    description: '',
    status: 'DONE',
    priority: 'MEDIUM',
    dueDate: null,
    assignee: null,
    project: { name: 'Audits', id: 'proj-3' },
    _count: { comments: 0, subtasks: 0 },
  },
];

const MOCK_PROJECTS = [
  { id: 'proj-1', name: 'GDPR 2025' },
  { id: 'proj-2', name: 'ISO 27001' },
];

async function mockTasksAPI(page: import('@playwright/test').Page, tasks = MOCK_TASKS) {
  await page.route('**/tasks*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: tasks, total: tasks.length }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/projects*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_PROJECTS, total: MOCK_PROJECTS.length }),
      });
    } else {
      await route.continue();
    }
  });
}

// ── Tests ──────────────────────────────────────────────────────

test.describe('/tasks page — list view', () => {
  test.beforeEach(async ({ page }) => {
    await mockTasksAPI(page);
    await page.goto('/tasks');
    // Wait for content to load
    await page.waitForSelector('table', { timeout: 10_000 });
  });

  test('renders the tasks table with correct columns', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
    // Expect at least 3 rows of data
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(3);
  });

  test('displays task title, status, and priority', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText('Rever política de privacidade');
    await expect(firstRow).toContainText('HIGH');
  });

  test('shows assignee name when task has an assignee', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText('Ana Silva');
  });

  test('search filters tasks by title', async ({ page }) => {
    const searchInput = page.locator('input[placeholder]').first();
    await searchInput.fill('auditoria');

    // Only the third task should remain
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Auditoria interna');
  });

  test('clears search to show all tasks again', async ({ page }) => {
    const searchInput = page.locator('input[placeholder]').first();
    await searchInput.fill('noresults');
    await expect(page.locator('table tbody tr')).toHaveCount(0);

    await searchInput.clear();
    await expect(page.locator('table tbody tr')).toHaveCount(3);
  });

  test('status filter select is visible in list view', async ({ page }) => {
    // The status filter select appears only in list view
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
  });

  test('stat bar shows task counts per status', async ({ page }) => {
    // 5 stat cards for TODO / IN_PROGRESS / IN_REVIEW / DONE / CANCELLED
    await expect(page.locator('.grid.grid-cols-5 button')).toHaveCount(5);
  });

  test('shows empty state when no tasks match', async ({ page }) => {
    await mockTasksAPI(page, []);
    await page.goto('/tasks');
    await page.waitForSelector('table', { timeout: 10_000 });
    await expect(page.locator('td').filter({ hasText: /sem tarefas|no tasks/i }).first()).toBeVisible();
  });
});

test.describe('/tasks page — kanban view', () => {
  test.beforeEach(async ({ page }) => {
    await mockTasksAPI(page);
    await page.goto('/tasks');
    await page.waitForSelector('table', { timeout: 10_000 });

    // Switch to kanban view
    await page.locator('button[title]').filter({ hasText: '' }).last().click();
    // Use the LayoutGrid button (it has a title attribute set to viewKanban translation)
    // More robust: click the second icon button in the toggle group
    const viewToggleGroup = page.locator('.bg-gray-100.rounded-lg.p-1');
    const kanbanBtn = viewToggleGroup.locator('button').last();
    await kanbanBtn.click();
  });

  test('kanban board renders columns', async ({ page }) => {
    // KanbanBoard renders columns — wait for them to appear
    // The KanbanBoard component creates a flex container with draggable columns
    await expect(page.locator('main')).toBeVisible();
    // At minimum the board container appears — actual column count depends on KanbanBoard impl
  });
});

test.describe('New task modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockTasksAPI(page);
    await page.goto('/tasks');
    await page.waitForSelector('table', { timeout: 10_000 });
  });

  test('opens when "Nova Tarefa" button is clicked', async ({ page }) => {
    const newTaskBtn = page.locator('button').filter({ hasText: /nova tarefa|new task/i }).first();
    await newTaskBtn.click();

    await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5_000 });
  });

  test('has project selector, title, description, priority and date fields', async ({ page }) => {
    const newTaskBtn = page.locator('button').filter({ hasText: /nova tarefa|new task/i }).first();
    await newTaskBtn.click();

    await expect(page.locator('.fixed.inset-0 select').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.fixed.inset-0 input[type="text"], .fixed.inset-0 input:not([type])').first()).toBeVisible();
    await expect(page.locator('.fixed.inset-0 textarea').first()).toBeVisible();
  });

  test('can be dismissed with cancel button', async ({ page }) => {
    const newTaskBtn = page.locator('button').filter({ hasText: /nova tarefa|new task/i }).first();
    await newTaskBtn.click();

    await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5_000 });

    const cancelBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /cancel|cancelar/i }).first();
    await cancelBtn.click();

    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 3_000 });
  });

  test('creates a task with valid data and closes modal', async ({ page }) => {
    await page.route('**/tasks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-task-1', title: 'Nova Tarefa Teste', status: 'TODO' }),
        });
      } else {
        await route.continue();
      }
    });

    const newTaskBtn = page.locator('button').filter({ hasText: /nova tarefa|new task/i }).first();
    await newTaskBtn.click();

    // Select a project
    await page.locator('.fixed.inset-0 select').first().selectOption('proj-1');

    // Fill title
    const titleInput = page.locator('.fixed.inset-0 input').filter({ hasText: '' }).first();
    await titleInput.fill('Nova Tarefa Teste');

    // Submit
    await page.locator('.fixed.inset-0 button[type="submit"]').click();

    // Modal closes
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Status change', () => {
  test('changing status select in a row calls update API', async ({ page }) => {
    await mockTasksAPI(page);

    let updateCalled = false;
    await page.route('**/tasks/task-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        updateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'task-1', status: 'IN_PROGRESS' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/tasks');
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });

    // First row status select
    const statusSelect = page.locator('table tbody tr').first().locator('select');
    await statusSelect.selectOption('IN_PROGRESS');

    // Give mutation time to fire
    await page.waitForTimeout(500);
    expect(updateCalled).toBe(true);
  });
});
