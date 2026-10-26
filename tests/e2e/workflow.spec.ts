import { test, expect } from '@playwright/test';
import { DEMO_AGREEMENT_TEXT } from '../../lib/db/memory-store';

test('browser journey: agreement to recorded demo payment (simulation only)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Start a private demo workspace' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole('link', { name: 'New Project', exact: true }).click();
  await page.locator('#name').fill('Browser workflow project');
  await page.locator('#clientName').fill('Test Buyer');
  await page.locator('#clientEmail').fill('buyer@example.com');
  await page.locator('#agreement').fill(DEMO_AGREEMENT_TEXT);
  await page.getByRole('button', { name: /Extract/ }).click();
  await expect(page).toHaveURL(/review-scope/);
  await expect(page.getByText('Source agreement · version 1')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Source agreement · version 1')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm reviewed scope' }).first().click();
  await expect(page).toHaveURL(/projects\/[a-f0-9-]+$/);
  const projectId = page.url().split('/').pop()!;
  // Create request via actual HTTP; analysis and proposal editing remain browser-driven.
  const response = await page.request.post('/api/requests/create', { data: { project_id: projectId, client_request_text: 'Please add an appointment booking widget with calendar sync.' } });
  expect(response.ok()).toBe(true);
  const { changeRequest } = await response.json();
  await page.goto(`/projects/${projectId}/requests/${changeRequest.id}`);
  await expect(page.getByText('Quoted text matches this agreement')).toBeVisible();
  await page.getByRole('link', { name: 'Draft Change Proposal' }).first().click();
  await page.locator('#title').fill('Booking integration');
  await page.locator('#description').fill('Integrate appointment booking with the client calendar after review.');
  await page.locator('#price').fill('150.00');
  await page.getByRole('button', { name: /Create|Generate|Save/ }).last().click();
  await expect(page).toHaveURL(/projects\/[a-f0-9-]+$/);
  await page.getByRole('button', { name: 'Open Client Approval Page' }).click();
  await expect(page.getByRole('heading', { name: /Change Proposal: Booking integration/ })).toBeVisible();
  await page.locator('#clientName').fill('Test Buyer');
  await page.locator('#clientEmail').fill('buyer@example.com');
  await page.getByRole('button', { name: /Approve Proposal v1/ }).click();
  await page.getByRole('button', { name: 'Simulate demo payment' }).click();
  await expect(page.getByText('Simulated payment recorded')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Simulated payment recorded')).toBeVisible();
  expect(errors).toEqual([]);
});

test('HTTP isolation, forged identity, token revocation, tampering and concurrent payment', async ({ playwright }) => {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const first = await playwright.request.newContext({ baseURL });
  const second = await playwright.request.newContext({ baseURL });
  const anonymous = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Cookie: 'scopepay_session_user=f0000000-0000-4000-8000-000000000001' } });
  expect((await anonymous.get('/api/projects')).status()).toBe(401);
  expect((await first.post('/api/auth/login', { data: {} })).ok()).toBe(true);
  expect((await second.post('/api/auth/login', { data: {} })).ok()).toBe(true);
  const created = await first.post('/api/projects/create', { data: { name: 'Private project', client_name: 'Test Buyer', client_email: 'buyer@example.com', agreement_text: DEMO_AGREEMENT_TEXT } });
  expect(created.ok()).toBe(true);
  const { project } = await created.json();
  expect((await second.get(`/api/projects/${project.id}`)).status()).toBe(404);
  expect((await second.post(`/api/projects/${project.id}/confirm-scope`, { data: { items: [] } })).status()).toBe(404);
  expect((await first.post('/api/demo/reset', { data: {}, headers: { Origin: 'https://attacker.example' } })).status()).toBe(403);
  const proposalId = 'c0000000-0000-4000-8000-000000000001';
  const link = await (await first.post(`/api/proposals/${proposalId}/link`, { data: {} })).json();
  const token = link.clientLink.split('#token=')[1];
  expect((await second.get(`/api/client/proposals/${proposalId}`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(403);
  expect((await first.post(`/api/proposals/${proposalId}/approve`, { data: { token, client_name: 'Buyer', client_email: 'buyer@example.com' } })).ok()).toBe(true);
  const orders = await Promise.all(Array.from({ length: 5 }, () => first.post('/api/paypal/create-order', { data: { proposal_id: proposalId, token, amount_cents: 1, currency: 'EUR' } }).then(r => r.json())));
  expect(new Set(orders.map(o => o.orderId)).size).toBe(1);
  const captures = await Promise.all(orders.map(o => first.post('/api/paypal/capture-order', { data: { proposal_id: proposalId, token, order_id: o.orderId } }).then(r => r.json())));
  expect(captures.every(c => c.success)).toBe(true);
  const result = await (await first.get(`/api/client/proposals/${proposalId}`, { headers: { Authorization: `Bearer ${token}` } })).json();
  expect(result.proposal.amount_cents).toBe(15000); expect(result.proposal.payment_status).toBe('paid');
  expect((await first.delete(`/api/proposals/${proposalId}/link`, { headers: { 'Content-Type': 'application/json' } })).ok()).toBe(true);
  expect((await first.get(`/api/client/proposals/${proposalId}`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(403);
  expect((await first.post('/api/webhooks/paypal', { data: { id: 'forged', event_type: 'PAYMENT.CAPTURE.COMPLETED' } })).status()).toBe(503);
  await Promise.all([first.dispose(), second.dispose(), anonymous.dispose()]);
});

for (const width of [375, 768, 1440]) {
  test(`responsive screens at ${width}px with no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/signin');
    await page.getByRole('button', { name: 'Start a private demo workspace' }).click();
    await expect(page).toHaveURL(/dashboard/);
    for (const path of ['/dashboard', '/projects/new', '/projects/b0000000-0000-4000-8000-000000000001', '/projects/b0000000-0000-4000-8000-000000000001/review-scope']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/${width}-${path.split('/').pop()}.png`, fullPage: true });
    }
  });
}

test('client approval, analysis and editor fit every target viewport', async ({ page }) => {
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Start a private demo workspace' }).click();
  await expect(page).toHaveURL(/dashboard/);
  const id = 'b0000000-0000-4000-8000-000000000001';
  const link = await (await page.request.post('/api/proposals/c0000000-0000-4000-8000-000000000001/link', { data: {} })).json();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [`/projects/${id}/requests/d0000000-0000-4000-8000-000000000001`, `/projects/${id}/proposals/new?request_id=d0000000-0000-4000-8000-000000000001&revision_id=c0000000-0000-4000-8000-000000000001`, link.clientLink]) {
      await page.goto(path); await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test('approved proposal revision revokes the old link and requires fresh approval', async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000' });
  await api.post('/api/auth/login', { data: {} });
  const id = 'c0000000-0000-4000-8000-000000000001';
  const token = 'demo-acme-approval-token-2026';
  expect((await api.post(`/api/proposals/${id}/approve`, { data: { token, client_name: 'Buyer', client_email: 'buyer@example.com' } })).ok()).toBe(true);
  const response = await api.post(`/api/proposals/${id}/version`, { data: { amount_cents: 16000 } });
  expect(response.ok()).toBe(true);
  const revision = await response.json();
  expect(revision.proposal.version).toBe(2); expect(revision.proposal.amount_cents).toBe(16000);
  expect(revision.proposal.approval_status).toBe('sent');
  expect((await api.get(`/api/client/proposals/${id}`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(403);
  const early = await api.post('/api/paypal/create-order', { data: { proposal_id: revision.proposal.id, token: revision.rawToken } });
  expect(early.ok()).toBe(false);
  const project = await (await api.get('/api/projects/b0000000-0000-4000-8000-000000000001')).json();
  expect(project.proposals.find((p: { id: string }) => p.id === id).amount_cents).toBe(15000);
  await api.dispose();
});
