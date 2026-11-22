import type { JSX } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import {
  EVENT_KIND_WEIGHTS,
  type Event,
  type EventCounts,
  type EventStanding,
  eventsByExperience,
} from "@/experience/experience.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

const EVENTS_HEADING_ID = "events-heading";

type IconName = Parameters<typeof Icon>[0]["name"];

const EVENT_KIND_ICONS: Readonly<Record<Event, IconName>> = {
  adding: "plus",
  "checking-off": "check",
  "completing-quests": "flag",
};

// One event: its counts and the experience they're worth, or, before its
// first point, what that point would be worth.
function EventTile({
  standing,
  most,
}: {
  readonly standing: EventStanding;
  readonly most: boolean;
}): JSX.Element {
  const { event, counts, experience } = standing;
  let className = "event-tile";
  if (most) {
    className = "event-tile event-tile-most";
  }
  if (counts === 0) {
    className = "event-tile event-tile-untried";
  }
  return (
    <li className={className}>
      {most === true && (
        <span className="event-badge">{EXPERIENCE_COPY.mostExperience} </span>
      )}
      <span className="event-icon">
        <Icon name={EVENT_KIND_ICONS[event]} />
      </span>
      <span className="event-name">{EXPERIENCE_COPY.events[event]}</span>{" "}
      <span className="event-count">
        <span className="event-number">{counts}</span>{" "}
        {EXPERIENCE_COPY.eventUnit(counts)}
      </span>{" "}
      {counts === 0 && (
        <span className="event-hint">
          {EXPERIENCE_COPY.untried(
            EXPERIENCE_COPY.firstSteps[event],
            EVENT_KIND_WEIGHTS[event],
          )}
        </span>
      )}
      {counts > 0 && (
        <span className="event-worth">{EXPERIENCE_COPY.worth(experience)}</span>
      )}
    </li>
  );
}

// The user's events, the one that earned the most experience first and
// marked so; one with no counts says what its first point is worth.
export function EventTiles({
  counts,
}: {
  readonly counts: EventCounts;
}): JSX.Element {
  const standings = eventsByExperience(counts);
  return (
    <section aria-labelledby={EVENTS_HEADING_ID} className="flex flex-col">
      <h2 className="section-heading" id={EVENTS_HEADING_ID}>
        {EXPERIENCE_COPY.eventsLabel}
      </h2>
      <ul className="event-tiles">
        {standings.map((standing, index) => (
          <EventTile
            key={standing.event}
            most={index === 0 && standing.experience > 0}
            standing={standing}
          />
        ))}
      </ul>
    </section>
  );
}
