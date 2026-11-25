import type { Event } from "@/experience/experience.ts";

// Profile's experience card and Events, and the ring in the site header:
// the user's circle and its title, their experience, and their event counts.
export const EXPERIENCE_COPY = {
  // The experience card's accessible name.
  heading: "Experience",
  circle: (circle: number, title: string): string =>
    `Circle ${circle} · ${title}`,
  // The header's ring, which fills toward the next circle and links to
  // Profile's Experience section, by its accessible name.
  progress: (
    circle: number,
    title: string,
    needed: number,
    next: number,
  ): string =>
    `Circle ${circle} · ${title}: ${needed} more experience to reach circle ${next}. Open your experience.`,
  // The card's ring says "Circle" above the circle's number.
  circleLabel: "Circle",
  experience: (experience: number): string => `${experience} experience`,
  toNext: (needed: number, next: number): string =>
    `${needed} to circle ${next}`,
  // The card's progress bar, by its accessible name.
  progressLabel: (next: number): string => `Progress to circle ${next}`,
  nextTitle: (title: string, circle: number): string =>
    `${title} awaits at circle ${circle}`,
  eventsLabel: "Events",
  events: {
    adding: "Adding",
    "checking-off": "Checking off",
    "completing-quests": "Completing quests",
  } satisfies Record<Event, string>,
  eventUnit: (counts: number): "event" | "events" => {
    if (counts === 1) {
      return "event";
    }
    return "events";
  },
  // The experience an event's counts are worth, on its tile.
  worth: (experience: number): string => `+${experience} experience`,
  // The first thing to do in each event, for an untried event's tile.
  firstSteps: {
    adding: "Add your first list item",
    "checking-off": "Check off your first task",
    "completing-quests": "Complete your first quest",
  } satisfies Record<Event, string>,
  // What an event with no counts says: its first step (from firstSteps)
  // and what that first event is worth.
  untried: (firstStep: string, worth: number): string =>
    `Not yet tried. ${firstStep} for +${worth}.`,
} as const;
