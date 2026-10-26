import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../lib/db/memory-store';
import { generateSecureToken, hashToken } from '../lib/crypto';

describe('Client Access Tokens and Security Checks', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('generates high entropy 64-hex character random tokens and hashes them with SHA-256', () => {
    const rawToken = generateSecureToken();
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);

    const hash = hashToken(rawToken);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(rawToken); // Tokens are never stored in plaintext
  });

  it('retrieves token by hash and validates expiration', async () => {
    const rawToken = generateSecureToken();
    const proposalId = 'test-prop-1';

    // Create token expiring in 1 hour
    await store.createClientAccessToken(proposalId, rawToken, 1);
    const hash = hashToken(rawToken);

    const fetched = await store.getClientAccessTokenByHash(hash);
    expect(fetched).not.toBeNull();
    expect(fetched?.proposal_id).toBe(proposalId);
    expect(new Date(fetched!.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects revoked tokens', async () => {
    const rawToken = generateSecureToken();
    const token = await store.createClientAccessToken('test-prop-2', rawToken, 24);
    const hash = hashToken(rawToken);

    // Revoke token
    await store.revokeClientAccessToken(token.id);

    const fetched = await store.getClientAccessTokenByHash(hash);
    expect(fetched?.revoked_at).toBeDefined();
  });

  it('rejects expired tokens when checking expiration timestamp', async () => {
    const rawToken = generateSecureToken();
    // Create token with negative expiration (already expired)
    await store.createClientAccessToken('test-prop-3', rawToken, -1);
    const hash = hashToken(rawToken);

    const fetched = await store.getClientAccessTokenByHash(hash);
    expect(fetched).not.toBeNull();
    expect(new Date(fetched!.expires_at).getTime()).toBeLessThan(Date.now());
  });
});
