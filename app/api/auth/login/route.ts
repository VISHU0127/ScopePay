import { NextRequest, NextResponse } from 'next/server';
import { getPersistentRepository, startDemo } from '@/lib/db';
import { authClient, setSessionFreelancer, clearSession } from '@/lib/auth/session';
import { z } from 'zod';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.email) {
      await clearSession(); await startDemo();
      return NextResponse.json({ success: true, mode: 'isolated_demo' });
    }
    const parsed = z.object({ email: z.email(), password: z.string().min(1).max(256) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
    const { data, error } = await authClient().auth.signInWithPassword(parsed.data);
    if (error || !data.session) return NextResponse.json({ error: 'Invalid sign-in details.' }, { status: 401 });
    const repo = getPersistentRepository();
    if (!await repo.getFreelancer(data.user.id)) await repo.createFreelancer({ id: data.user.id, email: data.user.email!, name: data.user.user_metadata.name || data.user.email!.split('@')[0] });
    await setSessionFreelancer(data.session.access_token, data.session.expires_in);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Sign in unavailable. Try the isolated demo or contact the workspace owner.' }, { status: 503 }); }
}
export async function DELETE() { await clearSession(); return NextResponse.json({ success: true }); }
