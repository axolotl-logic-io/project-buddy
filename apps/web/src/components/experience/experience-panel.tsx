import type { JSX } from "react";
import { ABILITIES, type Experience } from "@/experience/experience.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

// A link to Profile can open this section by its id.
const EXPERIENCE_ID = "experience";
const EXPERIENCE_HEADING_ID = "experience-heading";

// The user's circle and title, the experience they still need for the next
// circle, and their points in each ability.
export function ExperiencePanel({
  experience,
}: {
  readonly experience: Experience;
}): JSX.Element {
  const { circle, title, points, nextCircleStart } = experience;
  return (
    <section
      id={EXPERIENCE_ID}
      aria-labelledby={EXPERIENCE_HEADING_ID}
      className="panel flex flex-col gap-3"
    >
      <h2 id={EXPERIENCE_HEADING_ID} className="section-heading">
        {EXPERIENCE_COPY.heading}
      </h2>
      <p className="font-heading">{EXPERIENCE_COPY.circle(circle, title)}</p>
      <p className="text-muted">
        {EXPERIENCE_COPY.standing(
          experience.experience,
          nextCircleStart - experience.experience,
          circle + 1,
        )}
      </p>
      <dl
        aria-label={EXPERIENCE_COPY.abilitiesLabel}
        className="grid grid-cols-2 gap-x-4 gap-y-1"
      >
        {ABILITIES.map((ability) => (
          <div key={ability} className="contents">
            <dt>{EXPERIENCE_COPY.abilities[ability]}</dt>
            <dd className="text-muted">
              {EXPERIENCE_COPY.points(points[ability])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
