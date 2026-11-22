# Experience

## use_case_experience

- **Intent:** See what they have done grow into experience and circles.
- **Prerequisites:** a signed-in user with an Active quest open to them.
- **Steps:**
  - They add a murmling to a space by hand, make a conjuration, check off a task and complete the quest.
  - They open Profile from the site panel and read its Experience card and Events.
  - They uncheck the task, and later restore the quest.
- **Outcome:** Events counts each thing they did: Adding, for each murmling added by hand, by a conjuration or by Quick Note; Checking off, for each task checked off; and Completing quests. Their experience is the weighted sum of their events: 1 for each murmling added, 3 for each task checked off and 9 for each quest completed. The card shows their circle in a ring that fills toward the next circle, its title, starting at Circle 1 · Initiate, a bar toward the next circle, how much more experience that circle needs and the next title to reach. Events lists the kind that earned the most experience first, marked "Most experience", each with the experience its events are worth; a kind with none says what its first event is worth. On a phone the card stacks and every kind takes the page's width. Unchecking the task or restoring the quest takes back its event from whoever earned it, whoever does it. Start Day unchecks a Dailies quest's recurring tasks without taking events back, and Undo Start Day earns none. Removing a murmling keeps its event. Each event belongs to the user who did it, in a shared quest too. Reading Profile makes no model request.

## use_case_experience_ring

- **Intent:** See at a glance how near the next circle they are, on any page.
- **Prerequisites:** a signed-in user.
- **Steps:**
  - They look at the right end of the site header's bar.
  - They check off a task and see the experience it earned.
  - They follow the ring.
- **Outcome:** a ring holding their circle's number fills as their experience nears the next circle, empty at the circle's start. Its name says their circle and its title and how much more experience the next circle needs. Following it opens Profile at its Experience card. It updates as the page refreshes after they do something. An increase briefly shows the amount earned below the header, such as "+3 experience". The message slides into place, or appears still when reduced motion is on. The ring shares the header's one row on a phone and never scrolls the page sideways.
