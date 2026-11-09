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
- **Outcome:** every page uses the same parchment theme, with serif headings, sepia ink, gold accents and a subtle repeating paper texture that stays seamless on long pages and behind pinned adventure controls. The menu offers Light, Dark and System modes without a theme picker. The chosen mode appears from the first paint and belongs to this browser. System follows the computer's setting and changes with it. New visitors start in Light mode. A saved choice from a retired theme uses the parchment theme and keeps its mode. The theme's self-hosted typefaces start loading with the page. Home's map artwork, destination icons and labels, cards and controls follow the active palette, including live System changes and returning from another page. The responsive destination tiles preserve their layout at 320 px. Headings, focus rings and Journal checkboxes remain readable, and the site's name fits on one line on a phone and a wide screen.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): carry on in the chosen mode.

## use_case_use_on_phone

The user uses the site on her phone, in any theme, as she does on her computer.

- **Prerequisites:** none.
- **Steps:**
  - She opens the site on a phone held upright, as narrow as 320 px.
  - She signs in, and goes through her quests, a quest, its Journal, a new adventure, an adventure and Settings, by touch.
- **Outcome:** every page is usable at 320 px with touch, in every theme. No page scrolls sideways. Every link, button and field she can touch is at least 24 px each way, except a link inside a sentence. The header, a HUD with its independent ink and gold palette on every page including Home, takes one row at every width: the site's name and the menu's button, which stays 44 px tall. Quests and Adventures remain in the menu and on Home, without shortcuts beside Quick Note. At narrow widths, Quick Note uses its icon with the same accessible name and a 44 px target. The menu slides in from the right edge and fits the screen at 320 px, with every link 44 px tall. The signed-in menu's links come with the page's first HTML, not after it.
- **Next:**
  - [`use_case_choose_theme`](#use_case_choose_theme): pick a look that reads well on her phone.

## use_case_hide_extras

The user hides the parts of the site she can do without, such as the construct's working notes, and gets them back when she wants them.

- **Prerequisites:** [`use_case_see_working_note`](chats.md#use_case_see_working_note), so an adventure holds a working note.
- **Steps:**
  - She opens Settings from the top of any page.
  - She switches off working notes. The switch saves at once; there is nothing to submit.
  - She opens the adventure, then reloads it.
  - She switches working notes back on, and opens the adventure again.
  - Another day, in a browser that has never visited, she signs in.
- **Outcome:** with working notes off, the adventure shows the construct's answer and its search, but no working note, from its first appearance and after the reload. Switched back on, the note shows again where it was written; hiding it deleted nothing. Settings lists each extra with a switch: working notes, Journal changes, the search and tool lines, the pinned adventure header, the adventure names in a quest's list (hidden, each adventure reads as an unnamed one, by its construct's name), the theme's page decorations, and the battery balance on her account page; each hides only its own part. Whichever she switches off, a page that showed that part shows less of it, and an adventure still shows the manual it cites and the box she writes in. With the pinned adventure header off, the header scrolls away with the adventure and leaves nothing behind over the conversation. A new visitor sees every extra, and every switch on. Settings fits a phone's screen with no sideways scrolling, in every theme, and each switch, with its words, is easy to tap. The choice is saved to her account and follows her to every browser she signs in to.
- **Next:**
  - [`use_case_choose_theme`](#use_case_choose_theme): change how the rest of the site looks.
  - [`use_case_settings_follow_user`](accounts.md#use_case_settings_follow_user): sign in on another browser and find the same extras hidden.
