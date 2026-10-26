# Hackathon requirement check — 21 October 2026

Follow-up, 26 October: local website and documentation improvements passed 42 automated tests and 11 browser tests using a Webpack production build. Provider configuration remains missing. See [release review](release-review.md) for the current review and publication checklist; the official-rule lookup below remains dated 21 October.

ScopePay matches the intended product requirements, but live integration evidence and submission packaging remain incomplete. Sponsor tools are optional; Gemini is a valid AI choice.

| Requirement | Implementation / evidence | Remaining work |
|---|---|---|
| Meaningful PayPal integration | Orders v2 creation, official buyer approval, server capture, merchant/amount validation and verified webhooks. Payment is central to collecting approved additional-work fees. | Configure sandbox and execute a genuine buyer-approved exchange; simulation is not evidence of PayPal API execution. |
| Meaningful AI | Gemini extracts scope, analyzes requests against evidence and drafts reviewable content. | Configure Gemini and verify extraction and request analysis on a new agreement; deterministic fixtures are not evidence of live model execution. |
| Working prototype | Local demo workflow; 42 automated tests and 9 browser tests passed on 20 October, alongside lint, type checks and production build. | Verify persistent Supabase Auth/storage and the complete live-provider workflow. |
| Judge documentation | README, architecture, developer guide, audit, sandbox procedure and under-three-minute demo script. | Provide final repository/video URLs and safe judge access instructions. |
| Existing project significantly updated during event | Authentication, payment integrity, scope accuracy, UI and test improvements documented in audit. | Explain these changes in the submission and retain dated development evidence. |
| Official rules | Technical requirements reviewed against official pages below. | Entrant must confirm personal eligibility, ownership, third-party permissions and final submission completeness. |

## Current blockers

`npm run check:config` on 21 October reports these missing names (no secret values logged):

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Gemini: `GEMINI_API_KEY`.
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MERCHANT_ID`, `PAYPAL_WEBHOOK_ID`.

Set these locally in `.env.local`, apply both Supabase migrations and create a test sign-in account. Follow [sandbox verification](paypal-sandbox-verification.md) to configure the webhook endpoint and complete normal sandbox buyer approval. A configured `NEXT_PUBLIC_APP_URL` must match the accessible test environment. Do not put service secrets in the public repository or video.

## Submission completion checklist

- [ ] Record live Gemini extraction and analysis with human review.
- [ ] Record genuine sandbox approval, verified capture and matching application/database state; verify webhook delivery separately.
- [ ] Publish the source repository with its open-source license and reproducible setup instructions. Publication has not been performed or authorized in this task.
- [ ] Provide judge access instructions; public hosting is optional when complete runnable setup is supplied.
- [ ] Upload a functioning demo video under three minutes to YouTube and add its public URL to Devpost.
- [ ] Identify Gemini and PayPal APIs in the project description; describe significant improvements made during the event.
- [ ] Confirm entrant eligibility and submit all required fields before the deadline.

Official sources checked on 21 October: [requirements and submission](https://paypalaihackathon.devpost.com/), [official rules](https://paypalaihackathon.devpost.com/rules). Deadline shown: 12 November 2026 at noon PST (13 November at 1:30 a.m. India time). The organizer determines eligibility and compliance; this checklist does not certify acceptance.
