"use client";

import Link from "next/link";
import {
  type JSX,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { ATLAS_PLACES, ATLAS_TRAILS } from "@/home/places.ts";
import type { TodayProject } from "@/today/today.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

function ContinueQuest({
  quest,
}: {
  readonly quest: TodayProject | undefined;
}): JSX.Element {
  if (quest === undefined) {
    return (
      <Link
        className="atlas-start"
        href="/chats/new?activity=project-breakdown&projectId=new"
      >
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
      <span className="atlas-medallion">
        <Icon name="shield" />
      </span>
      <div className="atlas-quest">
        <p className="atlas-hud-label">{HOME_COPY.currentQuest}</p>
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

const PLACE_AT = new Map(ATLAS_PLACES.map((place) => [place.id, place.at]));

function trail([from, to]: readonly [string, string]): string[] {
  const start = PLACE_AT.get(from);
  const end = PLACE_AT.get(to);
  if (start === undefined || end === undefined) {
    return [];
  }
  return [`M${start.x} ${start.y}L${end.x} ${end.y}`];
}

// The dotted paths between markers, drawn in the same percent space as the
// markers so they meet at any map size.
function AtlasTrails(): JSX.Element {
  const path = ATLAS_TRAILS.flatMap(trail).join("");
  return (
    <svg
      aria-hidden="true"
      className="atlas-trails"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path d={path} vectorEffect="non-scaling-stroke" />
    </svg>
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
  const atlasRef = useRef<HTMLDivElement>(null);
  // Next retains visited pages in hidden Activities. Their layout effects
  // disconnect while hidden, so only the visible atlas can dress the shell.
  useLayoutEffect(() => {
    const atlas = atlasRef.current;
    atlas?.removeAttribute("data-inactive");
    return (): void => {
      atlas?.setAttribute("data-inactive", "");
    };
  }, []);
  const [view, setView] = useState<"map" | "list">("map");
  const showMap = useCallback((): void => {
    setView("map");
  }, []);
  const showList = useCallback((): void => {
    setView("list");
  }, []);
  return (
    <div className="atlas" data-view={view} ref={atlasRef}>
      <div className="atlas-intro">
        <div className="atlas-title">
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
        <AtlasTrails />
        <ul className="atlas-places">
          {ATLAS_PLACES.map((place) => (
            <li className="atlas-place" data-place={place.id} key={place.href}>
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
        <div className="atlas-personal-links">
          <Link href="/account">{HOME_COPY.account}</Link>
          <Link href="/settings">{HOME_COPY.settings}</Link>
        </div>
        <p>{HOME_COPY.openPlaces}</p>
      </footer>
    </div>
  );
}

export { HomeAtlas };
