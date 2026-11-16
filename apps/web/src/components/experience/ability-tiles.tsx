import type { JSX } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import {
  ABILITY_WEIGHTS,
  type Ability,
  type AbilityPoints,
  type AbilityStanding,
  abilitiesByExperience,
} from "@/experience/experience.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

const ABILITIES_HEADING_ID = "abilities-heading";

type IconName = Parameters<typeof Icon>[0]["name"];

const ABILITY_ICONS: Readonly<Record<Ability, IconName>> = {
  "adding-tasks": "plus",
  ideating: "sparkle",
  noting: "note",
  "completing-tasks": "check",
  "completing-quests": "flag",
};

// One ability: its points and the experience they're worth, or, before its
// first point, what that point would be worth.
function AbilityTile({
  standing,
  most,
}: {
  readonly standing: AbilityStanding;
  readonly most: boolean;
}): JSX.Element {
  const { ability, points, experience } = standing;
  let className = "ability-tile";
  if (most) {
    className = "ability-tile ability-tile-most";
  }
  if (points === 0) {
    className = "ability-tile ability-tile-untried";
  }
  return (
    <li className={className}>
      {most === true && (
        <span className="ability-badge">{EXPERIENCE_COPY.mostExperience} </span>
      )}
      <span className="ability-icon">
        <Icon name={ABILITY_ICONS[ability]} />
      </span>
      <span className="ability-name">{EXPERIENCE_COPY.abilities[ability]}</span>{" "}
      <span className="ability-count">
        <span className="ability-number">{points}</span>{" "}
        {EXPERIENCE_COPY.pointUnit(points)}
      </span>{" "}
      {points === 0 && (
        <span className="ability-hint">
          {EXPERIENCE_COPY.untried(
            EXPERIENCE_COPY.firstSteps[ability],
            ABILITY_WEIGHTS[ability],
          )}
        </span>
      )}
      {points > 0 && (
        <span className="ability-worth">
          {EXPERIENCE_COPY.worth(experience)}
        </span>
      )}
    </li>
  );
}

// The user's abilities, the one that earned the most experience first and
// marked so; one with no points says what its first point is worth.
export function AbilityTiles({
  points,
}: {
  readonly points: AbilityPoints;
}): JSX.Element {
  const standings = abilitiesByExperience(points);
  return (
    <section aria-labelledby={ABILITIES_HEADING_ID} className="flex flex-col">
      <h2 className="section-heading" id={ABILITIES_HEADING_ID}>
        {EXPERIENCE_COPY.abilitiesLabel}
      </h2>
      <ul className="ability-tiles">
        {standings.map((standing, index) => (
          <AbilityTile
            key={standing.ability}
            most={index === 0 && standing.experience > 0}
            standing={standing}
          />
        ))}
      </ul>
    </section>
  );
}
