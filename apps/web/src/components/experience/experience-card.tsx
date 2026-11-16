import type { JSX, ReactNode } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import {
  circleFraction,
  type Experience,
  nextTitleOf,
} from "@/experience/experience.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

// A link to Profile, such as the header's ring, can open this card by its id.
const EXPERIENCE_ID = "experience";

// The ring's radius and circumference, in the SVG's 132-unit box.
const RING_RADIUS = 56;
const RING_LENGTH: number = 2 * Math.PI * RING_RADIUS;

// The user's circle: its number in a ring that fills as they near the next
// circle. The ring is decoration; the words say the circle.
function CircleRing({
  experience,
}: {
  readonly experience: Experience;
}): JSX.Element {
  return (
    <p className="profile-ring">
      <svg
        aria-hidden="true"
        className="profile-ring-arc"
        viewBox="0 0 132 132"
      >
        <circle className="profile-ring-disc" cx="66" cy="66" r={RING_RADIUS} />
        <circle
          className="profile-ring-track"
          cx="66"
          cy="66"
          r={RING_RADIUS}
          strokeWidth="10"
        />
        <circle
          className="profile-ring-fill"
          cx="66"
          cy="66"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - circleFraction(experience))}
          strokeLinecap="round"
          strokeWidth="10"
          transform="rotate(-90 66 66)"
        />
      </svg>
      <span className="profile-ring-label">{EXPERIENCE_COPY.circleLabel}</span>{" "}
      <span className="profile-ring-number">{experience.circle}</span>
    </p>
  );
}

// The head of Profile: the user's circle and title, beside their name (the
// children), with a bar filling toward the next circle, the experience it
// still needs, and the next title to reach, if any is left.
export function ExperienceCard({
  experience,
  children,
}: {
  readonly experience: Experience;
  readonly children: ReactNode;
}): JSX.Element {
  const { circle, title, circleStart, nextCircleStart } = experience;
  const next = nextTitleOf(circle);
  return (
    <section
      aria-label={EXPERIENCE_COPY.heading}
      className="profile-card"
      id={EXPERIENCE_ID}
    >
      <CircleRing experience={experience} />
      <div className="profile-card-body">
        {children}
        <p className="profile-title">{title}</p>
        <progress
          aria-label={EXPERIENCE_COPY.progressLabel(circle + 1)}
          className="profile-progress"
          max={nextCircleStart - circleStart}
          value={experience.experience - circleStart}
        />
        <p className="profile-standing">
          <strong>{EXPERIENCE_COPY.experience(experience.experience)}</strong>{" "}
          <span className="text-muted">
            {EXPERIENCE_COPY.toNext(
              nextCircleStart - experience.experience,
              circle + 1,
            )}
          </span>
        </p>
        {next !== undefined && (
          <p className="profile-next icon-line">
            <Icon name="flag" />
            {EXPERIENCE_COPY.nextTitle(next.title, next.circle)}
          </p>
        )}
      </div>
    </section>
  );
}
