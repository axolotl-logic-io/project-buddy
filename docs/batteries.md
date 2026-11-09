# Batteries

Batteries are the model-use balance formerly called gold. Headings and labels use “Batteries”; sentences use “1 battery” and “100 batteries”. Insufficient-balance messages say “You're out of batteries.” The rename changes no balances, starting grants, precision, rates, reservations or charging behavior. A balance displays whole batteries rounded down and clamped at zero; reply costs retain fractions.

Replies, generated adventure openings and names, images and Workshop tests spend the acting user's batteries. Automatic check-ins spend the quest owner's batteries. Existing payer isolation and idempotent accounting apply unchanged.

## Marketplace cutover

Before the orb migration, the existing gold accounting, now called Batteries for model use, also backed legacy Marketplace transfers. The orb migration pauses all Marketplace buys immediately, including old and free forms. While the gate is disabled, no sales can fund model use. After operator activation, Marketplace transfers use separate orbs and cannot fund model use. Batteries and orbs cannot be converted.

The [Marketplace cutover plan](marketplace.md#currency-cutover-proposal) documents policy review, migration, old-build drain, history and grant verification, and separate operator activation. Merging code alone does not activate orb buys or authorize production changes. [Battery purchases](battery-purchases.md) retire legacy earning guidance regardless of Checkout availability or the orb gate. Disabled purchases show an honest unavailable message; only configured isolated test Checkout offers the Account purchase link.

## Compatibility boundaries

The `src/gold/` module, its exports and constants, `gold_balances` and `gold_ledger`, and existing numeric fields retain their names. They still store micro-USD at the existing rate. No migration is needed for this rename. No balance is reset, rescaled or granted by it.

Existing `gold` copy keys, component and file names, `requiredGold` and `availableGold` tool fields, `outOfGold`, `out-of-gold`, `too-little-gold`, legacy `quotaUsedUp` results, feature ids and use-case slugs remain compatibility identifiers. New prose calls model-use amounts batteries. Model-visible guidance explains the current term while preserving tool contracts. Theme gold colors describe a color and retain that name.

User-authored prompts and messages, saved adventure snapshots, historical ledger reasons and references, migrations and their fixtures are never rewritten. Historical migration notes in Site operations retain the name used at the time. This rename adds no environment setting, external product reference or payment behavior.

## Planned surfaces

The [header balance](https://github.com/axolotl-logic-io/project-buddy/issues/765), [Stripe purchases](https://github.com/axolotl-logic-io/project-buddy/issues/781) and [Library](https://github.com/axolotl-logic-io/project-buddy/issues/780) use Batteries for model use. These issues own their implementation. Labels, accessible balance names, purchase packages, confirmations and receipts under the app's control must use the same term. Use “Buy batteries” and singular/plural amounts; do not expose provider currency as the user's unit. Stripe product metadata and external references must remain compatible with existing payment identifiers and idempotency keys.
