# Premade quests

Every quest starts from Dailies, Learn a thing, Make a thing or Do a thing. Each starting point supplies its name, a one-line tagline, a description and starting context, and assigns its construct: Vellum for Dailies and Learn a thing, Lumen for Make a thing and Do a thing. The start form has no construct picker, and submitted construct overrides are ignored. Learn a thing, Make a thing and Do a thing also offer an optional Why field. Dailies starts without asking for Why. No quest is created while browsing or cancelling.

| Starting point | Tagline | Construct |
| --- | --- | --- |
| Dailies | Start your day | Vellum |
| Learn a thing | Practise a skill | Vellum |
| Make a thing | Build a first version | Lumen |
| Do a thing | Reach an outcome | Lumen |

The tiles open the start form on Quests. The form sends starting context. A supplied Why becomes the first user message in the new conversation, followed by the construct’s opening. The opening acknowledges that context. No Goal, Preferences or Journal is created.

The construct's opening is written before the quest is saved. A failed opening or invalid details create nothing.

Each new quest has an empty Tasks. The user and construct add tasks when they agree on them. The first open step is the next step. Dailies resumes the user’s existing quest, conversation and Tasks, regardless of its name, without generating another opening or resetting its work.

Definitions live in `apps/web/src/quests/premade-quests.ts`; the start action is `apps/web/src/app/(workspace)/quests/actions.ts`. See [Tasks](quest-tasks.md).
