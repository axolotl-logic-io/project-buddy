# Quests landing page

Quests is the signed-in landing destination. Root navigation, the site name,
and sign-in without an explicit return destination lead to `/projects`.
Existing `/home` links redirect there. Signed-out visitors still sign in;
authorized explicit return destinations remain intact.

Remove the Home atlas, its duplicate quest summary and destination panels,
and artwork, styles, copy and tests used only by that page. Keep shared icons
and construct artwork. Existing quests, all four premade choices, Journal,
Plan, Retirement and the Progress timeline remain available. Navigation does
not request a construct reply or spend batteries.

This change needs no schema migration or production operation. Coordinate
shared navigation with the other simplification changes before review.
