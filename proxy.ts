import { NextRequest, NextResponse } from 'next/server';
// Single-process abuse guard. Use an upstream distributed limiter before multi-instance hosting.
const windows = new Map<string, { count: number; until: number }>();
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (path !== '/api/webhooks/paypal') {
      const origin = req.headers.get('origin');
      const allowed = new URL(process.env.NEXT_PUBLIC_APP_URL || req.url).origin;
      if ((origin && origin !== allowed) || req.headers.get('sec-fetch-site') === 'cross-site')
        return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
      if (!req.headers.get('content-type')?.includes('application/json'))
        return NextResponse.json({ error: 'JSON content type required' }, { status: 415 });
    }
    if (Number(req.headers.get('content-length') || 0) > 131072)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const key = `${req.headers.get('x-forwarded-for')?.split(',')[0] || 'local'}:${path}`;
    const now = Date.now();
    for (const [id, entry] of windows) if (entry.until < now) windows.delete(id);
    const entry = windows.get(key) || { count: 0, until: now + 60000 };
    entry.count++; windows.set(key, entry);
    if (entry.count > (path.includes('analyze') || path.includes('login') ? 20 : 60))
      return NextResponse.json({ error: 'Please wait a minute before retrying.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  const response = NextResponse.next();
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  if (path.startsWith('/api/') || path.startsWith('/client/')) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/api/:path*', '/client/:path*'] };
