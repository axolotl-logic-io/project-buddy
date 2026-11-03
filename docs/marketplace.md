# Marketplace

The Marketplace, at `/marketplace`, is where users share their own buddies, activities and spells, and sell them to each other for gold. A sale moves the buyer's gold to the seller, which is how a user earns more model use. A free listing, at a price of 0, is how a user simply shares one. The words are defined in the [glossary](../GLOSSARY.md#marketplace).

## Listings

A listing is a published copy of one of the seller's own prompts, of any kind. It holds the prompt's kind, name and parts as they were when the seller last published it, a description of at most 500 characters, and a price in whole gold from 0 to 10,000.

- **Publishing:** the seller publishes from the prompt's own page, under Sell in the Marketplace. An own prompt has at most one listing; selling it again after unlisting lists the same listing again, with the prompt's current name and parts.
- **Updating:** edits to the prompt don't reach the listing until the seller updates it from the listing's page, which republishes the prompt's current name and parts with the new description and price. Buyers keep the copies they have.
- **What can be listed:** only the seller's own work. A built-in prompt can't be listed, and neither can an own prompt whose parts are still a built-in one's, such as a copy that was only renamed (`src/prompts/built-in-parts.ts`), or a bought prompt. The column `buddies.bought_from` names the listing a prompt was bought from, and clones inherit it.
- **Unlisting** stops new sales and hides the listing from everyone but its seller. Buyers keep their copies.
- **Deleting:** deleting the seller's prompt doesn't unlist its listing, since the listing is a copy; the listing's page tells the seller and offers only unlisting. Deleting the seller's account deletes their listings; buyers keep their copies.
- **Limits:** publishing and updating count together against the seller's limit of 20 an hour, in the `rate_limits` table (`countListingChange` in `src/accounts/rate-limits.ts`).

## What other users see

Listings are the one row that every signed-in user may read, through the "listed" predicates in `src/accounts/owner-scope.ts`. The Marketplace and a listing's page show a listing's name, kind, description, seller and price, newest first, filtered by kind. They never show its parts, so a spell's instructions, like a buddy's or an activity's parts, stay hidden until bought; the store never reads them for these pages.

- **Plain text:** descriptions and names are shown as text, never as Markdown or HTML.
- **Seller's privacy:** the seller is shown by their name, or as "A Project Buddy user" for someone with no name. Their email address is never shown.

## Buying

Buying (`buyListing` in `src/marketplace/buy-listing.ts`) is one transaction. It locks the listing, so it can't be unlisted or its seller deleted meanwhile; saves the buyer's copy, an own prompt named as the listing with `bought_from` set; records the purchase; and moves the price to the seller with the gold transfer (`transferGold` in `src/gold/gold-store.ts`), whose ledger keeps a Marketplace sale for the seller and a purchase for the buyer, with the purchase's id. Any refusal rolls back all of it.

- **Too little gold:** nothing changes, and the page says how much gold the listing needs and how much the buyer has, with a link to selling in the Marketplace.
- **Free listings** move no gold.
- **Once per copy:** the `purchases` table's unique index allows one purchase with a copy per buyer and listing, so a double submit or a race charges once and opens the copy already bought. Deleting the copy clears its purchase's `copy_id`, so buying again after deleting is allowed and charges again. Deleting a copy never refunds.
- **Own listings:** a seller can't buy their own listing.

## Bought prompts

A bought prompt is an ordinary own prompt: the buyer chooses it in chats, tweaks, renames, clones and deletes it, and a bought spell joins their Spellbook. It can't be listed. It has no prepared opening, because a listed prompt never has a built-in one's parts.

A bought prompt's instructions are another user's, and the buyer's model reads them. The tools stay scoped to the buyer, so those instructions can't reach anyone else's data. The listing's page says another user wrote the prompt.

## Out of gold

Every out-of-gold message, in a chat, the new-chat and new-project forms, image generation and a listing's page, ends with a link to the Marketplace: "Earn gold by selling your buddies, activities and spells in the Marketplace" (`src/components/earn-gold-link.tsx`).
