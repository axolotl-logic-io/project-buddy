# Settings consolidation

Settings at `/settings` is the single destination for profile name, appearance,
default construct, Batteries purchases and balance, and security actions.
Remove the separate Account workspace and its navigation entry. Keep retained
forms' drafts, feedback, accessible controls and authentication guarantees.

Old `/account` links and checkout returns must reach the corresponding Settings
content, including Batteries and Security sections and payment status. Existing
Stripe purchase rules and session invalidation stay unchanged. Sign out remains
available without JavaScript and when a session expires.

Coordinate removal of Extras and notifications with their owning changes. Keep
compatible database state; this change needs no migration or production action.
