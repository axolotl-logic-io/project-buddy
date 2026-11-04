# Marketplace

The Marketplace, at `/marketplace`, is where users share their own buddies, activities and spells, and sell them to each other for gold. A sale moves the buyer's gold to the seller, which is how a user earns more model use. A free listing, at a price of 0, is how a user simply shares one. The words are defined in the [glossary](../GLOSSARY.md#marketplace).

## Listings

A listing is a published copy of one of the seller's own buddies, activities and spells, of any kind. It holds the prompt's kind, name, prompt and metadata as they were when the seller last published it, a description of at most 500 characters, and a price in whole gold from 0 to 10,000.

- **Publishing:** the seller publishes from the buddy's, activity's or spell's page, under Sell in the Marketplace. An own buddy, activity or spell has at most one listing; selling it again after unlisting lists the same listing again, with its current name, prompt and metadata, and puts it back at the top of the Marketplace, newest first. The form starts with the description and price the listing had.
- **Updating:** edits to the prompt don't reach the listing until the seller updates it from the listing's page, which republishes its current name, prompt and metadata with the new description and price. Buyers keep the copies they have.
- **What can be listed:** only the seller's own work. A built-in buddy, activity or spell cannot be listed, and neither can an own copy whose prompt and metadata still match a built-in definition, such as a copy that was only renamed (`src/prompts/matching-built-in.ts`), or a bought copy. The column `buddies.bought_from` names the listing a copy was bought from, and clones inherit it.
- **Unlisting** stops new sales and hides the listing from everyone but its seller. Buyers keep their copies.
- **Deleting:** deleting the seller's prompt doesn't unlist its listing, since the listing is a copy. The question before deleting a listed prompt says the listing stays up and buyers keep their copies, and links to the listing to unlist it (`listListedSources` in `src/marketplace/listing-store.ts` tells a list page which are listed). Afterwards the listing's page tells the seller and offers only unlisting, and once unlisted it can't be listed again. Deleting the seller's account deletes their listings; buyers keep their copies.
- **Limits:** publishing and updating count together against the seller's limit of 20 an hour, and each try to buy counts against the buyer's limit of 30 an hour, in the `rate_limits` table (`countListingChange` and `countPurchase` in `src/accounts/rate-limits.ts`; the numbers are in `src/marketplace/listing.ts`).
- **Counts:** Your listings shows how many users bought each listing, counting a user who got it again after deleting their copy once, and the gold it earned.

## What other users see

Listings are the one row that every signed-in user may read, through the "listed" predicates in `src/accounts/owner-scope.ts`. The Marketplace and a listing's page show a listing's name, kind, description, seller and price, newest first, filtered by kind. They never show its prompt and metadata, so a spell's instructions, like a buddy's or an activity's prompt, stay hidden until bought; the store never reads them for these pages.

- **Plain text:** descriptions and names are shown as text, never as Markdown or HTML.
- **Seller's privacy:** the seller is shown by their name, or as "A Project Buddy user" for someone with no name. Their email address is never shown.

## Buying

Buying (`buyListing` in `src/marketplace/buy-listing.ts`) is one transaction, at the price the buyer was shown, which the buy form sends. It locks the seller's account and then the listing, so the listing can't be unlisted or its seller deleted meanwhile; saves the buyer's copy, a buddy, activity or spell named as the listing with `bought_from` set; records the purchase; and moves the price to the seller with the gold transfer (`transferGold` in `src/gold/gold-store.ts`), whose ledger keeps a Marketplace sale for the seller and a purchase for the buyer, with the purchase's id. Any refusal rolls back all of it.

- **Price changed:** if the seller changed the price after the page showed it, nothing changes, and the page shows the new price: "The price is now 90 gold."
- **Seller deleted meanwhile:** a purchase and the deletion of the seller's account take their locks in the same order, so one waits for the other. Either the purchase completes, with the buyer's copy and the price paid, and the deletion follows; or the deletion completes first, and the purchase finds no listing and changes nothing. No gold is lost or created either way.
- **Too little gold:** nothing changes, and the page says how much gold the listing needs and how much the buyer has, with a link to selling in the Marketplace.
- **Free listings** move no gold.
- **Limits:** the copy is saved through its kind's store, so it keeps to the kind's limits, such as a spell's name and part lengths. A listing whose copy wouldn't fit can't be bought, and nothing changes.
- **Once per reference:** the transfer names the purchase's id as its reference, so it moves the purchase's gold at most once.
- **Once per copy:** the `purchases` table's unique index allows one purchase with a copy per buyer and listing, so a double submit or a race charges once and opens the copy already bought. Deleting the copy clears its purchase's `copy_id`, so buying again after deleting is allowed, at the listing's price then (free for a free listing). Deleting a copy never refunds, and the question before deleting says so.
- **Own listings:** a seller can't buy their own listing.

## Bought buddies, activities and spells

A bought buddy, activity or spell is an editable copy: the buyer chooses it in chats, tweaks, renames, clones and deletes it, and a bought spell joins their Spellbook. It can't be listed. It has no prepared opening, because a listed definition never has a built-in one's prompt and metadata.

A bought copy's instructions are another user's, and the buyer's model reads them. The tools act with the acting user's access, as in any chat: they reach the buyer's own projects and chats and the team projects the buyer is in, and nothing of the seller's. In a team project chat, a bought buddy or activity guides replies for everyone in the project, as any own one does ([Team projects](team-projects.md)). The listing's page says another user wrote the prompt and what its instructions can reach.

## Out of gold

Every out-of-gold message, in a chat, the new-chat and new-project forms, image generation and a listing's page, ends with a link to the Marketplace: "Earn gold by selling your buddies, activities and spells in the Marketplace" (`src/components/earn-gold-link.tsx`).
