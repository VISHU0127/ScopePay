import { cookies } from 'next/headers';
import { IScopePayRepository } from './repository';
import { MemoryStore } from './memory-store';
import { SupabaseStore } from './supabase-store';
import { hashToken, generateSecureToken } from '@/lib/crypto';

export const DEMO_COOKIE = 'scopepay_demo';
declare global { var __scopepay_demos: Map<string, { store: MemoryStore; expires: number }> | undefined; }
const demos = global.__scopepay_demos ??= new Map();
export function persistentConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') && process.env.FORCE_DEMO_STORE !== 'true');
}
export function getPersistentRepository(): IScopePayRepository {
  if (!persistentConfigured()) throw new Error('Persistent workspace is not configured');
  return new SupabaseStore(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
export async function startDemo() {
  for (const [key, value] of demos) if (value.expires < Date.now()) demos.delete(key);
  if (demos.size >= 100) throw new Error('Demo capacity reached. Please try later.');
  const token = generateSecureToken();
  demos.set(hashToken(token), { store: new MemoryStore(), expires: Date.now() + 86400000 });
  (await cookies()).set(DEMO_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 });
}
export async function getRepository(): Promise<IScopePayRepository> {
  const token = (await cookies()).get(DEMO_COOKIE)?.value;
  if (token) {
    const demo = demos.get(hashToken(token));
    if (demo && demo.expires > Date.now()) return demo.store;
    throw new Error('Demo session expired. Start a new demo.');
  }
  return getPersistentRepository();
}
