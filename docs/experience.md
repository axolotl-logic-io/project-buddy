# Experience

Each user gains points in [abilities](../GLOSSARY.md#ability) by doing things in their quests. The abilities' weighted points add up to the user's [experience](../GLOSSARY.md#experience), which sets their [circle](../GLOSSARY.md#circle). Experience counts only things done: never open tasks, days or streaks. The use cases are [`use_case_experience`](../apps/web/use-cases/experience.md#use_case_experience), [`use_case_experience_command`](../apps/web/use-cases/experience.md#use_case_experience_command) and [`use_case_experience_ring`](../apps/web/use-cases/experience.md#use_case_experience_ring).

## Abilities and circles

`src/experience/experience.ts` holds the rules. Adding a task, adding an idea and saving a Quick Note are each worth one point. Completing a task is worth three, one of each of those, and completing a quest is worth nine, three completed tasks. Each circle needs 5 more experience than the one before it did. Circles start new titles at fixed circle numbers, from Initiate to Transcendent.

## Gaining and losing points

Points live in the `ability_points` table, one row per point, with the user, the ability, the quest and the source that gave it. A point stays when its quest is deleted and goes with its user. Each store saves the points with what gave them, in the same transaction:

- **Tasks:** every saved change compares the tasks before and after it. The acting user gains a point for each task it added and each open task it completed, whether they made the change or the construct did in their conversation. A task it reopened loses the newest point its completion gave, whoever gained it. A removed task keeps its points, and a restored one gains none again. Undo is a change like any other: undoing a completion reopens the task, and so takes the point back.
- **Start Day** reopens a Dailies quest's recurring tasks without taking points back, so completing them again the next day gains more. Undo Start Day gains none.
- **Ideas:** adding an idea gains a point. Moving an idea into Tasks adds a task, which gains its own point.
- **Quick Notes:** saving one gains a point.
- **Quest status:** completing a quest gains the user who completed it, or approved the construct's request, a point. Changing a Completed quest to Active or Abandoned takes it back.

## Profile

Profile (`/profile`) opens on the **Experience** card: the user's circle in a ring, their name with Rename, their title, a bar toward the next circle, their experience, how much more the next circle needs and the next title to reach. A separate **Days signed in** card sits between Experience and Abilities ([Profile visiting days](profile.md)). It grants no points. Below it, **Abilities** shows each ability's points and the experience they're worth, the most experience first; an ability with no points says what its first point is worth. Reading Profile makes no model call.

## The header's ring

For a signed-in user, the site header shows their circle's number inside a ring, at the right end of the bar. The ring fills, like the timer's, from the circle's start to the next circle's, and links to Profile's Experience card; its accessible name gives the circle, its title and the experience still needed. Every page's header reads the experience once, with the session. Actions that gain or lose points refresh the page, and so the ring, and a finished reply in the conversation refreshes it too.

When a refreshed total increases, a message such as "+3 experience" briefly slides into view below the header. With reduced motion on, the message appears still. A screen reader can announce the gain without moving focus. Opening the site establishes the starting total for that account.

## The exp command

In a quest's conversation, `exp`, or `/exp` from the composer's command list, shows the same in the chat: the construct answers it with the sender's circle and title, their experience, how much more the next circle needs, and their points in each ability. The answer is read as the construct replies, and the [local command engine](local-constructs.md) sends it. The command changes nothing, so an active spell never saves it to Tasks or Ideas. In a shared conversation, the answer shows the experience of whoever sent it.
