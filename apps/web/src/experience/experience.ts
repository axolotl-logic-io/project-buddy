// A user's experience: each ability gains one point for each thing the user
// does in it, and the abilities' weighted points add up to their experience,
// which sets their circle. Experience counts only things done, never open
// work, days or streaks.
import { z } from "zod";

const ABILITIES = [
  "adding-tasks",
  "ideating",
  "noting",
  "completing-tasks",
  "completing-quests",
] as const;

const ABILITY = z.enum(ABILITIES);

type Ability = z.infer<typeof ABILITY>;

// Adding a task, an idea or a Quick Note is worth the same; completing a
// task is worth one of each, and completing a quest three completed tasks.
const ABILITY_WEIGHTS: Readonly<Record<Ability, number>> = {
  "adding-tasks": 1,
  ideating: 1,
  noting: 1,
  "completing-tasks": 3,
  "completing-quests": 9,
};

// Each circle needs CIRCLE_STEP more experience than the one before it did:
// circle n starts at CIRCLE_STEP · n(n − 1) / 2.
const CIRCLE_STEP = 5;

// The circles that start a new title, from the first.
const CIRCLE_TITLES = [
  { circle: 1, title: "Initiate" },
  { circle: 10, title: "Apprentice" },
  { circle: 20, title: "Practitioner" },
  { circle: 30, title: "Expert" },
  { circle: 40, title: "Master" },
  { circle: 60, title: "Pathfinder" },
  { circle: 80, title: "Grand Master" },
  { circle: 100, title: "Legendary" },
  { circle: 150, title: "Transcendent" },
] as const;

type CircleTitle = (typeof CIRCLE_TITLES)[number]["title"];

type AbilityPoints = Readonly<Record<Ability, number>>;

// Where a user stands: their points in each ability, their experience, their
// circle and its title, and the experience its first and next circles start at.
interface Experience {
  readonly points: AbilityPoints;
  readonly experience: number;
  readonly circle: number;
  readonly title: CircleTitle;
  readonly circleStart: number;
  readonly nextCircleStart: number;
}

const NO_POINTS: AbilityPoints = {
  "adding-tasks": 0,
  ideating: 0,
  noting: 0,
  "completing-tasks": 0,
  "completing-quests": 0,
};

// The experience circle starts at; circle 1 starts at 0.
function circleStart(circle: number): number {
  return (CIRCLE_STEP * circle * (circle - 1)) / 2;
}

// The circle experience reaches: the largest whose start is at most it.
function circleAt(experience: number): number {
  let circle = 1;
  while (circleStart(circle + 1) <= experience) {
    circle += 1;
  }
  return circle;
}

function titleOf(circle: number): CircleTitle {
  const reached = CIRCLE_TITLES.filter((entry) => entry.circle <= circle);
  return reached.at(-1)?.title ?? "Initiate";
}

// The next circle that starts a new title, or undefined once the user has
// reached the last title.
function nextTitleOf(
  circle: number,
): (typeof CIRCLE_TITLES)[number] | undefined {
  return CIRCLE_TITLES.find((entry) => entry.circle > circle);
}

// How far through their circle the user is, from 0 at its start to 1 at the
// next circle's.
function circleFraction(experience: Experience): number {
  const { circleStart: start, nextCircleStart } = experience;
  return (experience.experience - start) / (nextCircleStart - start);
}

// One ability's points and the experience they're worth.
interface AbilityStanding {
  readonly ability: Ability;
  readonly points: number;
  readonly experience: number;
}

// Each ability's points and the experience they're worth, the most experience
// first. Abilities worth the same keep ABILITIES' order.
function abilitiesByExperience(
  points: AbilityPoints,
): readonly AbilityStanding[] {
  return ABILITIES.map((ability) => ({
    ability,
    points: points[ability],
    experience: points[ability] * ABILITY_WEIGHTS[ability],
  })).toSorted((a, b) => b.experience - a.experience);
}

// Where the points put a user.
function experienceOf(points: AbilityPoints): Experience {
  const experience = ABILITIES.reduce(
    (total, ability) => total + points[ability] * ABILITY_WEIGHTS[ability],
    0,
  );
  const circle = circleAt(experience);
  return {
    points,
    experience,
    circle,
    title: titleOf(circle),
    circleStart: circleStart(circle),
    nextCircleStart: circleStart(circle + 1),
  };
}

export type {
  Ability,
  AbilityPoints,
  AbilityStanding,
  CircleTitle,
  Experience,
};
export {
  ABILITIES,
  ABILITY,
  ABILITY_WEIGHTS,
  abilitiesByExperience,
  CIRCLE_STEP,
  CIRCLE_TITLES,
  circleAt,
  circleFraction,
  circleStart,
  experienceOf,
  NO_POINTS,
  nextTitleOf,
};
