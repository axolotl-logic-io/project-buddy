import Link from "next/link";
import type { JSX } from "react";
import { ProgressRing } from "@/components/experience/progress-ring.tsx";
import type { Experience } from "@/experience/experience.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

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
      <span aria-hidden="true" className="circle-progress-ring">
        <ProgressRing experience={experience} />
        <span className="circle-progress-number">{circle}</span>
      </span>
      <span aria-hidden="true" className="circle-progress-title">
        {title}
      </span>
    </Link>
  );
}
