import type { JSX } from "react";
import { ProgressArc } from "@/components/ui/progress-arc.tsx";
import { circleFraction, type Experience } from "@/experience/experience.ts";

// The ring's stroke reaches the edge of its 100-wide view, so the ring is
// exactly as wide as the box it is drawn in.
const RING_VIEW = 100;
const RING_STROKE = 7;
const RING_CENTRE: number = RING_VIEW / 2;

// Visible progress for the header and Profile. Each caller supplies the
// accessible description and the space for its circle number.
export function ProgressRing({
  experience,
}: {
  readonly experience: Experience;
}): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="experience-ring"
      viewBox={`0 0 ${RING_VIEW} ${RING_VIEW}`}
    >
      <ProgressArc
        centre={RING_CENTRE}
        fraction={circleFraction(experience)}
        radius={RING_CENTRE - RING_STROKE / 2}
        strokeWidth={RING_STROKE}
      />
    </svg>
  );
}
