# Marketplace and orb removal (#902)

This page records what issue #902 removes. It builds on the quest and Chat UI from #896. Batteries, formerly called gold, are not orbs and stay unchanged.

## Removal plan

- **Marketplace pages:** delete `app/(workspace)/marketplace/` (browse, listing page, buy form, sell section, listing terms form, actions) and its copy module `ui/copy/marketplace.ts`. Remove the menu link, breadcrumbs and Library mentions.
- **Marketplace runtime:** delete `src/marketplace/` (listing store, buy, cutover, listing rules) and `src/orbs/` (orb balance and transfer). Remove the listing and orb predicates from `accounts/owner-scope.ts`, the Marketplace rate limits from `accounts/rate-limits.ts`, and the orb grant at sign-up.
- **Seller controls:** remove "Sell in the Marketplace" and sale state from construct, activity and spell pages and their retire forms.
- **Bought copies:** keep every existing bought copy as an ordinary private definition the owner can use, edit, clone, retire and restore. Remove the branches that refuse to sell them.
- **Docs and tests:** delete `use-cases/marketplace.md`, `docs/marketplace.md` and Marketplace and orb tests. Update the glossary, `docs/README.md`, the Library and the remaining tests so they keep their assertions about private definitions and batteries.

## Retained compatibility

The live build reads and writes the `listings`, `purchases`, `orb_balances`, `orb_ledger` and `marketplace_cutover` tables, so this change keeps them and any columns that point at them, unread. No migration ships here. Dropping them is a separate, held cleanup after this change is live, coordinated with the Consolidator.
