import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';
import { MemoryStore } from '@/lib/db/memory-store';
export async function POST() {
  if (!await getCurrentFreelancer()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const repo = await getRepository();
  if (!(repo instanceof MemoryStore)) return NextResponse.json({ error: 'Only demo workspaces can be reset' }, { status: 403 });
  await repo.resetDemoData();
  return NextResponse.json({ success: true });
}
