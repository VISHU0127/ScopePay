import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: mock.generate }; } }));
import { AIService } from '../lib/ai/adapter';
import { MemoryStore, DEMO_PROJECT_ID, DEMO_OUT_OF_SCOPE_REQUEST_ID } from '../lib/db/memory-store';
beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'mocked-key'); mock.generate.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
it('rejects malformed AI schemas instead of returning sample success', async () => {
  mock.generate.mockResolvedValue({ text: '{"unexpected":true}' });
  await expect(new AIService().extractScope('Agreement with no specified deadlines.')).rejects.toThrow('unavailable');
});
it('rejects unsupported AI quotations', async () => {
  mock.generate.mockResolvedValue({ text: JSON.stringify({ classification: 'out_of_scope', explanation: 'Unsupported result', relevant_scope_item_ids: [], verbatim_citations: ['A made-up deadline'], identified_additional_work: [], clarification_questions: [], draft_client_reply: 'Please review' }) });
  await expect(new AIService().analyzeRequest('Deliver a logo.', [], 'Add a variation.')).rejects.toThrow('unsupported');
});
it('reconfirmation replaces scope and invalidates previous analysis', async () => {
  const store = new MemoryStore();
  expect(await store.getScopeAnalysisByRequest(DEMO_OUT_OF_SCOPE_REQUEST_ID)).not.toBeNull();
  const current = await store.getScopeItems(DEMO_PROJECT_ID);
  await store.saveScopeItems(current.slice(0, 1));
  expect(await store.getScopeItems(DEMO_PROJECT_ID)).toHaveLength(1);
  expect(await store.getScopeAnalysisByRequest(DEMO_OUT_OF_SCOPE_REQUEST_ID)).toBeNull();
});
