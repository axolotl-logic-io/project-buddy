# Experience

## use_case_experience

- **Intent:** See what they have done grow into experience and circles.
- **Prerequisites:** a signed-in user with an Active quest open to them.
- **Steps:**
  - They add a list item to a list by hand, send a message, check off a task and complete the quest.
  - They open Profile from the site panel and read its Experience card and Events.
  - They uncheck the task, and later restore the quest.
- **Outcome:** Events counts each thing they did: Adding, for each list item added by hand, by a message or by Quick Add; Checking off, for each task checked off; and Completing quests. Their experience is the weighted sum of their events: 1 for each list item added, 3 for each task checked off and 9 for each quest completed. The card shows their circle in a ring that fills toward the next circle, its title, starting at Circle 1 · Initiate, a bar toward the next circle, how much more experience that circle needs and the next title to reach. Events lists each kind in descending order of experience earned. A kind with no events shows what its first event is worth. On a phone the card stacks and every kind takes the page's width. Unchecking the task or restoring the quest takes back its event from whoever earned it, whoever does it. Midnight unchecks a recurring task without taking its event back, and checking it off again earns another. Removing a list item keeps its event. Each event belongs to the user who did it, in a shared quest too. Reading Profile makes no model request.

## use_case_experience_ring

- **Intent:** See at a glance how near the next circle they are, on any page.
- **Prerequisites:** a signed-in user.
- **Steps:**
  - They look at the right end of the site header's bar.
  - They check off a task and see the experience it earned.
  - They follow the ring.
- **Outcome:** a ring holding their circle's number fills as their experience nears the next circle, empty at the circle's start. Its name says their circle and its title and how much more experience the next circle needs. Following it opens Profile at its Experience card. It updates as the page refreshes after they do something. An increase briefly shows the amount earned below the header, such as "+3 experience". The message slides into place, or appears still when reduced motion is on. The ring shares the header's one row on a phone and never scrolls the page sideways.
