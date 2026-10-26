import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public guide is accessible on mobile and leads to a demo that can sign out', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  for (const path of ['/', '/guide', '/signin']) {
    await page.goto(path);
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(report.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/');
  await page.getByRole('link', { name: 'See how ScopePay works' }).click();
  await page.getByText('Does the private demo charge money?', { exact: true }).click();
  await expect(page.getByText('No. Demo checkout is a simulation', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Start a private demo', exact: true }).click();
  await page.getByRole('button', { name: 'Start a private demo workspace' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('link', { name: 'Follow the walkthrough' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/signin/);
  expect((await page.request.get('/api/projects')).status()).toBe(401);
  await page.goto('/dashboard');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Sign in or start a private demo');
});

test('failed account sign-in retains inputs and permits retry', async ({ page }) => {
  await page.goto('/signin');
  await page.route('**/api/auth/login', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Sign in unavailable. Please retry.' }) }));
  await page.getByLabel('Email Address').fill('reviewer@example.com');
  await page.getByLabel('Password', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Sign in unavailable');
  await expect(page.getByLabel('Email Address')).toHaveValue('reviewer@example.com');
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start a private demo workspace' })).toBeEnabled();
});
