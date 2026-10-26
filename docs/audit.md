# ScopePay audit — updated 26 October 2026

## Website and documentation follow-up — 26 October

Added an in-app `/guide`, contextual help links, a dashboard sign-out control, clearer sign-in progress/errors and email-first autofill. Added the [user guide](user-guide.md) and [release review](release-review.md). The expanded accessibility check exposed low-contrast landing-page notice text; its contrast was corrected.

Current verification: ESLint and TypeScript pass; 42 Vitest tests pass; the Webpack production build passes; all 11 Playwright tests pass in 24.7 seconds, including sign-out denying subsequent workspace API access and mocked failed-login recovery. Selected axe WCAG 2 A/AA and 2.1 A/AA checks report no violations on the existing seven workflow screens plus landing, guide and sign-in. Existing responsive checks cover 375, 768 and 1440px; new public-screen checks use 375px. The guide mobile screenshot was visually inspected. No new performance improvement claim is made.

The default Turbopack build failed on worker-port binding in this execution environment, including its permission retry. The supported Webpack build was used for final browser verification. `npm run check:config` still reports missing Supabase, Gemini and PayPal credentials. No live-provider verification, database rerun or public publication occurred in this follow-up. Earlier results below remain historical, not fresh evidence.

Baseline: Next.js 16.4.2 App Router, React 19, Tailwind, Zod, Supabase service-role repository plus process-memory demo, Gemini adapter, PayPal Orders v2. No deployment configuration beyond Next.js. Existing user changes preserved.

Baseline verification: 6 Vitest files / 20 tests pass; ESLint and TypeScript pass. Production build blocked in restricted execution by Turbopack's port binding (retry planned). The file named end-to-end-workflow tests repository methods and fixture AI only; it does not exercise HTTP, browser, Supabase, PayPal capture parsing, or webhook verification. The reported provider test coverage was not present.

## Confirmed findings (implementation status and final verification below)

| Severity | Finding and evidence | Impact | Fix / verification |
|---|---|---|---|
| Critical | `lib/auth/session.ts`, `app/api/auth/login/route.ts`: unsigned ID cookie; email-only impersonation; implicit demo login | Read/change another user's projects | Verify Supabase access token using Auth server; isolated opaque demo sessions; forged-cookie HTTP tests |
| Critical | `app/api/webhooks/paypal/route.ts`: verification optional without configuration | Forged event can mark paid | Fail closed; reconcile authoritative provider objects; invalid/replay tests |
| Critical | `app/api/paypal/capture-order/route.ts`: no local order/proposal binding before capture | Token for one proposal can affect another order | Match immutable attempt, proposal, version, amount, currency before provider call |
| High | `app/client/proposals/[id]/page.tsx`: immediate capture without buyer approval | Genuine PayPal checkout fails | Redirect to official sandbox approval, capture/reconcile only on return or explicit refresh |
| High | `lib/db/index.ts`, demo reset route: global mutable demo | Visitors edit/reset each other's data | Per-session stores, bounded lifetime, reset only own demo |
| High | `lib/paypal/client.ts`: unstable create request ID; absent merchant validation | Duplicate orders or wrong receiver | Persist reservation before request, stable request IDs, explicit configured merchant, strict capture validation |
| High | Payment route treats PENDING as failed; memory/Supabase overwrite paid with delayed denial | Incorrect payment history and retry risk | Monotonic transitions, pending/unknown unpaid, reconciliation before retry |
| High | `lib/db/supabase-store.ts`: multiple nontransactional approval/version/payment writes | Races and partial states | Database RPCs with row locks, immutable terms trigger, constraints; database execution requires setup |
| High | Missing credentials silently enable simulated payment on persistent records | Mock success mistaken for payment | Simulation restricted to isolated memory demo; persistent checkout fails closed |
| High | `lib/db/memory-store.ts`: IDs with non-hex p/r/s prefixes | UUID validation blocks central demo flow | Real UUID generation and valid fixture UUIDs; HTTP workflow test |
| High | Proposal creation checks project owner but not request's project | Cross-project references | Enforce both links in route and database trigger |
| Medium | Scope confirmation accepts unchecked input and appends duplicates; analysis cache lacks scope revision | Outdated/duplicate scope and analyses | Validate source/version, replace scope transactionally, invalidate analyses |
| Medium | AI fallback detects Acme by keyword; unsupported quotations and revision assumptions | Invented terms appear authoritative | Restrict fixture to exact agreement, conservative generic fallback, verify evidence and schema |
| Medium | API errors return database/provider exception strings | Internal details leak | Generic errors with correlation ID and sanitized structured logs |
| Medium | Client bearer token in query string; no referrer policy | Tokens leak via URL logging/referrers | Fragment links and authorization header; no-referrer/no-store; remove token from PayPal return URLs |
| Medium | Dashboard combines unapproved/approved amounts and superseded proposals | Misleading outstanding totals | Defined proposed / approved unpaid / completed amounts |
| Medium | No origin guard or request throttling | Cross-site mutations and provider abuse | JSON/origin checks, per-process rate limiting and input bounds |

## Unverified risks

No real Supabase or PayPal configuration exists in `.env.local` (only variable presence inspected). The migrations and transaction/RLS assertions were executed in disposable local PostgreSQL; real Supabase Auth/RLS service integration, multi-instance application behavior and sandbox exchange remain unverified. In-memory demo is intentionally single-process and temporary. Distributed rate limiting and retention policies require deployment decisions.

## Implemented outcome

The confirmed findings above were addressed in the application, with these deliberate limits: demo isolation and throttling are single-process; simulation remains a demo-only feature; refunds are conservatively terminal; checkout-started proposal revision is blocked instead of risking a second charge; client approval is still a bearer-link assertion. Projects and agreements are now created together in a transaction. No existing user work was reset or committed, and no deployment was performed.

Additional fixes found during verification: actual UUIDs now work through route validation; real proposals generate their own client links; owner link revocation and proposal revision are available in the UI; stale analyses are invalidated by scope replacement and checked against a scope fingerprint; analysis replies are editable; the default invented $150 editor price was removed. Demo scenario amounts are explicitly examples.

The final browser rerun exposed an asynchronous proposal-prefill race: loading context could overwrite text while the user typed. The editor now disables its fields until context is loaded. Scope-review draft restoration now runs after hydration and survives refresh; the central browser journey explicitly reloads that screen before confirmation.

## Final checks — 20 October 2026

Lint, type checking, Vitest, the default production build and the complete browser suite were rerun on 20 October after these fixes. Database, Webpack, dependency and bundle checks below were performed on 19 October; the subsequently added `scope_analyses(project_id)` index has not been executed in the local database.

| Check | Actual result |
|---|---|
| ESLint | Pass, no warnings/errors |
| TypeScript (`npm run typecheck`) | Pass |
| Vitest | 9 files, 42 tests pass; deterministic/mocked, not live providers |
| Playwright | 9 tests pass in 22.7 seconds against the final Turbopack production build; actual browser/HTTP demo lifecycle, scope-review refresh, authorization, token revocation, price tampering, concurrent payment, proposal revision and dialog behavior |
| Responsive layout | 375, 768 and 1440px; dashboard, new project, workspace, scope review, analysis, editor, client approval have no horizontal overflow in tested states |
| Accessibility | Zero axe violations for selected WCAG 2 A/AA and 2.1 A/AA checks on seven screens at 375px; not a complete accessibility certification |
| Browser errors | No page/console errors in the measured seven-screen run |
| Production build, default Turbopack | Pass on final rerun (1.6-second compilation); initial restricted attempts failed |
| Production build, Webpack | Pass (`npm run build:webpack`), including static generation and TypeScript |
| SQL migrations | Both execute cleanly on fresh local PostgreSQL 18.4 with Supabase role/auth stubs |
| SQL invariants and RLS | Approval idempotency, immutable approved amount, pending unpaid, late-event monotonicity, refunds, permission restrictions and two-user read isolation pass |
| SQL concurrency | 12 parallel reservations produce one attempt; 12 parallel completion mutations produce one payment activity |
| Browser bundle inspection | 44 JavaScript files; none contain PayPal secret, Supabase service-role key or Gemini key variable names (not a formal secret scan) |
| Config check | Expected exit 1: Supabase, Gemini, PayPal credential names missing; no values logged |
| npm production dependency audit | Zero reported vulnerabilities (`npm audit --omit=dev`) |
| Live Supabase / Gemini / PayPal | Not executed; credentials and buyer interaction unavailable |

A build attempt during browser installation temporarily failed with disk-space exhaustion; clearing this task's generated `.next/cache` allowed subsequent builds to pass. Initial Turbopack builds were blocked by an internal worker port restriction; the final default build also passes with permitted execution. The fallback uses Next.js's supported Webpack option and standard Tailwind PostCSS adapter.

## Measured performance, with limits

Environment: macOS ARM64, Node 22.15.0, Next.js 16.4.2 production Webpack build, Chromium 156.0.8078.4, localhost, viewport 375×900, no CPU/network throttling, warm server and shared browser context. Navigation/resource timings come from the browser Performance API after network idle; they are not Lighthouse scores, real-user metrics, or complete API/hydration latency. Cached resources can have zero transfer size. There is no comparable pre-change browser baseline, so no speedup claim is made.

| Screen | TTFB (ms) | DOMContentLoaded (ms) | FCP (ms) | Resource transfer bytes |
|---|---:|---:|---:|---:|
| Dashboard | 13 | 32 | 40 | 19,799 |
| New project | 2 | 12 | 28 | 9,950 |
| Workspace | 38 | 46 | 52 | 31,513 |
| Scope review | 9 | 20 | 20 | 28,192 |
| Analysis | 9 | 18 | 24 | 33,034 |
| Proposal editor | 9 | 18 | 20 | 29,377 |
| Client approval | 8 | 16 | 20 | 18,548 |

Performance changes: independent reads in parallel, one project-level analysis query replacing per-request queries, source text separated from server repository code in the client bundle, system fonts, no shared private cache, additional scope/analysis indexes. AI/payment network latency and large-account list performance remain unmeasured. Lists remain unpaginated for the small MVP; add pagination before hosting large accounts.

## Remaining risks and setup

- Genuine sandbox exchange and delivered/refunded/reversed webhook behavior still require the procedure in `docs/paypal-sandbox-verification.md`.
- Real Supabase Auth and policies must be exercised after credentials and migrations are applied; the local database uses role/auth stubs, not the Auth service.
- Single-process demo state and rate limiter need replacement or infrastructure support for multi-instance hosting. Enforce body-size limits and trusted IP forwarding at the deployment edge; the app rejects oversized declared bodies and limits individual validated inputs.
- Auth token refresh, automated old-order replacement, background reconciliation, detailed refund balances and disputes are not implemented. Unknown payment outcomes require checking the existing order; old unresolved reservations require merchant review.
- Full npm audit reports five high-severity package entries caused by the **same development-chain** `braces` advisory through ESLint's Next.js plugin. `braces` 3.0.3 is the latest queried version; [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. The offered npm fix downgrades `eslint-config-next` to 14.x and was not applied to this Next.js 16 project. No production dependency advisory was reported. Avoid untrusted glob patterns in lint tooling and recheck for an upstream patch.
- No public deployment, email delivery, real-money checkout or marketplace functionality was added.

## Official integration references consulted

[Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [PayPal Orders v2](https://developer.paypal.com/api/orders/v2), [Payments v2](https://developer.paypal.com/api/payments/v2), [request idempotency](https://developer.paypal.com/api/rest/reference/idempotency/), [webhook verification](https://developer.paypal.com/api/webhooks/v1). Framework implementation followed installed Next.js route-handler/proxy documentation.
