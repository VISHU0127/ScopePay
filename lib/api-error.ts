import { NextResponse } from 'next/server';
export function apiError(operation: string, error: unknown) {
  const correlationId = crypto.randomUUID();
  // Do not log raw provider exceptions: they may contain submitted text or credentials.
  console.error(JSON.stringify({ operation, correlationId, category: error instanceof SyntaxError ? 'invalid_json' : 'operation_failed' }));
  return NextResponse.json({ error: error instanceof SyntaxError ? 'Invalid JSON request.' : 'Unable to complete this request. Please retry.', correlationId }, { status: error instanceof SyntaxError ? 400 : 500 });
}
