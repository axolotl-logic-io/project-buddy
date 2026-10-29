# Appearance

The conventions for these cases are in [the index](README.md#conventions).

## use_case_choose_theme

The user picks how the site looks: one of its themes, and a light or dark mode, or the mode her computer uses.

- **Prerequisites:** none.
- **Steps:**
  - She opens the menu at the top of any page.
  - She chooses a theme and the Dark mode. The page takes on the theme and its dark colours at once, without reloading.
  - She reloads the page, or comes back to the site another day in the same browser.
  - She signs out, or opens the sign-in page.
  - She chooses System.
- **Outcome:** every page, signed in or not, the sign-in page included, shows her chosen theme and mode from its very first appearance, with no flash of the default look. The site's name fits on one line, wide and on a phone. Each theme keeps its headings in order — a long project name stays beside 'Project memory', and headings inside a reply stay below the page's — and shows its focus ring and the memory's checkboxes in its own colours. Under System, the site is light or dark as her computer is set, and follows it when the setting changes. Before she chooses anything, the site shows its default theme, Gravy Falls, under System. The choice belongs to this browser. Her chosen theme's typefaces start loading with the page, and no other theme's do until she points at or focuses that theme in the menu.
- **Variations:**
  - She points at, or moves the keyboard to, another theme in the open menu: its typefaces start loading, once each, so choosing it shows them without a flash of the fallback font.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): carry on in the look she likes.

## use_case_use_on_phone

The user uses the site on her phone, in any theme, as she does on her computer.

- **Prerequisites:** none.
- **Steps:**
  - She opens the site on a phone held upright, as narrow as 320 px.
  - She signs in, and goes through her projects, a project, its memory, a new chat, a chat and Settings, by touch.
- **Outcome:** every page is usable at 320 px with touch, in every theme. No page scrolls sideways. Every link, button and field she can touch is at least 24 px each way, except a link inside a sentence. The header takes one row at every width: the site's name and the menu's button, which stays 44 px tall. The menu slides in from the right edge and fits the screen at 320 px, with every link 44 px tall. The signed-in menu's links come with the page's first HTML, not after it.
- **Next:**
  - [`use_case_choose_theme`](#use_case_choose_theme): pick a look that reads well on her phone.

## use_case_hide_extras

The user hides the parts of the site she can do without, such as the buddy's working notes, and gets them back when she wants them.

- **Prerequisites:** [`use_case_see_working_note`](chats.md#use_case_see_working_note), so a chat holds a working note.
- **Steps:**
  - She opens Settings from the top of any page.
  - She switches off working notes. The switch saves at once; there is nothing to submit.
  - She opens the chat, then reloads it.
  - She switches working notes back on, and opens the chat again.
  - Another day, in a browser that has never visited, she signs in.
- **Outcome:** with working notes off, the chat shows the buddy's answer and its search, but no working note, from its first appearance and after the reload. Switched back on, the note shows again where it was written; hiding it deleted nothing. Settings lists each extra with a switch: working notes, memory changes, the search and tool lines, the pinned chat header, the chat names in a project's list (hidden, each chat reads as an unnamed one, by its buddy's name), the theme's page decorations, the usage meter on her account page, and the buddy prompt mechanics (the parts of a buddy's prompt the app relies on, on its page), which starts off; each hides only its own part. Whichever she switches off, a page that showed that part shows less of it, and a chat still shows the manual it cites and the box she writes in. With the pinned chat header off, the header scrolls away with the chat and leaves nothing behind over the conversation. A new visitor sees every extra but the buddy prompt mechanics, and every switch on but that one. Settings fits a phone's screen with no sideways scrolling, in every theme, and each switch, with its words, is easy to tap. The choice is saved to her account and follows her to every browser she signs in to.
- **Variations:**
  - Settings also has two independent default-on planning skills. Unlike display-only extras, these omit their own instructions from future replies and openings while retaining saved text; see [`use_case_switch_planning_skills`](buddies.md#use_case_switch_planning_skills).
- **Next:**
  - [`use_case_choose_theme`](#use_case_choose_theme): change how the rest of the site looks.
  - [`use_case_settings_follow_user`](accounts.md#use_case_settings_follow_user): sign in on another browser and find the same extras hidden.
