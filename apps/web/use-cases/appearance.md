# Appearance

The conventions for these cases are in [the index](README.md#conventions).

## use_case_choose_theme

The user picks a fixed textured appearance for this browser.

- **Prerequisites:** none.
- **Steps:**
  - The user opens the site panel from the button at the left end of the breadcrumb row on any page and finds Theme, or opens Appearance in Settings.
  - They choose the Ivory Vellum, Soot & Brass, or Espresso Leather texture swatch by pointer, touch, or keyboard. The complete palette and texture apply at once, without reloading.
  - They reload the page, return in the same browser, sign out, or open the sign-in page.
- **Outcome:** the chosen swatch has an accessible name, a solid selection outline outside the texture, and a separate dashed keyboard focus outline. Swatches pair their background texture with a decorative mark that adds nothing to the accessible name. Named tooltips appear on hover, focus, or selection by touch; Escape dismisses the tooltip without changing focus or selection. The site panel and Settings offer the same three swatches, with no Light, Dark, or System control. Ivory Vellum uses the approved L1 parchment and light palette; Soot & Brass uses burgundy leather, warm charcoal surfaces, ivory text, and restrained brass; Espresso Leather uses the approved D1 leather with sepia and gold. The selection belongs to this browser and appears before the first paint, including failed pages. Operating system changes never change it. New visitors start with Ivory Vellum. Older Light and System choices use Ivory Vellum; older Dark choices use Espresso Leather. Unknown values use Ivory Vellum. The self-hosted fonts start loading with the page. The site and page headers share the same typography across themes. All three palettes keep readable headings, controls, syntax colors, and focus rings. Their fixed backgrounds stay aligned behind long pages and the pinned conversation composer. The three swatches fit a 320 px phone with 44 px touch targets.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): carry on in the chosen appearance.

## use_case_use_on_phone

The user uses the site on their phone, in any theme, as the user does on their computer.

- **Prerequisites:** none.
- **Steps:**
  - The user opens the site on a phone held upright, as narrow as 320 px.
  - The user signs in, and goes through their quests, a quest, its Tasks, its conversation, Profile and Settings, by touch.
- **Outcome:** every page is usable at 320 px with touch, in every theme. No page scrolls sideways. Every link, button and field the user can touch is at least 24 px each way, except a link inside a sentence. The header's bar, a HUD with its independent ink and gold palette on every page including Quests, takes one row at every width: the brand, then the ring of their progress toward the next circle. The site panel's expand tab is built into the left edge of the breadcrumb row. On quest pages, the quest sidebar's expand tab is built into the right edge. The tabs are at least 44 px wide, span the row's full height, and use larger icons on their panel's surface with thin dividers. Both buttons stay pinned with the breadcrumbs. Each panel opens from that row, with its close button at the same position as its expand button. On their phone the brand is its compass medallion alone, still named for the site. Under the bar, the trail band updates with navigation from the site panel and browser history. Quests, Spellbook, Graveyard, Profile and Settings are top-level destinations with no parent breadcrumb. Detail trails start at their own collection. The trail band leads into the page's heading, and long names leave nothing scrolling sideways. Quests remains in the site panel, without a header shortcut. On a phone the site panel slides in from the left edge, starting at the breadcrumb row, and fits the screen at 320 px, with every link 44 px tall. The signed-in site panel's links come with the page's first HTML, not after it.
- **Next:**
  - [`use_case_choose_theme`](#use_case_choose_theme): pick a look that reads well on their phone.
