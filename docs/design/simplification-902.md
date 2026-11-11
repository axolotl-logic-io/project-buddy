# Marketplace and orb removal (#902)

This page records what issue #902 removes. It builds on the quest and Chat UI from #896. Batteries, formerly called gold, are not orbs and stay unchanged: their balance, purchases and metering work as before.

## What the user gets

- No Marketplace: the menu, Home and breadcrumbs no longer link to it, and `/marketplace` and `/marketplace/ID` are not found.
- No seller controls: construct, activity and spell pages have no "Sell in the Marketplace" section, sale state or listing links.
- No orbs: no orb balance, grant or price appears anywhere.
- Bought copies are ordinary private definitions. A construct, activity or spell bought earlier, or cloned from one, can be used, edited, cloned, retired, restored and deleted like any other. Reset now gives it the default instructions, as it does for any definition that came from no built-in one, instead of refusing.

## Removed

- Pages and actions: `app/(workspace)/marketplace/` (browse, listing page, buy form, sell section, listing terms form, loading states and the publish, update, unlist and buy Server Actions), and `ui/copy/marketplace.ts`.
- Runtime: `src/marketplace/` (listing store, buy, cutover gate, listing rules) and `src/orbs/` (orb balance, grant and transfer).
- Gold transfers: `transferGold` and its types in `gold/gold-store.ts`. Only Marketplace sales used them.
- Access predicates: the listing, purchase, seller and orb predicates and `goldBalancesOfTransfer` in `accounts/owner-scope.ts`.
- Rate limits: the listing-change and purchase limits, and `countUserRequest`, in `accounts/rate-limits.ts`.
- Bought-copy branches: `saveBoughtPrompt` and the `saveBought*` store functions, `prompts/own-prompt-kinds.ts`, `OwnPrompt.boughtFrom`, the reset refusal in the three reset actions, the "bought" notes on editor and Retirement pages, and `ListingId`.
- Artwork: the `listing` visual destination, listing asset grants and the buy-time listing grant path in `constructs/visual-asset-store.ts`.
- Unused leftovers: `prompts/own-prompt-paths.ts`, the `store` icon.
- Use cases `use_case_sell_in_marketplace`, `use_case_browse_marketplace`, `use_case_buy_listing` and `use_case_manage_listings` with their tests, `docs/marketplace.md`, and the Marketplace Library paragraph and glossary entries.

## Retained compatibility

The live build reads and writes the `listings`, `purchases`, `orb_balances`, `orb_ledger` and `marketplace_cutover` tables, the `buddies.bought_from` column and `construct_asset_grants.listing_id`. This change keeps them all in `src/db/tables/` but no longer reads or writes them. It ships no migration, and no historical row or balance is rewritten. `gold_ledger` keeps its `marketplace-sale` and `marketplace-purchase` reasons, which `readGoldLedger` still parses for historical rows. Old `listing-change:` and `purchase:` rate-limit rows expire through the existing cleanup.

Dropping these tables and columns is a separate cleanup. It can ship only after this change is live in production and no build that reads them can be rolled back to. The Consolidator coordinates it as a held follow-up, apart from the held #898.
