import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getRepository, DEMO_COOKIE, persistentConfigured } from '@/lib/db';
import { DEMO_FREELANCER_ID } from '@/lib/db/memory-store';
const SESSION_COOKIE_NAME = 'scopepay_access';
export function authClient() {
  if (!persistentConfigured() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Sign in is not configured');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function getCurrentFreelancer() {
  const jar = await cookies();
  try {
    if (jar.get(DEMO_COOKIE)) return (await getRepository()).getFreelancer(DEMO_FREELANCER_ID);
    const token = jar.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const { data, error } = await authClient().auth.getUser(token);
    if (error || !data.user) return null;
    return (await getRepository()).getFreelancer(data.user.id);
  } catch { return null; }
}
export async function setSessionFreelancer(accessToken: string, expiresIn = 3600) {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.set(SESSION_COOKIE_NAME, accessToken, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: expiresIn });
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME); jar.delete(DEMO_COOKIE); jar.delete('scopepay_session_user');
}
