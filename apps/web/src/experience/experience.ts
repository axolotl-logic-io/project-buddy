// The weighted sum of recorded events sets the user’s experience and circle.
import { z } from "zod";

const EVENTS = ["adding", "checking-off", "completing-quests"] as const;

const EVENT_KIND = z.enum(EVENTS);

type Event = z.infer<typeof EVENT_KIND>;

const EVENT_KIND_WEIGHTS: Readonly<Record<Event, number>> = {
  adding: 1,
  "checking-off": 3,
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

type EventCounts = Readonly<Record<Event, number>>;

// Where a user stands: their counts in each event, their experience, their
// circle and its title, and the experience its first and next circles start at.
interface Experience {
  readonly counts: EventCounts;
  readonly experience: number;
  readonly circle: number;
  readonly title: CircleTitle;
  readonly circleStart: number;
  readonly nextCircleStart: number;
}

const NO_EVENTS: EventCounts = {
  adding: 0,
  "checking-off": 0,
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

// One event's counts and the experience they're worth.
interface EventStanding {
  readonly event: Event;
  readonly counts: number;
  readonly experience: number;
}

// Each event's counts and the experience they're worth, the most experience
// first. Events worth the same keep EVENTS' order.
function eventsByExperience(counts: EventCounts): readonly EventStanding[] {
  return EVENTS.map((event) => ({
    event,
    counts: counts[event],
    experience: counts[event] * EVENT_KIND_WEIGHTS[event],
  })).toSorted((a, b) => b.experience - a.experience);
}

// Where the counts put a user.
function experienceOf(counts: EventCounts): Experience {
  const experience = EVENTS.reduce(
    (total, event) => total + counts[event] * EVENT_KIND_WEIGHTS[event],
    0,
  );
  const circle = circleAt(experience);
  return {
    counts,
    experience,
    circle,
    title: titleOf(circle),
    circleStart: circleStart(circle),
    nextCircleStart: circleStart(circle + 1),
  };
}

export type { Event, EventCounts, EventStanding, Experience };
export {
  circleAt,
  circleFraction,
  circleStart,
  EVENT_KIND,
  EVENT_KIND_WEIGHTS,
  eventsByExperience,
  experienceOf,
  NO_EVENTS,
  nextTitleOf,
};
