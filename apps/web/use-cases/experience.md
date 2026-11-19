# Experience

## use_case_experience

- **Intent:** See what they have done grow into experience and circles.
- **Prerequisites:** a signed-in user with an Active quest open to them.
- **Steps:**
  - They add a task, an idea and a Quick Note, complete the task, and complete the quest.
  - They open Profile from the site panel and read its Experience card and Abilities.
  - They reopen the task, and later the quest.
- **Outcome:** each ability shows one point for each thing they did: Adding tasks, Ideating, Quick Notes, Completing tasks and Completing quests. Their experience is the sum of those points, weighted 1 for each add, 3 for a completed task and 9 for a completed quest. The card shows their circle in a ring that fills toward the next circle, its title, starting at Circle 1 · Initiate, a bar toward the next circle, how much more experience that circle needs and the next title to reach. Abilities lists the ability that earned the most experience first, marked "Most experience", each with the experience its points are worth; an ability with no points says what its first point is worth. On a phone the card stacks and every ability takes the page's width. Reopening the task or the quest takes back its completion point, whoever reopens it. Start Day reopens a Dailies quest's recurring tasks without taking points back, and Undo Start Day gains none. Removing a task or idea keeps its points. Reading Profile makes no model request.

## use_case_experience_command

- **Intent:** See their experience without leaving the quest's conversation.
- **Prerequisites:** a signed-in user in a quest's conversation, with an active spell.
- **Steps:**
  - They type `exp`, or `/exp`, and send it.
- **Outcome:** the construct answers in the conversation with their circle and its title, their experience and how much more the next circle needs, and their points in each ability, read as it replies. The command changes nothing: an active spell doesn't save it to Tasks or Ideas. In a shared conversation, the answer shows the experience of whoever sent it. It makes no model request.

## use_case_experience_ring

- **Intent:** See at a glance how near the next circle they are, on any page.
- **Prerequisites:** a signed-in user.
- **Steps:**
  - They look at the right end of the site header's bar.
  - They complete a task and see the experience it earned.
  - They follow the ring.
- **Outcome:** a ring holding their circle's number fills as their experience nears the next circle, empty at the circle's start. Its name says their circle and its title and how much more experience the next circle needs. Following it opens Profile at its Experience card. It updates as the page refreshes after they do something. An increase briefly shows the amount earned below the header, such as "+3 experience". The message slides into place, or appears still when reduced motion is on. The ring shares the header's one row on a phone and never scrolls the page sideways.
