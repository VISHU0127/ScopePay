import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore, DEMO_PROJECT_ID } from '../lib/db/memory-store';

describe('Proposal Versioning and Freeze Rules', () => {
  let store: MemoryStore;

  let requestId: string;
  beforeEach(async () => {
    store = new MemoryStore();
    requestId = (await store.createChangeRequest({ project_id: DEMO_PROJECT_ID, client_request_text: 'New booking integration' })).id;
  });

  it('creates proposals in draft approval status and unpaid payment status', async () => {
    const proposal = await store.createChangeProposal({
      project_id: DEMO_PROJECT_ID,
      change_request_id: requestId,
      title: 'Calendar Booking',
      description: 'Add Google Calendar scheduling',
      acceptance_criteria: ['Google Calendar sync'],
      amount_cents: 15000,
      currency: 'USD',
    });

    expect(proposal.version).toBe(1);
    expect(proposal.approval_status).toBe('draft');
    expect(proposal.payment_status).toBe('unpaid');
    expect(proposal.frozen_at).toBeUndefined();
  });

  it('freezes proposal upon client approval', async () => {
    const proposal = await store.createChangeProposal({
      project_id: DEMO_PROJECT_ID,
      change_request_id: requestId,
      title: 'Booking Integration',
      description: 'Setup booking widget',
      acceptance_criteria: ['Working booking widget'],
      amount_cents: 15000,
      currency: 'USD',
    });

    const approval = await store.recordClientApproval({
      proposal_id: proposal.id,
      proposal_version: 1,
      client_name: 'Sarah Jenkins',
      client_email: 'sarah@acmestudio.example',
    });

    expect(approval.client_name).toBe('Sarah Jenkins');

    const frozen = await store.getProposal(proposal.id);
    expect(frozen?.approval_status).toBe('approved');
    expect(frozen?.frozen_at).toBeDefined();
  });

  it('creates new version and marks previous version as superseded when modified', async () => {
    const original = await store.createChangeProposal({
      project_id: DEMO_PROJECT_ID,
      change_request_id: requestId,
      title: 'Booking v1',
      description: 'Initial booking setup',
      acceptance_criteria: ['Criterion 1'],
      amount_cents: 10000, // $100.00
      currency: 'USD',
    });

    // Freelancer increases scope and price to $150.00 (15000 cents)
    const revision = await store.createNewProposalVersion(original.id, {
      title: 'Booking v2 with SMS Alerts',
      amount_cents: 15000,
      acceptance_criteria: ['Criterion 1', 'SMS confirmation alerts'],
    });

    expect(revision.version).toBe(2);
    expect(revision.amount_cents).toBe(15000);
    expect(revision.approval_status).toBe('draft');

    // Previous version is superseded
    const prev = await store.getProposal(original.id);
    expect(prev?.approval_status).toBe('superseded');
  });
});
