import Link from "next/link";
import type { JSX } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// The ribbon at the top of Home: links out to Quests, the Grimoire and the
// Timer, named as the site panel's Places names them.
function HomePlaces(): JSX.Element {
  return (
    <nav aria-label={SITE_PANEL_COPY.placesLabel} className="home-places">
      <ul className="home-places-list">
        <li>
          <Link className="home-place" href="/quests">
            <Icon name="compass" />
            {QUESTS_COPY.headerLink}
          </Link>
        </li>
        <li>
          <Link className="home-place" href="/grimoire">
            <Icon name="book" />
            {GRIMOIRE_COPY.heading}
          </Link>
        </li>
        <li>
          <Link className="home-place" href="/timer">
            <Icon name="hourglass" />
            {TIMER_COPY.panelLink}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export { HomePlaces };
