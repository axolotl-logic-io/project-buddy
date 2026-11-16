import type { Ability } from "@/experience/experience.ts";

// Profile's experience card and Abilities, the construct's reply to the exp
// command, and the ring in the site header: the user's circle, its title, the
// experience they have and still need, and their points in each ability.
export const EXPERIENCE_COPY = {
  // The experience card's accessible name.
  heading: "Experience",
  circle: (circle: number, title: string): string =>
    `Circle ${circle} · ${title}`,
  standing: (experience: number, needed: number, next: number): string =>
    `${experience} experience. ${needed} more to reach circle ${next}.`,
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
  abilitiesLabel: "Abilities",
  abilities: {
    "adding-tasks": "Adding tasks",
    ideating: "Ideating",
    noting: "Quick Notes",
    "completing-tasks": "Completing tasks",
    "completing-quests": "Completing quests",
  } satisfies Record<Ability, string>,
  points: (points: number): string => {
    if (points === 1) {
      return "1 point";
    }
    return `${points} points`;
  },
  // The word after an ability tile's count of points.
  pointUnit: (points: number): "point" | "points" => {
    if (points === 1) {
      return "point";
    }
    return "points";
  },
  // The experience an ability's points are worth, on its tile.
  worth: (experience: number): string => `+${experience} experience`,
  // The badge on the ability that earned the most experience.
  mostExperience: "Most experience",
  // The first thing to do in each ability, for an untried ability's tile.
  firstSteps: {
    "adding-tasks": "Add your first task",
    ideating: "Add your first idea",
    noting: "Save your first Quick Note",
    "completing-tasks": "Complete your first task",
    "completing-quests": "Complete your first quest",
  } satisfies Record<Ability, string>,
  // What an ability with no points says: its first step (from firstSteps)
  // and what that first point is worth.
  untried: (firstStep: string, worth: number): string =>
    `Not yet tried. ${firstStep} for +${worth}.`,
} as const;
