# Local release review — 26 October 2026

Publication is pending the owner's review. No deployment or repository publication was performed.

## Changes in this review

- Added `/guide`: a mobile-friendly walkthrough and keyboard-operable FAQ covering scope review, proposals, demo limitations and payment recovery.
- Linked help from the landing page, sign-in, dashboard and footer.
- Improved sign-in field order, autofill, error announcements and distinct progress messages for account versus demo access.
- Added a dashboard sign-out action using the existing server endpoint, with retry on failure and a full navigation to discard cached workspace UI.
- Added browser coverage for public screens, help navigation, sign-out access removal and failed-login recovery.
- Added the [user guide](user-guide.md) and this review checklist.

## Verification

Lint, TypeScript, 42 automated tests, the Webpack production build and all 11 browser tests passed on 26 October. Automated accessibility checks passed on ten screens; mobile guide layout was visually inspected. Default Turbopack was blocked by the environment's worker-port restriction. Final details are recorded in [audit](audit.md). Historical database/provider checks remain dated separately; local tests do not establish live provider correctness.

## Before publication

- [ ] Owner reviews the landing page, guide and full demo workflow locally.
- [ ] Configure Supabase, Gemini and PayPal sandbox; `npm run check:config` reports all required names present.
- [ ] Apply migrations to a test Supabase project and verify two users cannot read or modify one another's work.
- [ ] Verify live Gemini extraction/analysis and normal sandbox buyer approval, capture and delivered webhook with [the sandbox procedure](paypal-sandbox-verification.md).
- [ ] Choose a deployment that accounts for single-process demo storage and rate limits; use shared storage/protection before running multiple instances.
- [ ] Configure the canonical application URL, secret environment values and HTTPS webhook URL on the selected host.
- [ ] Review source/assets/license and dependency advisories before publishing a repository. Never publish `.env.local` or credentials.
- [ ] Prepare judge access instructions and demo video using [hackathon readiness](hackathon-readiness.md).
- [ ] Obtain the owner's explicit instruction to publish the reviewed build.

## If a published sandbox build fails

Stop sharing the affected demo and revert to the last reviewed application build if sign-in, ownership isolation or payment-state checks fail. Preserve payment attempts and webhook records for reconciliation; do not reset the database or blindly repeat uncertain charges. Database migrations require a backup and a separately reviewed recovery plan, not an automatic reverse migration.

No hosting target or monitoring service has been configured. Before publication, decide who reviews sanitized error logs and verifies the first complete sandbox workflow after deployment.
