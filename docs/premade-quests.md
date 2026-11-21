# Premade quests

Every quest starts from Dailies, Learn a thing, Make a thing or Do a thing. Each starting point supplies its name, a tagline, a description and starting context, and assigns its construct: Vellum for Dailies and Learn a thing, Lumen for Make a thing and Do a thing. The start form has no construct picker, and submitted construct overrides are ignored. Learn a thing, Make a thing and Do a thing also offer an optional Why field. Dailies starts without asking for Why. No quest is created while browsing or cancelling.

The tiles open the start form on Quests. The form sends starting context. A supplied Why becomes the first user message in the new conversation, followed by the construct’s opening. The opening acknowledges that context.

The construct's opening is written before the quest is saved. A failed opening or invalid details create nothing.

Each new quest has an empty Tasks. The user and construct add tasks when they agree on them. The first open task is the next task. Dailies resumes the user’s existing quest, conversation and Tasks, regardless of its name, without generating another opening or resetting its work.

Definitions live in `apps/web/src/quests/premade-quests.ts`. See [Tasks](quest-tasks.md).
