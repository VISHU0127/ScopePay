# Using ScopePay

The website includes this walkthrough at `/guide`, reachable from the landing page, sign-in screen, dashboard and footer.

## Explore without an account

1. Open `/signin` and choose **Start a private demo workspace**.
2. Open the sample project from the dashboard or create your own project with the sample agreement.
3. Review the extracted scope next to the source. Edit it, then confirm.
4. Add a client request, such as “Please add appointment booking with calendar sync.” Review its classification and supporting text.
5. Create a proposal. Set the scope, acceptance criteria and your own USD price, then preview it.
6. Generate the client link and open it in the same browser session. Approve the exact version and simulate payment.
7. Return to the project and dashboard to inspect the activity and completed-payment total.
8. Use **Sign out** on the dashboard when finished. This removes this browser's login cookies and clears ScopePay drafts/client tokens in the current tab. It does not revoke already-shared persistent client links or sign out other devices.

Demo payments do not call PayPal. Demo data is temporary and expires after 24 hours or a server restart. Do not use confidential documents to explore the demo.

## Use a configured workspace

The workspace owner must configure Supabase and create an email/password account before you sign in. There is no self-service registration or password-reset screen. Follow the [README setup](../README.md#persistent-workspace-and-real-sandbox-setup).

With Gemini configured, agreement extraction and request analysis call the model; you still review the results and set pricing. Without it, only the bundled sample has detailed fixtures. Unknown agreements require manual review.

For real sandbox checkout, use a persistent workspace and complete [PayPal sandbox setup](paypal-sandbox-verification.md). All payments go to one configured sandbox merchant. The buyer approves on official PayPal, returns to the proposal and selects **Verify payment status**. Pending or uncertain payment is never proof of completed payment.

## Recover from common issues

| Situation | Action |
|---|---|
| Sign-in fails | Check account details or contact the workspace owner. Inputs remain available for retry. The private demo works without provider credentials. |
| Demo expired | Start a new private demo; its previous data cannot be restored. |
| Client link fails | Ask the freelancer for a fresh link. Demo links need the original browser session; expired/revoked links cannot approve work. |
| AI request fails | Retry after the error. Review the original agreement; do not invent missing terms. |
| Approved terms need changing | Create a revision and request fresh approval. A started checkout must be resolved first. |
| Checkout is cancelled or uncertain | Return to the same proposal and check the existing payment status. Avoid creating duplicate proposals to retry a possible charge. |

AI output is a suggestion, and shared-link approval is not verified identity. Review the full [MVP boundaries](../README.md#important-mvp-boundaries) before using a persistent workspace.
