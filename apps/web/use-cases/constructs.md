# Constructs

Premade quests assign built-in Vellum or Lumen. Built-in detail pages remain read-only. Custom construct operations are removed; historical records and conversation snapshots remain intact.

## use_case_view_character_profile

The user meets the construct saved in a conversation.

- **Prerequisites:** the Active Dailies quest's started conversation.
- **Steps:** open the portrait and name control after the breadcrumbs, before the quest-panel control.
- **Outcome:** a named profile shows the saved character's artwork, temperament, approach to quests and a representative sample line. Own characters without public personality copy show useful generic copy and initials when no art is available. Private conversational instructions and Visual descriptions never appear. The profile uses the conversation snapshot, so source edits do not change it. Opening it makes no model call. Keyboard focus stays inside the profile; Escape and Close return focus to its trigger. The profile fits a 320px phone, scrolls when needed and leaves the composer usable after closing.

### Look command

The user reads the construct’s appearance in their conversation.

- **Prerequisites:** a signed-in user and a conversation.
- **Steps:** the user sends `look` or `/look`.
- **Outcome:** the reply shows the Visual description from the conversation’s saved construct, preserving literal placeholders. It shows neither starting context nor Character Sheet instructions. A construct without a description explains that none is available. The command makes no model request.
