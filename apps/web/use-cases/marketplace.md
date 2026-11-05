# Marketplace

The conventions for these cases are in [the index](README.md#conventions). In the Marketplace, users share their own constructs, activities and spells and sell them to each other for gold.

## use_case_sell_in_marketplace

The user lists one of their own constructs, activities or spells in the Marketplace, free or for gold.

- **Prerequisites:** [`use_case_edit_construct`](constructs.md#use_case_edit_construct), or the same for one of their activities or spells.
- **Steps:**
  - They open the page of one of their own constructs, activities or spells whose prompt or metadata they have changed.
  - Under Sell in the Marketplace, they write a description and a price in whole gold, 0 for free, and sell it.
- **Outcome:** the site opens the new listing's page, which shows its name, kind, description and price. The prompt's page now says it is listed and links to the listing. A description over 500 characters, or a price that isn't a whole number from 0 to 10,000, lists nothing and says what to fix. A prompt whose prompt and metadata still match a built-in one's, or one they bought or cloned from a bought one, offers no form and says why it can't be sold. Publishing and updating listings more than 20 times an hour is refused until later.
- **Next:**
  - `use_case_manage_listings`: see how the listing does, update it or unlist it.

## use_case_browse_marketplace

The user looks over what other users have listed.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They go to the Marketplace, by the menu's Marketplace link.
  - They show only constructs, only activities or only spells, or every kind.
- **Outcome:** the listed listings are shown newest first, each with its name, kind, description, seller and price ("Free" or "25 gold"). The seller is named by their name, or as "A Project Buddy user" when they have none, never by email address. No listing shows its prompt and metadata. A description shows as the text it is, never as Markdown or HTML. Unlisted listings aren't shown. Each listing's name opens its page, which says another user wrote it.
- **Next:**
  - `use_case_buy_listing`: get one.

## use_case_buy_listing

The user gets their own copy of another user's listing, paying its price in gold, or nothing for a free one.

- **Prerequisites:** `use_case_browse_marketplace`.
- **Steps:**
  - On a listing's page, they buy it for its price, or get it for free.
- **Outcome:** their gold goes down by the price and the seller's goes up by it, and the site opens their own copy, named as the listing, where they see its prompt and metadata. The copy is their own editable construct, activity or spell: they can choose it in adventures, tweak, rename, clone and delete it, and it can't be sold. With less gold than the price, nothing changes and the page says how much they need and how much they have, with a link to earning gold in the Marketplace. If the seller changed the price after the page showed it, nothing changes and the page says the price now. Trying to buy more than 30 times an hour is refused until later. Buying twice at once charges once. Once they have a copy, the listing's page links to it instead of offering it again; after they delete it, buying again charges again. They can't buy their own listing.
- **Next:**
  - [`use_case_customize_construct`](constructs.md#use_case_customize_construct): make their copy their own.

## use_case_manage_listings

The seller sees how their listings do, updates one, and unlists one.

- **Prerequisites:** `use_case_sell_in_marketplace`.
- **Steps:**
  - On the Marketplace page, under Your listings, they see each of their listings.
  - They change the prompt the listing came from, then update the listing from its page, with a new description or price.
  - They unlist a listing.
- **Outcome:** each of their listings shows whether it is listed, how many users bought it, counting one who got it again once, and the gold it earned. Listing one again after unlisting it puts it back at the top of the Marketplace, with its last description and price filled in to sell. Until they update a listing, changes to its prompt don't reach it; updating republishes the prompt's current name, prompt and metadata, with the new terms. An unlisted listing can't be bought and isn't shown to anyone else; its buyers keep their copies. Deleting the prompt doesn't unlist the listing: its page tells them, and offers only unlisting. Another user can't update or unlist their listings.
- **Next:**
  - `use_case_browse_marketplace`: see their listing as others do.
