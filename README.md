# ScopePay

Review project scope, agree additional work, and track an approved proposal through PayPal **sandbox** checkout. This is a student hackathon MVP, not a marketplace or legal decision-maker.

The existing stack is retained: Next.js 16.4.2 App Router, React 19, TypeScript, Tailwind, Zod 4, Supabase PostgreSQL/Auth, Google Gemini, and PayPal Orders v2.

## Run locally

```bash
npm ci
# Only if you do not already have .env.local:
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000/signin and select **Start a private demo workspace**. No credentials are required. The sample agreement and analysis are fixtures, and demo payments are simulations that never contact PayPal. Demo data expires after 24 hours or a process restart. Open demo client links in the same browser session; use a persistent workspace for links shared with another browser.

Open http://localhost:3000/guide for the interactive walkthrough and common questions. Use **Sign out** on the dashboard when finished. See the [user guide](docs/user-guide.md) for recovery steps and the [release review](docs/release-review.md) for what remains before publication.

For a production build locally:

```bash
npm run build
npm run start
```

The latest local verification (26 October) passed with Webpack; this environment blocked Turbopack's internal worker port. The verified alternative is:

```bash
npm run build:webpack
npm run start -- --hostname 127.0.0.1 --port 3000
```

Use `localhost:3000` in the browser to match `NEXT_PUBLIC_APP_URL`. `npm run dev -- --webpack` also uses the standard Tailwind PostCSS setup.

## Persistent workspace and real sandbox setup

1. Create a Supabase project and apply **both** files under `supabase/migrations/`, in filename order. Review existing legacy payment attempts before applying the uniqueness migration; it deliberately fails if duplicate attempts need reconciliation.
2. Set the Supabase variables in `.env.local`. Create an email/password user in Supabase Auth, then sign in with those credentials. The app provisions its profile after verified authentication. Existing email-only profiles are not automatically linked to Auth users; migrate ownership explicitly if you have old data.
3. Optionally set `GEMINI_API_KEY`. Without it, only the exact bundled agreement uses detailed fixtures; other agreements receive conservative manual-review guidance. Live AI errors are surfaced, not silently replaced with convincing sample results.
4. Configure the sandbox business receiver, application, buyer, merchant ID and webhook as described in [sandbox verification](docs/paypal-sandbox-verification.md). All orders use **one configured receiver**. There is no freelancer seller onboarding, split payment, escrow, platform fee, or payout flow.
5. Run `npm run check:config`. This server-side command prints missing variable **names only**; it is not a public diagnostics endpoint and does not verify account access.

## Workflow

Sign in → create project and paste agreement → review extracted scope beside the source → confirm → add a client request → review the suggested classification/evidence and edit the reply → set proposal terms, acceptance criteria and USD price → generate a client link → client approves that version → redirect to official PayPal sandbox → return and select **Verify payment status** → server reconciles/captures → activity and dashboard update.

A quote matching the agreement does not establish that the interpretation is correct. Unspecified terms stay unspecified. Client-link approval records the link holder's asserted name and email, not verified identity or a certified signature.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build:webpack
# In another terminal, with the app running on localhost:3000:
npx playwright install chromium
npm run test:e2e
```

Vitest covers deterministic services, fixture AI, token checks, proposal versions, and mocked PayPal HTTP responses. Playwright exercises the actual browser/HTTP demo journey and isolation. PostgreSQL assertions are in `tests/sql/invariants.sql`, for a disposable migrated database only. See [audit](docs/audit.md) for actual results and limitations; none of these is proof of a live PayPal exchange.

## Important MVP boundaries

- USD only; 1 cent–$1,000,000 per proposal. Prices come from reviewed database proposals.
- One durable checkout attempt per immutable proposal version. Retry uses the same order and request IDs; unknown outcomes remain unpaid. Old unresolved reservations require merchant reconciliation, not a new blind charge.
- Approved terms cannot change. A revision creates a new version and revokes old links. Once checkout begins, revision is blocked pending reconciliation.
- Partial refunds are conservatively shown as refunded; detailed refund accounting, disputes, and automated order replacement are not implemented.
- Demo stores and rate limits are single-process. Distributed deployment requires shared abuse protection; demos are not durable or cross-instance.
- Supabase access tokens expire; this MVP asks the user to sign in again rather than silently refreshing sessions.
- Live Supabase Auth/RLS, Gemini access, PayPal buyer approval, and webhook delivery require your credentials and external setup. No public deployment was performed.

[Architecture](docs/architecture.md) · [Developer guide](docs/developer-guide.md) · [Audit](docs/audit.md) · [Sandbox procedure](docs/paypal-sandbox-verification.md) · [Three-minute demo](docs/demo-script.md)

License: see [LICENSE](LICENSE).
