"use client";

import Link from "next/link";
import { type JSX, useCallback, useId, useState } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { ATLAS_PLACES } from "@/home/places.ts";
import type { TodayProject } from "@/today/today.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

function ContinueQuest({
  quest,
}: {
  readonly quest: TodayProject | undefined;
}): JSX.Element {
  if (quest === undefined) {
    return (
      <Link className="atlas-start" href="/chats/new?activity=interview">
        <Icon name="shield" />
        {HOME_COPY.newQuest}
      </Link>
    );
  }
  return (
    <aside
      aria-label={HOME_COPY.continueLabel(quest.project.name)}
      className="atlas-continue"
    >
      <Icon name="shield" />
      <div className="min-w-0 flex-1">
        <Link
          className="atlas-quest-name"
          href={`/projects/${quest.project.id}`}
        >
          {quest.project.name}
        </Link>
        {quest.nextStep !== undefined && (
          <p className="atlas-next-step">
            {HOME_COPY.nextStep} {quest.nextStep}
          </p>
        )}
      </div>
      <Link
        aria-label={HOME_COPY.continueLabel(quest.project.name)}
        className="atlas-continue-link"
        href={`/chats/${quest.latestChat}`}
      >
        {HOME_COPY.continue}
        <Icon className="rotate-180" name="arrow-left" />
      </Link>
    </aside>
  );
}

// The artwork has no interactive surface. Ordinary links carry navigation,
// remain in the first HTML, and reflow into large rows on narrow screens.
function HomeAtlas({
  latestQuest,
}: {
  readonly latestQuest: TodayProject | undefined;
}): JSX.Element {
  const placesId = useId();
  const [view, setView] = useState<"map" | "list">("map");
  const showMap = useCallback((): void => {
    setView("map");
  }, []);
  const showList = useCallback((): void => {
    setView("list");
  }, []);
  return (
    <div className="atlas" data-view={view}>
      <div className="atlas-intro">
        <div className="min-w-0">
          <h1 className="atlas-heading">{HOME_COPY.heading}</h1>
          <p className="atlas-introduction">
            {HOME_COPY.introduction}{" "}
            <Link className="atlas-inline-link" href="/activities">
              {HOME_COPY.activitiesLink}
            </Link>
          </p>
        </div>
        <fieldset className="atlas-views">
          <legend className="sr-only">{HOME_COPY.viewLabel}</legend>
          <button
            aria-pressed={view === "map"}
            className="atlas-view"
            onClick={showMap}
            type="button"
          >
            {HOME_COPY.map}
          </button>
          <button
            aria-pressed={view === "list"}
            className="atlas-view"
            onClick={showList}
            type="button"
          >
            {HOME_COPY.list}
          </button>
        </fieldset>
      </div>
      <ContinueQuest quest={latestQuest} />
      <nav aria-label={HOME_COPY.placesLabel} className="atlas-world">
        <ul className="atlas-places">
          {ATLAS_PLACES.map((place) => (
            <li className="atlas-place" key={place.href} data-place={place.id}>
              <Link
                aria-label={place.name}
                aria-describedby={`${placesId}-${place.id}`}
                className="atlas-destination"
                href={place.href}
              >
                <span className="atlas-marker">
                  <Icon name={place.icon} />
                </span>
                <span className="atlas-label">{place.name}</span>
                <span
                  className="atlas-description"
                  id={`${placesId}-${place.id}`}
                >
                  {place.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <footer className="atlas-footer">
        <div className="flex flex-wrap gap-4">
          <Link href="/settings">{HOME_COPY.settings}</Link>
          <Link href="/account">{HOME_COPY.account}</Link>
        </div>
        <p>{HOME_COPY.openPlaces}</p>
      </footer>
    </div>
  );
}

export { HomeAtlas };
