import Link from "next/link";
import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { ATLAS_PLACES } from "@/home/places.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

// Home while its quest streams in: the same heading and introduction, and
// a tile where each destination will be, so nothing moves when it arrives.
export default function HomeLoading(): JSX.Element {
  return (
    <div className="atlas" data-inactive="">
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
      </div>
      <div className="atlas-world">
        <LoadingSkeleton label={HOME_COPY.loading} shapes={[]} />
        <div aria-hidden="true" className="skeleton mb-2 h-6 w-16" />
        <ul aria-hidden="true" className="atlas-places">
          {ATLAS_PLACES.map((place) => (
            <li className="atlas-place" key={place.href}>
              <div className="skeleton atlas-skeleton" />
            </li>
          ))}
        </ul>
      </div>
      <div aria-hidden="true" className="skeleton atlas-skeleton-panel" />
    </div>
  );
}
