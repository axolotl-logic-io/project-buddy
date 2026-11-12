# Premade quests

Every quest starts from Dailies, Learn a thing, Make a thing or Do a thing. Each starting point supplies its name and activity. The user chooses a construct and can add Why before starting. No quest is created and no batteries are spent while browsing or cancelling.

| Starting point | Activity |
| --- | --- |
| Dailies | Dailies |
| Learn a thing | Learn a thing |
| Make a thing | Find something to make |
| Do a thing | Break Down a Project |

The tiles open the same start form on Quests and in Chat. The form sends starting context, not a Journal. A supplied Why or approved Chat summary becomes the first user message in the new conversation, followed by the construct’s opening. The opening acknowledges that context. The original Chat’s messages remain in Chat. No Goal, Preferences or Journal is created.

Without supplied context, an unchanged built-in construct and activity use their prepared opening. Other starts generate their opening before saving the quest. A failed opening, invalid details or insufficient batteries create nothing.

Each new quest has an empty Plan. The user and construct add tasks when they agree on them. The first open step is the next step. Dailies resumes the user’s existing quest, conversation and Plan, regardless of its name, without generating another opening or resetting its work.

Definitions live in `apps/web/src/quests/premade-quests.ts`; the start action is `apps/web/src/app/(workspace)/quests/actions.ts`. See [Plan](quest-plan.md).
