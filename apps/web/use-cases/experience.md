# Experience

## use_case_experience

- **Intent:** See what they have done grow into experience and circles.
- **Prerequisites:** a signed-in user with an Active quest open to them.
- **Steps:**
  - They add a task, an idea and a Quick Note, complete the task, and complete the quest.
  - They open Profile from the site menu and read its Experience section.
  - They reopen the task, and later the quest.
- **Outcome:** each ability shows one point for each thing they did: Adding tasks, Ideating, Quick Notes, Completing tasks and Completing quests. Their experience is the sum of those points, weighted 1 for each add, 3 for a completed task and 9 for a completed quest. The section shows their circle and its title, starting at Circle 1 · Initiate, and how much more experience the next circle needs. Reopening the task or the quest takes back its completion point, whoever reopens it. Reset Day reopens a Dailies quest's tasks without taking points back. Removing a task or idea keeps its points. Reading the section makes no model request.

## use_case_experience_command

- **Intent:** See their experience without leaving the quest's conversation.
- **Prerequisites:** a signed-in user in a quest's conversation, with or without an active spell.
- **Steps:**
  - They type `exp`, or `/exp` from the composer's command list, and send it.
- **Outcome:** the construct answers in the conversation with their circle and its title, their experience and how much more the next circle needs, and their points in each ability, read as it replies. The command changes nothing: an active spell doesn't save it to Tasks or Ideas. In a shared conversation, the answer shows the experience of whoever sent it. It makes no model request.

## use_case_experience_ring

- **Intent:** See at a glance how near the next circle they are, on any page.
- **Prerequisites:** a signed-in user.
- **Steps:**
  - They look at the site header, beside the menu's button.
  - They follow the ring.
- **Outcome:** a ring holding their circle's number fills as their experience nears the next circle, empty at the circle's start. Its name says their circle and its title and how much more experience the next circle needs. Following it opens Profile at its Experience section. It updates as the page refreshes after they do something. It shares the header's one row on a phone and never scrolls the page sideways.
