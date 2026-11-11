# Quest workspace without adventures (#893)

This is the working contract for [#893](https://github.com/axolotl-logic-io/project-buddy/issues/893). It builds on the domain foundation in [#892](https://github.com/axolotl-logic-io/project-buddy/issues/892) and shares conversation controls with standalone Chat in [#894](https://github.com/axolotl-logic-io/project-buddy/issues/894).

## What the user sees

- `/projects/<id>` opens the quest's continuing conversation and its composer. There is no Adventures section, adventure list, adventure name or New adventure form.
- The quest's next step (the first open Plan step) shows above the conversation.
- Journal, Plan, Progress, Quick Notes, Versions and Members stay one tap away in the quest's section rail. Changing section keeps the composer's draft, which is saved per conversation.
- The conversation header offers the current construct and current activity as two small controls. Switching applies to future replies; the history keeps each reply's construct identity and shows activity changes where they happened.
- New quest creation opens the quest itself, with the chosen construct and activity.
- Home, Today, quest cards, notifications and milestone links resume at `/projects/<id>`, with `#message-<id>` when a specific message is known.
- Quest cards show an unread mark while the quest's conversation has messages the viewer has not read.
- Global navigation has Home, Quests and Chat; there are no adventure lists.

## Ownership

| Area | Owner |
| --- | --- |
| Schema, migrations, conversation storage, replies, check-ins, unread state, cutover | #892 |
| Quest routes, quest workspace, Home, Today, global navigation, resume links | #893 |
| Shared conversation screen and its construct/activity controls | #893 |
| `/chat`, stale `/chats/*` URLs, Activities and Constructs start actions | #894 |

## Interfaces this work consumes from #892

Names follow the foundation PR; until it lands, these are the shapes the UI needs:

- Reading the quest's conversation without side effects: no opening and no battery charge on page load.
- An explicit start that atomically gets or creates the quest's conversation and its opening.
- Changing a conversation's current construct or activity, recorded in its history.
- Per-viewer unread state per quest.

## Shared conversation screen

`ChatScreen` becomes the one conversation screen for a quest and for Chat. It takes the conversation, its messages, the viewer and optional quest context (plan and section links). It has no rename form. Its header holds the construct and activity controls. #894 renders it for `/chat` without quest context.

## Rollout

This PR changes no schema. It ships together with #892 and #894 in one release, after the foundation's cutover sequencing.
