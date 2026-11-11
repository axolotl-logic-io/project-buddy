# Battery purchases

When a valid isolated test catalog is available, Settings offers **Buy batteries** at `/settings?section=batteries#buy-batteries`. Each server-controlled offer shows its battery amount and monetary price with currency before Stripe-hosted Checkout. Batteries fund model use. Battery grants never change historical Marketplace accounting.
When Checkout is unavailable, model-use shortage messages explain that purchases are unavailable. They offer no dead-end purchase link or earning fallback. The Library should describe actual availability and label purchases as test-only until launch approval.

## Launch status

This implementation accepts test keys only, requires a local database, and refuses purchases on Vercel production. Preview and development normally share the production Neon database; test payments must never credit that database. Live packages, prices, currency, tax treatment and refund terms remain unconfigured. No real charge is needed or authorized. Do not replace test keys with live keys: enabling live purchases requires a separate reviewed change and the policy and adjustment work below.

Stripe test credentials and a configured test catalog were not supplied for this assignment. Automated default tests are deterministic; real Stripe lifecycle validation remains an external credential blocker, not a claimed passing check.

The Batteries terminology follows the glossary. Existing `gold` identifiers and copy keys remain compatibility names.

Purchase and cash-event audit rows survive account deletion. The purchase retains the immutable buyer UUID, without an account foreign key or email. There is no current delete-user flow. A paid purchase whose buyer has been deleted remains unfulfilled and returns a retryable error for manual cash reconciliation; it never recreates a balance or falsely records a grant. Retention duration and an authorized audit-erasure procedure still need review before live launch.

## Configure Stripe test mode

1. In a Stripe sandbox, create one-time prices. Configure tax-exclusive test prices with no automatic tax, discounts or adjustable quantities.
2. Set server-only `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`, `BATTERY_TEST_CATALOG` and `STRIPE_TEST_RETURN_ORIGIN` through the existing secret environment. Never commit their values.
   Set `STRIPE_TEST_RETURN_ORIGIN` to the exact test site origin, without a trailing slash; Checkout must return to the isolated local test site, not production. Hosted preview purchases are unavailable because they share the production database.

3. Set the catalog to a JSON array of objects with `id`, `priceId`, `batteries`, `amount` and `currency`. The amount is the integer Stripe minor-unit price; currency is lowercase. Initially supported currencies are USD, EUR and GBP; this avoids incorrect display of Stripe-specific minor-unit exceptions. This support list does not select a commercial currency. Choose sandbox values explicitly: the repository supplies no commercial package defaults.
4. Configure a snapshot webhook for `checkout.session.completed`, `checkout.session.expired`, `refund.created`, `refund.updated`, `refund.failed`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `charge.dispute.funds_withdrawn` and `charge.dispute.funds_reinstated` at `/api/stripe`. For local work, forward with Stripe CLI to the worktree's own site port. Use that listener's signing secret.
5. Keep test and future live keys, catalogs, endpoints and databases separate. Use the worktree-local database; remote databases are refused. No live configuration accessor exists today.

Only cards are enabled. Delayed payment methods, subscriptions and automatic recharge are not supported. Stripe collects card data; the site stores only buyer, offer snapshot, session/payment/event references, fulfillment time and state.

## Payment and audit

The authenticated Server Action accepts only a catalog package identifier. It verifies the configured Stripe price before creating Checkout. The immutable purchase snapshot determines the recipient and grant. The webhook verifies the raw body signature, refuses live and connected-account events, then retrieves the current session and line items from Stripe. Session mode, payment status, amount, currency, reference, price and quantity must match.

The purchase row doubles as the fulfillment ledger: the row lock, balance adjustment and fulfillment references commit in one database transaction. Unique session and payment identifiers prevent reuse. Existing internal `gold` balance names and conversion rates remain unchanged. The separate ledger keeps the old live build's legacy ledger parser compatible during rollout.

A success redirect means pending confirmation. A cancellation redirect means Checkout was closed; it does not prove a payment failed. A failed card stays in Checkout for retry and grants nothing. Abandoned sessions remain pending until Stripe expires them. Settings refresh reads the confirmed balance and purchase history.

## Refunds and disputes

No customer refund policy has been chosen. Do not automatically deduct batteries or promise a refund. Before live launch, approve full and partial refunds, dispute openings/wins/losses, fees, rounding, tax corrections, and what happens when batteries have already been spent.

The live-enablement change must add an auditable adjustment ledger with unique provider adjustment references, transactionally applied signed balance deltas, and cumulative refund/dispute tracking that prevents double reversal across different events. It must define negative-balance handling and recovery, test partial refunds and already-spent batteries, and reconcile Stripe cash movements with battery adjustments. Until that work and policy review are complete, live purchases remain blocked. Sandbox refunds and disputes do not adjust batteries in this implementation.

Verified refund and dispute events retrieve the current Stripe object and match its payment intent to the retained purchase. Each observation records a unique event reference, provider object reference, purchase, kind, event type, current amount/currency/status and observation time in `battery_cash_events`. Duplicate deliveries insert once, including concurrent deliveries. Provider/storage failures return 500 for replay. If the payment has not yet been fulfilled but Stripe Checkout identifies it as a battery purchase, delivery returns 500 until fulfillment can establish the payment reference.

These are current-state observations, not cash movements or battery adjustments. Multiple events can describe the same refund or dispute; never sum their amounts. A replay observes current state, not necessarily the state when Stripe created the event. Use provider object references to reconcile partial/full refunds, failures and dispute outcomes against Stripe's cash ledger. Fees, tax corrections, overlapping refunds/disputes and cumulative battery reversal still require the policy and adjustment implementation above. No raw payment payload or card data is retained.

## Reconcile and replay

1. Identify the purchase by its immutable id and retained session/payment/event references. Inspect the purchase and balance through authorized operations; never expose credentials or card data.
2. Compare it with Stripe test-mode session, payment status, price, amount and currency. A paid session with no fulfillment time needs recovery.
3. Resend the original Checkout event from Stripe Workbench or Stripe CLI after restoring database access. Use the original configured endpoint and its signing secret. The handler retrieves current Stripe state, so replay works after the catalog changes.
4. Confirm one fulfilled purchase and one balance increase. A duplicate delivery is safe. A webhook returns 500 on storage or provider failure so Stripe can retry. Unrelated Checkout sessions are acknowledged. Permanent purchase/session/line mismatches are acknowledged without a grant and logged with safe event/purchase references for investigation; corrected payments need explicit replay. Invalid signatures or source environments return 400.
5. Investigate mismatched references or unknown purchases rather than granting batteries manually. Definite creation rejections and missing Checkout URLs are recorded as failed. Ambiguous connection/server failures stay pending because a payable session might exist. A later verified paid event can recover either state.

## Migrate and roll back

Migration 0049 adds `battery_purchases`. Migration 0054 adds `battery_cash_events` and removes only the cascading buyer foreign key from purchases. It retains the required buyer UUID column and every existing purchase field. This expansion preserves the old live build's reads/writes and changes no balance. Removing the cascade intentionally preserves audits when an account is deleted; fixture cleanup deletes its audit rows explicitly. Run the normal migration gate before the new build. Rollback restores code without dropping the audit table or undoing grants. Remove offers to stop new sessions while retaining test credentials and the webhook to finish in-flight payments. Before removing webhook support, reconcile every paid session. Revert code only after accounting for pending deliveries; retain records for replay and audit.

## Validate with Stripe

Real Stripe tests are opt-in system integration work, outside default gates. Use only an isolated test database and Stripe sandbox. Record the Stripe account/environment, tested head and event ids, without secrets.

Exercise a successful card payment with Checkout closed before returning; cancel before payment; decline a card and retry; expire an unpaid session; resend the same event and another event for the same session; send an invalid signature; make the local database unavailable during payment, restore it and replay. Verify only the authenticated buyer receives exactly one configured grant, and the history and balance agree. Confirm live keys and production deployment configuration are refused. No production test writes or real charges.
