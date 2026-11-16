import Link from "next/link";
import type { JSX } from "react";
import type { Experience } from "@/experience/experience.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

// The ring's radius and circumference, in the SVG's 100-unit box, as the
// timer's ring (src/components/timer/timer-display.tsx).
const RING_RADIUS = 42;
const RING_LENGTH: number = 2 * Math.PI * RING_RADIUS;

// How far through their circle the user is, from 0 at its start to 1 at the
// next circle's.
function circleFraction(experience: Experience): number {
  const { circleStart, nextCircleStart } = experience;
  return (
    (experience.experience - circleStart) / (nextCircleStart - circleStart)
  );
}

// The user's circle in the site header: its number inside a ring that fills
// as they near the next circle, linking to Profile's Experience section.
// The ring is decoration: the link's name says the circle, its title and the
// experience still needed.
export function CircleProgress({
  experience,
}: {
  readonly experience: Experience;
}): JSX.Element {
  const { circle, title, nextCircleStart } = experience;
  return (
    <Link
      aria-label={EXPERIENCE_COPY.progress(
        circle,
        title,
        nextCircleStart - experience.experience,
        circle + 1,
      )}
      className="circle-progress"
      href="/profile#experience"
    >
      <svg
        aria-hidden="true"
        className="circle-progress-ring"
        viewBox="0 0 100 100"
      >
        <circle
          className="circle-progress-track"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeWidth="12"
        />
        <circle
          className="circle-progress-arc"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - circleFraction(experience))}
          strokeLinecap="round"
          strokeWidth="12"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span aria-hidden="true" className="circle-progress-number">
        {circle}
      </span>
    </Link>
  );
}
