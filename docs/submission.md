> Verification note (21 October 2026): see [hackathon readiness](hackathon-readiness.md), [audit](audit.md) and [sandbox checklist](paypal-sandbox-verification.md). Local checks passed on 20 October; live provider credentials remain missing. Provider integrations are implemented but a live sandbox exchange has not been executed. Private demos use simulated payments. Product descriptions below explain implementation, not evidence of live verification.

# ScopePay Hackathon Submission

**Project Name**: ScopePay  
**Tagline**: “Clear scope. Approved changes. Confident payments.”  
**Target User**: Freelance developers and designers whose clients request additional work beyond an agreed project scope.

---

## 1. Executive Summary

Scope creep is a common cause of unpaid overtime and strained client relationships for independent software freelancers. Clients rarely request out-of-scope work maliciously; rather, both parties lack an shared review process to compare new requests against signed contracts, agree on incremental prices, and collect payment before extra hours are spent.

**ScopePay** solves this by bridging contractual scope extraction, grounded contract comparison, versioned client sign-offs, and server-verified PayPal checkout into an integrated workflow.

---

## 2. Meaningful AI Implementation

Rather than using generative AI as an unconstrained chatbot, ScopePay treats language models as structured contract parsers bounded by deterministic verification:

### A. Grounded Contract Citation Verification
- **Problem**: LLMs are notorious for hallucinating terms that sound legally convincing but never existed in the contract.
- **Solution**: ScopePay's server-side AI pipeline extracts verbatim quotation claims and executes an automated, word-for-word string verification against the normalized raw agreement text (`lib/ai/citation-verifier.ts`). If an AI analysis cites an exclusion or clause that is not in the source contract, it is flagged as unverified and rejected from evidence.

### B. Nuanced Request Classification
- The engine classifies incoming requests into three explicit buckets:
  1. `in_scope`: Covered by agreed deliverables or an active revision round.
  2. `out_of_scope`: Violates explicit contract boundaries or introduces new functionality.
  3. `ambiguous`: Insufficient acceptance criteria (e.g., “make the website faster”).
- For complex, compound client messages, ScopePay outputs a multi-part breakdown (`sub_parts`) separating included tasks (e.g. fixing a typo) from add-on deliverables (e.g. SMS gateway integrations).

### C. Human-in-the-Loop Price Sovereignty
- In strict adherence to ethical freelance tooling, **AI never sets a binding price or charges a client**. The AI extracts and drafts the scope deliverables and acceptance criteria; the freelancer retains sole authority to review, adjust, and set the price in USD.

### D. Offline Grounded Fixtures
- When API keys (`GEMINI_API_KEY`) are omitted in development or review environments, ScopePay falls back to verified deterministic fixtures based on benchmark agreements, clearly labeled so reviewers can experience the full workflow without external blockers.

---

## 3. Meaningful PayPal Sandbox Implementation

ScopePay implements a genuine, server-authoritative PayPal Orders v2 integration designed for financial correctness:

### A. Zero Browser Trust
- Browser clients cannot manipulate prices or payment statuses. The frontend merely sends a secure proposal reference; the backend loads the approved price in integer cents directly from the database and constructs the PayPal order server-to-server.

### B. Strict Capture Verification
- Upon client payment approval, the backend captures the order (`POST /v2/checkout/orders/{id}/capture`) and strictly validates:
  1. Capture status is `COMPLETED`.
  2. Captured currency matches `USD`.
  3. Captured monetary amount matches the approved proposal amount exactly.
  4. The returned `custom_id` / `reference_id` strictly matches the proposal ID.
- If any check fails, the proposal is never marked paid.

### C. Idempotency & Webhook Replay Protection
- Client clicks and network retries are safeguarded via documented `PayPal-Request-Id` headers.
- Webhook events (`PAYMENT.CAPTURE.COMPLETED`) are verified via PayPal's `/v1/notifications/verify-webhook-signature` and checked against an internal `processed_webhook_events` table to prevent duplicate accounting.

### D. Dual-Mode Simulation
- For offline evaluation without PayPal developer credentials, ScopePay provides a transparent sandbox simulator that models application payment transitions and sample receipts while clearly alerting the user that simulated mode is active and no real currency moved.

---

## 4. Key Engineering & Architecture Choices

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) & TypeScript | Modern server components, typed API routes, and fast build optimizations. |
| **Styling** | Tailwind CSS v4 & Lucide Icons | Clean, responsive SaaS aesthetic with navy (`#0f172a`), teal accents (`#0d9488`), and accessible contrast. |
| **Data Layer** | Dual Repository Pattern (`MemoryStore` + `SupabaseStore`) | Zero-config instant demo evaluation out-of-the-box, plus full Supabase PostgreSQL migrations with RLS. |
| **Validation** | Zod 4.x | Comprehensive runtime validation for monetary amounts (integer cents), contract tokens, and AI payloads. |
| **Tokens** | SHA-256 Hashed Client Links | 256-bit cryptographically secure tokens (`crypto.randomBytes(32)`). Plaintext tokens never touch the database. |
| **Testing** | Vitest | 42 deterministic unit/route/integration tests plus separate Playwright browser tests; live provider checks remain separate. |

---

## 5. Technical Challenges & Solutions

1. **Hallucination Prevention**: Building the `verifyCitations` module to handle minor formatting differences (curly vs straight quotes, trailing punctuation) without compromising strict word-for-word textual presence in the source contract.
2. **State Freezing & Immutability**: Ensuring that once a proposal is approved, its amount, description, and criteria cannot be modified in place. Any adjustments cleanly fork into version $N+1$, marking previous versions as superseded.
3. **Floating Point Monetary Precision**: Eliminating floating-point errors by enforcing all internal monetary calculations in integer cents, converting only at the PayPal API boundary.

---

## 6. Assumptions & MVP Limitations

- **Single Receiving Account**: In this MVP, all payments flow to a single configured PayPal Sandbox merchant account. Marketplace multi-seller disbursements, split payments, platform fees, and escrow are intentionally omitted.
- **Client Link Approvals**: Approvals recorded through secure access links represent logged client agreement (recording asserted name, email, proposal version and timestamp), but do not constitute legal identity verification or certified electronic signatures (such as DocuSign).
- **Currency**: USD only for the MVP.
- **Legal Advice**: ScopePay supports agreements and payment workflows; it does not offer legal opinions, arbitration, or automated dispute rulings.
