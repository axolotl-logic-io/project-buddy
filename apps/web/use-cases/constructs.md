# Constructs

A quest's construct is the character shown with its performances' replies. Each starting point assigns built-in Vellum or Lumen, and the quest keeps a snapshot of it. Built-in detail pages remain read-only.

## use_case_view_character_profile

The user meets the quest's construct.

- **Prerequisites:** the Active Dailies quest.
- **Steps:** open the portrait and name control after the breadcrumbs, before the quest-panel control.
- **Outcome:** a named profile shows the saved character's artwork, temperament, approach to quests and a representative sample line. Own characters without public personality copy show useful generic copy and initials when no art is available. Private instructions and Visual descriptions never appear. The profile uses the quest's snapshot, so source edits do not change it. Opening it makes no model call. Keyboard focus stays inside the profile; Escape and Close return focus to its trigger. The profile fits a 320px phone, scrolls when needed and leaves the composer usable after closing.
