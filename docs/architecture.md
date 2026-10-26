# ScopePay architecture

## Existing stack

Next.js 16.4.2 Route Handlers and React 19 client screens, TypeScript, Tailwind, Zod 4, repository adapters for Supabase PostgreSQL and isolated in-memory demos, Gemini 2.5 Flash, and PayPal sandbox Orders v2 / Payments v2. No deployment was added.

## Trust boundaries

- `lib/auth/session.ts` verifies the Supabase access token using `auth.getUser`; an arbitrary user-ID cookie has no authority. Project handlers verify ownership before accessing dependent objects. Proposal creation additionally verifies the request's project.
- `lib/db/index.ts` selects an explicit private demo session or the configured persistent repository. Demo handles are high-entropy, hashed in a process-local map, expire after 24 hours, and are limited to 100 live stores. Demos never fall through to persistent data and never contact PayPal.
- Supabase service role is server-side and bypasses RLS, so endpoint ownership checks remain essential. Browser roles cannot write tables or invoke mutation RPCs. RLS protects permitted reads; sensitive approval/token/payment tables have no browser policies.
- Client links are separate capabilities, not freelancer sessions. Tokens have 256-bit entropy, SHA-256 storage, expiration, revocation, and proposal binding. Fragment URLs avoid sending new links' tokens in HTTP request URLs. The owner can revoke existing links.
- `proxy.ts` sets private/no-store and no-referrer headers, rejects cross-origin JSON mutations and throttles per-process requests. Forwarded IP trust must be configured at the deployment edge; this is not distributed rate limiting.

## Payment state machine

`approved proposal → reserved attempt → attached PayPal order → pending → captured | failed | refunded | reversed`

The proposal's `paid` status requires a validated completed capture, not a browser callback. Refunded/reversed are terminal; captured ignores delayed pending/failed events. The SQL mutation updates attempt, proposal, request and activity together. Duplicate completions do not create duplicate activity. A signature-verified webhook triggers an authoritative order/capture read, so event delivery order does not become payment state order. Mapped reversal events can close checkout even before a provider read reflects the reversal.

`reserve_payment` locks the proposal and enforces one attempt per immutable version. `attach_payment_order` allows only one order association. Stable 38-character request IDs derive from operation and attempt ID. The reservation exists before the provider call; uncertain outcomes cannot allocate a fresh attempt. A five-hour guard prevents blindly re-creating an unresolved order after PayPal idempotency retention. Payment network calls have timeouts and no-store caching.

All orders set the configured sandbox merchant as payee. Order ID, proposal custom/reference IDs, payee merchant ID, total/currency and capture amount/currency are checked. Only USD is supported. Refund accounting is conservative; partial refunds close checkout as refunded.

## Scope, analysis and proposal versions

Agreement source versions and confirmed scope are separate from AI output. Confirmation validates the agreement ID and quotation text, replaces scope, and invalidates old analyses. A scope fingerprint detects analysis performed against older confirmed items. Gemini uses JSON schema plus runtime validation; unsupported evidence is rejected. Detailed offline fixtures apply only to the exact bundled agreement.

Client proposal terms are frozen on approval in an atomic database function. A revision inserts a new row/version and revokes old links; it does not mutate approved terms. Checkout-started proposals cannot be revised until the merchant reconciles them. The shared-link approval is not identity verification or a certified signature.

## Performance and limitations

Independent project reads run concurrently and analyses use one project query instead of a per-request N+1. Demo agreement text is in a browser-safe module, separate from repository/payment code. Private data and payment status are not globally cached. System fonts avoid blocking remote font requests. Reduced-motion preferences and native dialog focus behavior are supported.

Lists are still unpaginated for this small MVP; measure realistic project volumes before public hosting. Real Gemini and payment latency could not be measured without credentials. Demo stores and rate limits are not designed for multiple app instances. Auth token refresh, job-based reconciliation, account recovery UI, automatic order replacement, and detailed refund/dispute accounting remain outside this implementation.
