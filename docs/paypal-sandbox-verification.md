# PayPal sandbox verification

## Actual status

No live sandbox order, buyer approval, capture, refund, or delivered webhook has been verified in this audit. PayPal client ID, secret, merchant ID and webhook ID were absent/placeholder. Supabase credentials were also absent. Automated PayPal tests mock HTTP; browser checkout tests simulate a private demo payment. No real-money endpoint is allowed.

## Required variables (server-side unless noted)

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: REST application under the sandbox business account.
- `PAYPAL_MERCHANT_ID`: that sandbox business account's merchant ID, not its email or REST client ID.
- `PAYPAL_WEBHOOK_ID`: webhook registered on the same REST application.
- `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`: other bases are rejected.
- `NEXT_PUBLIC_APP_URL`: canonical app origin, used in return URLs and origin checks.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: persistent repository and verified sign-in.

Use `.env.local`; never paste credentials into logs or issue reports. `npm run check:config` identifies missing names. Do not expose the service-role key or PayPal secret to the browser.

## Accounts and webhook

1. In PayPal Developer Dashboard, use **Sandbox**, create a business receiver and a separate personal buyer. Create a REST app associated with the business account.
2. Copy the app credentials and business merchant ID into environment configuration.
3. Apply both Supabase migrations, configure Auth and sign in as a persistent user. Do not select the private demo: demo always simulates payments even if provider credentials exist.
4. Register an HTTPS webhook URL ending `/api/webhooks/paypal` for capture completed, pending, denied, refunded and reversed events. Set its webhook ID. PayPal must reach this URL; localhost alone cannot receive deliveries. Set up hosting or a tunnel yourself when ready—this audit did not publish or expose the application.
5. Ensure the canonical app origin matches the browser origin. Restart after configuring environment variables.

Official references checked during implementation: [Orders v2](https://developer.paypal.com/api/orders/v2), [idempotency](https://developer.paypal.com/api/rest/reference/idempotency/), [webhook verification](https://developer.paypal.com/api/webhooks/v1), [Payments v2 capture details](https://developer.paypal.com/docs/api/payments/v2/).

## Successful checkout (buyer interaction required)

1. Create a project, confirm scope, create a request and proposal with a small USD amount, and generate a client link.
2. Open the link in a separate browser. Review the exact version and approve with name/email. This records a link-holder assertion; it does not authenticate that identity.
3. Select **Continue to PayPal**. Confirm the address is `www.sandbox.paypal.com`. Sign in with the separate sandbox buyer and approve normally.
4. PayPal returns to the app. In the same browser/tab, select **Verify payment status**. This triggers server capture only after the provider reports buyer approval, and retrieves order and capture details.
5. Confirm order ID, custom/reference IDs, amount, currency and payee merchant ID match the reserved attempt and approved proposal. Only `COMPLETED` becomes paid. URL query parameters cannot mark paid.
6. In the database, expect one attempt for the proposal, matching `proposal_version`, integer amount/currency, unique order and capture IDs; attempt `captured`; proposal `paid`; request `resolved`; one `payment_completed` activity event. Dashboard completed total increases once.
7. Verify the delivered webhook signature succeeds via PayPal's verification API. Redelivery must not duplicate payment activity.

The proposal token is carried in a URL fragment on initial link opening, stored in sessionStorage for that tab, and sent to the app via Authorization header or POST body. PayPal return URLs contain no client bearer token. If browser storage is cleared during checkout, reopen the original link and resume the same checkout. Configure application/proxy logs to redact authorization headers, request bodies and client URLs; do not attach analytics to client pages.

## Cancellation, retry and uncertain outcomes

- Cancel on PayPal: the app says cancelled, never paid. Resume returns to the same reserved order.
- Duplicate create/capture clicks: concurrent requests must share one reservation/order, stable `PayPal-Request-Id`, and one completion activity entry.
- Network loss after capture: keep `payment_pending`; recheck before retry. The capture endpoint first reads the order and returns existing capture state when present. Webhooks also reconcile current state.
- A create reservation without an attached order can be retried with its stable request ID for up to five hours, inside PayPal's default six-hour retention window. Beyond that, reconcile manually with the merchant before any replacement. Automatic replacement attempts are intentionally absent.
- Pending: UI remains unpaid and offers another status check. Failed/denied: remains unpaid. Stale pending/denial cannot overwrite completed.
- Refund/reversal: current capture state or a verified mapped reversal closes checkout; late completion cannot restore paid. Partial refunds are treated as refunded, not as a computed outstanding balance.
- Unmapped signed financial events return an error for redelivery/manual investigation instead of being silently acknowledged as processed. Refund mapping can use the related capture ID.

## Results checklist

| Check | Actual result |
|---|---|
| Stable IDs, duplicate checkout, price tampering, cross-proposal rejection | Deterministic tests / actual demo HTTP tests |
| Merchant/amount/currency mismatch; timeout reconciliation; pending | Mocked PayPal HTTP tests |
| Approval/payment transactions and terminal states | Local disposable PostgreSQL assertions |
| Invalid/missing signature and replay handling | Route tests; no delivered PayPal event |
| Genuine order → buyer approval → server capture | Not executed: credentials/setup required |
| Real duplicate requests, cancellation and timeout recovery | Not executed against PayPal |
| Delivered webhook redelivery, refund/reversal | Not executed against PayPal |

Record future live checks with date, app mode, sanitized order/capture IDs, observed database/UI state and outcome. Do not record buyer credentials or link tokens.
