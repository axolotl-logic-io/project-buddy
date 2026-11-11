"use client";

import Link from "next/link";
import {
  type JSX,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
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
      <Link className="atlas-start" href="/projects">
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
      <div className="atlas-quest">
        <p className="atlas-hud-label">{HOME_COPY.currentQuest}</p>
        <p className="atlas-quest-name">{quest.project.name}</p>
        {quest.unread === true && (
          <p className="atlas-next-step">{HOME_COPY.unread}</p>
        )}
        {quest.nextStep !== undefined && (
          <p className="atlas-next-step">
            {HOME_COPY.nextStep} {quest.nextStep}
          </p>
        )}
      </div>
      <Link
        aria-label={HOME_COPY.continueLabel(quest.project.name)}
        className="atlas-continue-link"
        href={`/projects/${quest.project.id}`}
      >
        {HOME_COPY.continue}
        <Icon className="rotate-180" name="arrow-left" />
      </Link>
    </aside>
  );
}

// Home's frame, which dresses the page in the map's artwork while it is on
// screen: Home and Home while it loads, so the artwork is already there
// when Home arrives. Next retains visited pages in hidden Activities. Their
// layout effects disconnect while hidden, so only the visible atlas can
// dress the shell.
function AtlasShell({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const atlasRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const atlas = atlasRef.current;
    atlas?.removeAttribute("data-inactive");
    return (): void => {
      atlas?.setAttribute("data-inactive", "");
    };
  }, []);
  return (
    <div className="atlas" data-inactive="" ref={atlasRef}>
      {children}
    </div>
  );
}

// The map is decoration; ordinary links provide the same navigation and
// keyboard order in the two-column phone and three-column wide layouts.
function HomeAtlas({
  latestQuest,
  firstVisit = false,
}: {
  readonly latestQuest: TodayProject | undefined;
  readonly firstVisit?: boolean;
}): JSX.Element {
  const placesId = useId();
  return (
    <AtlasShell>
      <div className="atlas-intro">
        <div className="atlas-title">
          <h1 className="atlas-heading">{HOME_COPY.heading}</h1>
          {firstVisit === true && (
            <p className="atlas-introduction">{HOME_COPY.purpose}</p>
          )}
          <p className="atlas-introduction">
            {HOME_COPY.introduction}{" "}
            <Link className="atlas-inline-link" href="/activities">
              {HOME_COPY.activitiesLink}
            </Link>
          </p>
        </div>
      </div>
      <nav aria-label={HOME_COPY.placesLabel} className="atlas-world">
        <h2 className="atlas-places-heading">{HOME_COPY.placesLabel}</h2>
        <ul className="atlas-places">
          {ATLAS_PLACES.map((place) => (
            <li className="atlas-place" key={place.href}>
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
      <ContinueQuest quest={latestQuest} />
      <footer className="atlas-footer">
        <div className="atlas-personal-links">
          <Link href="/account">{HOME_COPY.account}</Link>
          <Link href="/settings">{HOME_COPY.settings}</Link>
        </div>
        <p>{HOME_COPY.openPlaces}</p>
      </footer>
    </AtlasShell>
  );
}

export { AtlasShell, HomeAtlas };
