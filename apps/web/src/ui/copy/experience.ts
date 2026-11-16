import type { Ability } from "@/experience/experience.ts";

// The Experience section of Profile, the construct's reply to the exp
// command, and the ring in the site header: the user's circle, its title, the
// experience they have and still need, and their points in each ability.
export const EXPERIENCE_COPY = {
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
} as const;
