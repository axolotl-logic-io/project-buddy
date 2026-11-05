# Retirement

Retirement puts aside the user's own constructs, activities, and spells without losing their definitions. The [glossary](../GLOSSARY.md#retire-retirement-restore-delete-forever) defines the words. [Issue #728](https://github.com/axolotl-logic-io/project-buddy/issues/728) records the approved behavior; the [interactive mockups](mockups/retirement-manager.html) record the design direction.

## Retire

Each own card on Constructs, Activities, and Spellbook has Retire beside Tweak and Clone. An own definition's editing page also has Retire. Built-in definitions cannot be retired.

Retire removes the definition from active collections, new-adventure choices, model activity choices, and future spell casts. Stale edit, clone, and start requests cannot use it. Existing adventure snapshots and past casts retain their instructions. A completion message links the user to Retirement through the collection's Retirement link.

If the preferred interview construct is retired, new quests use Vellum. Restoring it makes the saved preference available again. Existing adventures keep their construct snapshots.

## Manage retired definitions

The site menu and all three collection pages link to `/retirement`. The page lists the acting user's retired definitions together, most recently retired first, with a retirement date and kind. Name search and kind filters narrow the list. It distinguishes an empty collection from a search with no matches.

View opens `/retirement/ID`, with the saved instructions as read-only text. Restore makes the same definition available immediately, keeping its id, instructions, creation date, source, and bought-copy ownership. Nothing expires automatically.

Delete forever asks for confirmation naming the definition. Keep retired cancels. Confirming permanently removes the original, while existing adventure snapshots and past casts remain. A deletion request refuses an active definition, including one restored after the confirmation opened. Unknown and repeated requests change nothing. Originals permanently deleted before this feature cannot be recovered.

Only the definition's owner can read or change it. Team quest membership gives no access to another user's originals or Retirement, even when an adventure shares their snapshots.

## Marketplace

Listings are independent published copies. Retirement and permanent deletion do not unlist them; the user unlists them in the Marketplace. A retired source cannot be updated or listed again until restored.

A retired bought copy remains held. Opening it from a listing leads to its Retirement view, and attempting to buy it again does not charge gold. Restoring it costs nothing. Permanent deletion gives no refund and allows another buy at the listing's current price and instructions.

## Storage and release

The shared `buddies` table has a nullable `retired_at` column. Normal definition reads and edits require it to be null. Retirement reads and permanent-deletion actions require it to be set. Retiring twice preserves the first date; restoring clears it. Ownership predicates scope every query.

Migration `0039_spicy_cassandra_nova` is additive. Existing rows stay active and old builds can still read and write the table during deployment. An old build does not understand retirement: rolling back the code can expose retired definitions in active lists until a retirement-aware build is restored. The migration itself is not reverted by a code rollback.
