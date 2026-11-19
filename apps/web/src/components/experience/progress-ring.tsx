import type { JSX } from "react";
import { circleFraction, type Experience } from "@/experience/experience.ts";

const RING_RADIUS = 42;
const RING_STROKE = 7;
const RING_LENGTH: number = 2 * Math.PI * RING_RADIUS;

// Visible progress for the header and Profile. Each caller supplies the
// accessible description and the space for its circle number.
export function ProgressRing({
  experience,
}: {
  readonly experience: Experience;
}): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100">
      <circle fill="var(--ring-disc)" cx="50" cy="50" r={RING_RADIUS} />
      <circle
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth={RING_STROKE}
        cx="50"
        cy="50"
        r={RING_RADIUS}
      />
      <circle
        fill="none"
        stroke="var(--ring-arc)"
        strokeWidth={RING_STROKE}
        cx="50"
        cy="50"
        r={RING_RADIUS}
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - circleFraction(experience))}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}
