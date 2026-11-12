# Appearance

The conventions for these cases are in [the index](README.md#conventions).

## use_case_choose_theme

The user picks a light or dark mode for the site's parchment theme, or follows the mode their computer uses.

- **Prerequisites:** none.
- **Steps:**
  - The user opens the menu at the top of any page.
  - They choose Dark. The page takes on dark parchment colours at once, without reloading.
  - They reload the page, or return in the same browser.
  - They sign out, or open the sign-in page.
  - They choose System.
- **Outcome:** every page uses the same parchment theme, with serif headings, sepia ink, gold accents and a subtle repeating paper texture that stays seamless on long pages and behind pinned adventure controls. The menu offers Light, Dark and System modes without a theme picker. The chosen mode appears from the first paint, on a page that failed to load too, and belongs to this browser. System follows the computer's setting and changes with it. New visitors start in Light mode. A saved choice from a retired theme uses the parchment theme and keeps its mode. The theme's self-hosted typefaces start loading with the page. Cards and controls follow the active palette, including live System changes and returning from another page. Headings, focus rings and Journal checkboxes remain readable, and the site's name fits on one line on a wide screen.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): carry on in the chosen mode.

## use_case_use_on_phone

The user uses the site on her phone, in any theme, as she does on her computer.

- **Prerequisites:** none.
- **Steps:**
  - She opens the site on a phone held upright, as narrow as 320 px.
  - She signs in, and goes through her quests, a quest, its Journal, a new adventure, an adventure and Settings, by touch.
- **Outcome:** every page is usable at 320 px with touch, in every theme. No page scrolls sideways. Every link, button and field she can touch is at least 24 px each way, except a link inside a sentence. The header's bar, a HUD with its independent ink and gold palette on every page including Quests, takes one row at every width: the brand and the menu's button, which stays 44 px tall. On her phone the brand is its compass medallion alone, still named for the site. Under the bar, the trail band leads into the page's heading, and long names leave nothing scrolling sideways. Quests and Chat remain in the menu, without header shortcuts. The menu slides in from the right edge and fits the screen at 320 px, with every link 44 px tall. The signed-in menu's links come with the page's first HTML, not after it.
- **Next:**
  - [`use_case_choose_theme`](#use_case_choose_theme): pick a look that reads well on her phone.
