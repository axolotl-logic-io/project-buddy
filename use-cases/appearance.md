# Appearance

The conventions for these cases are in [the index](README.md#conventions).

## use_case_choose_theme

The user picks how the site looks: one of its themes, and a light or dark mode, or the mode her computer uses.

- **Prerequisites:** none.
- **Steps:**
  - She opens the theme picker at the top of any page.
  - She chooses a theme and the Dark mode. The page takes on the theme and its dark colours at once, without reloading.
  - She reloads the page, or comes back to the site another day in the same browser.
  - She signs out, or opens the passphrase page.
  - She chooses System.
- **Outcome:** every page, signed in or not, the passphrase page included, shows her chosen theme and mode from its very first appearance, with no flash of the default look. Each theme keeps its headings in order — a long project name stays beside 'Project memory', and headings inside a reply stay below the page's — and shows its focus ring and the memory's checkboxes in its own colours. Under System, the site is light or dark as her computer is set, and follows it when the setting changes. Before she chooses anything, the site shows its default theme, Gravy Falls, under System. The choice belongs to this browser.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): carry on in the look she likes.
