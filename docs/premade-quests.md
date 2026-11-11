# Premade quests

Every quest starts from one of four premade starting points: **Dailies**, **Learn a thing**, **Make a thing** and **Do a thing**. They are offered under Start a quest on Quests, below Continue (`apps/web/src/components/quest-start.tsx`) and in Chat's Turn Chat into a quest, the only two ways to create a quest, which use the same component. There is no blank start and no other catalog. The definitions are in `apps/web/src/projects/premade-quests.ts`.

| Starting point | Activity | What it guides |
| --- | --- | --- |
| Dailies | Dailies (`dailies`) | Starting the day: what matters today and one manageable thing to do. One ongoing quest per user. |
| Learn a thing | Learn a thing (`learn-a-thing`) | What the user wants to learn and where they start from, then small practice steps. |
| Make a thing | Find something to make | Finding something to make and a small first version. |
| Do a thing | Break Down a Project | Any other outcome: what done looks like, then small steps. |

The guidance lives in each activity's instructions and opening, so it carries into every reply of the quest's one conversation. Dailies and Learn a thing are built-in activities of their own; Make and Do reuse the existing ones.

## Starting

The starting points are tiles, two by two in a narrow space, such as a phone or Chat's dialog, and four across where they fit. Each shows an icon, its name and its one-line `tagline`; the whole tile is one target, named by the starting point and described by the tagline. Choosing one shows its details in place of the tiles, already filled in: its longer `description`, a name, a starting Journal and the construct, which defaults to the user's New quest construct, or Vellum. Focus moves to the details' heading. Back shows the tiles again. A page that knows more fills it in (a preset): Chat's Turn Chat into a quest puts the Chat's summary in the Journal and opens Do a thing at once. Dailies isn't offered with a summary, since it is the user's one ongoing quest.

Start quest calls `startQuestAction` (`apps/web/src/app/(workspace)/projects/actions.ts`), the one quest start. It checks the name and construct for the acting user, takes the activity from the starting point (the form sends none, and an older form's `activityId` is ignored) and starts an ordinary quest with its conversation and opening (`startProject`), then opens the quest. Invalid details, no batteries or Claude being unavailable save nothing, and the details keep every edit. Looking, choosing and going back make nothing and spend nothing.

The starting Journal becomes the user's first Journal version. Its possible milestones are plans, not progress, and it holds no next step: the plan keeps the steps the user agrees to. Learn, Make and Do can be started again for other goals; each is a separate quest with no link to its starting point.

## Dailies

Dailies is identified by `projects.dailies`, not by its name, which the user can change. Starting Dailies when the user already has one opens it, changing and spending nothing (`startDailies`), and concurrent starts reach the same quest. Once it exists, its tile is a link that opens it.

In the Dailies quest, Start the day sits above the composer. It sends "Let's start the day." as the user's own message through the ordinary composer path, so it is charged, authored and kept like any other message, and leaves the draft in the composer. There is no schedule, no daily state and no reset: the conversation, Journal, Plan and status carry on. Opening the quest sends nothing.
