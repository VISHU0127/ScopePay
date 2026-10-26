import crypto from 'crypto';

/**
 * Generates a high-entropy cryptographically secure random token.
 * 32 bytes = 256 bits of entropy (64 hex characters).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a SHA-256 hash of a token for secure database storage.
 * Tokens are never stored in plaintext in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}
