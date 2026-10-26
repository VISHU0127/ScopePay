# Developer guide

## Local commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build:webpack
npm run start
npx playwright install chromium
npm run test:e2e
npm run check:config
```

The configuration command exits 1 when any provider group is incomplete; a credential-free demo is still usable. Avoid overwriting an existing `.env.local`. `npm run build` retains the default Turbopack build; `build:webpack` is the verified restricted-environment fallback.

## Read these files first

- `lib/db/repository.ts`: contract shared by memory and Supabase implementations.
- `lib/auth/session.ts`, `app/api/auth/login/route.ts`: verified persistent login and explicit demo sessions.
- `lib/paypal/checkout.ts`: client authorization, reservation, simulation boundary and capture orchestration.
- `lib/paypal/client.ts`: sandbox-only HTTP, stable request IDs, strict provider validation.
- `supabase/migrations/20261019000000_integrity.sql`: atomic approval/version/payment updates and browser permission restrictions.
- `lib/ai/adapter.ts`: schemas, prompts, exact sample fixture boundary and evidence checks.
- `proxy.ts`: origin, content-type, headers and per-process throttling.

Next.js repository instructions require reading installed guides in `node_modules/next/dist/docs/` before changing framework APIs. Route params and cookies are asynchronous in this version.

## Tests and what they mean

Vitest tests run offline without loading `.env.local`. The old `end-to-end-workflow.test.ts` is a repository/fixture integration test, not browser or provider end-to-end proof. `checkout-invariants.test.ts` mocks provider HTTP and exercises concurrency, pending/terminal transitions and data binding. Playwright runs the real application and checks the private demo flow, HTTP isolation, viewport layout and accessibility.

Run `tests/sql/invariants.sql` and `tests/sql/access-isolation.sql` only on a disposable database after both migrations. It wraps fixture changes in a transaction and rolls back. A local PostgreSQL run needs minimal `anon`, `authenticated`, `service_role` roles and `auth.uid()` to model Supabase; this checks SQL behavior, not Supabase Auth service integration. Do not apply test stubs to a real Supabase project.

## Explain the changes in an interview

“I found that passing tests covered repository behavior but missed HTTP authorization and real checkout. I replaced a forgeable identity cookie with provider-verified sign-in, isolated demo visitors, and added actual browser tests. I reserve one payment attempt before contacting PayPal, use stable retry IDs, and verify the receiver and money on the server. Database transactions keep approvals, payment status and activity consistent. AI output stays a reviewed suggestion, with source quotations checked separately from interpretation.”

## Failure handling

Unknown capture outcomes remain unpaid; retry queries the original order first. Do not manually flip a record to paid based on a redirect. Check PayPal and reconcile the original attempt. After checkout starts, revisions are blocked. Missing checkout configuration fails closed on persistent records; it never switches to simulation.

API failures return generic messages and a correlation ID. Structured error logs contain operation/category/ID, not full exceptions or request bodies. Keep proxy access logs and analytics from recording bearer tokens or private agreement text. Client links should be treated like passwords.

## Known operational work

Before external hosting: configure Supabase Auth and apply migrations; verify real RLS/user isolation; use a trusted edge and shared rate limiter; determine retention/cleanup policy for agreements and approvals; add pagination at realistic volume; run the sandbox checklist; document backup and reconciliation procedures. No public deployment or real-money integration is included.

For the local concurrency regression, use a **disposable** PostgreSQL instance on `/tmp`, port 55439, database `postgres`, apply both migrations and Supabase role stubs, then:

```bash
psql -h /tmp -p 55439 -d postgres -v ON_ERROR_STOP=1 -f tests/sql/concurrency-seed.sql
node tests/sql/concurrency.mjs
```

The seed uses fixed test IDs; run it once per fresh test database. The script checks twelve parallel reservations and twelve parallel completion updates. It does not send PayPal requests.
