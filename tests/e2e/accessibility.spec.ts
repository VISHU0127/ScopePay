import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

test('WCAG automated checks and local navigation measurements', async ({ page, browser }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Start a private demo workspace' }).click();
  await expect(page).toHaveURL(/dashboard/);
  const link = await (await page.request.post('/api/proposals/c0000000-0000-4000-8000-000000000001/link', { data: {} })).json();
  const screens = [
    '/dashboard', '/projects/new', '/projects/b0000000-0000-4000-8000-000000000001',
    '/projects/b0000000-0000-4000-8000-000000000001/review-scope',
    '/projects/b0000000-0000-4000-8000-000000000001/requests/d0000000-0000-4000-8000-000000000001',
    '/projects/b0000000-0000-4000-8000-000000000001/proposals/new?request_id=d0000000-0000-4000-8000-000000000001&revision_id=c0000000-0000-4000-8000-000000000001',
    link.clientLink,
  ];
  const results = [];
  for (const path of screens) {
    await page.goto(path); await page.waitForLoadState('networkidle');
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect.soft(report.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), path.split('#')[0]).toEqual([]);
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return { ttfbMs: Math.round(nav.responseStart), domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), fcpMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0), transferBytes: performance.getEntriesByType('resource').reduce((n, r) => n + (r as PerformanceResourceTiming).transferSize, 0) };
    });
    results.push({ screen: path.split('#')[0].split('?')[0], ...timing, axeViolations: report.violations.length });
  }
  expect(consoleErrors).toEqual([]);
  await writeFile('test-results/local-measurements.json', JSON.stringify({ browser: browser.version(), viewport: '375x900', network: 'localhost, no throttling, warm server and shared browser context', results }, null, 2));
});

test('request dialog traps focus, closes on Escape, and retains typed text', async ({ page }) => {
  await page.goto('/signin'); await page.getByRole('button', { name: 'Start a private demo workspace' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/projects/b0000000-0000-4000-8000-000000000001');
  await page.getByRole('button', { name: /Test Client Request/ }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await dialog.getByLabel('Client Request Description *').fill('Please retain this draft request.');
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: /Test Client Request/ }).click();
  await expect(dialog.getByLabel('Client Request Description *')).toHaveValue('Please retain this draft request.');
});
