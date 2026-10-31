import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import { startPageHref } from "@/activities/start-page.ts";
import { requireUser } from "@/auth/current-user.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { HOME_PATH } from "@/routes.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { cloneActivityAction, editBuiltInActivityAction } from "../actions.ts";

const BUILT_IN_HEADING_ID = "built-in-activities-heading";
const OWN_HEADING_ID = "own-activities-heading";

// An activity in a list: its id, which its actions name, its name, and, for
// a built-in activity, what it is.
interface ListedActivity {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

// The link to the activity's start page.
function StartLink({
  activity,
}: {
  readonly activity: ListedActivity;
}): JSX.Element {
  return (
    <Button asChild={true} variant="quiet">
      <Link
        aria-label={ACTIVITIES_COPY.startLabel(activity.name)}
        href={startPageHref(activity.id)}
      >
        {ACTIVITIES_COPY.start}
      </Link>
    </Button>
  );
}

// An activity as a card: its name, which links to its page, what it is, if
// it says, then its actions.
function ActivityCard({
  activity,
  actions,
}: {
  readonly activity: ListedActivity;
  readonly actions: JSX.Element;
}): JSX.Element {
  return (
    <li className="card flex flex-col gap-2">
      <Link
        className="card-title text-link"
        href={`/activities/${activity.id}`}
      >
        {activity.name}
      </Link>
      {activity.description !== undefined && (
        <p className="text-muted text-sm">{activity.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StartLink activity={activity} />
        {actions}
      </div>
    </li>
  );
}

// The built-in activities as cards, each with its start page and a button
// that customizes it: makes a clone of her own and opens it to edit.
function BuiltInActivityCards({
  activities,
}: {
  readonly activities: readonly ListedActivity[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {activities.map((activity) => (
        <ActivityCard
          actions={
            <form action={editBuiltInActivityAction}>
              <input name="activityId" type="hidden" value={activity.id} />
              <Button
                aria-label={ACTIVITIES_COPY.customizeLabel(activity.name)}
                type="submit"
                variant="quiet"
              >
                {ACTIVITIES_COPY.customize}
              </Button>
            </form>
          }
          activity={activity}
          key={activity.id}
        />
      ))}
    </ul>
  );
}

// Her own activities as cards, each with its start page, a link that tweaks
// it in place and a button that clones it; or, if she has none, a line that
// says so.
function OwnActivityCards({
  activities,
}: {
  readonly activities: readonly ListedActivity[];
}): JSX.Element {
  if (activities.length === 0) {
    return <p className="text-muted">{ACTIVITIES_COPY.noOwn}</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {activities.map((activity) => (
        <ActivityCard
          actions={
            <>
              <Button asChild={true} variant="quiet">
                <Link
                  aria-label={ACTIVITIES_COPY.tweakLabel(activity.name)}
                  href={`/activities/${activity.id}`}
                >
                  {ACTIVITIES_COPY.tweak}
                </Link>
              </Button>
              <form action={cloneActivityAction}>
                <input name="sourceId" type="hidden" value={activity.id} />
                <Button
                  aria-label={ACTIVITIES_COPY.cloneLabel(activity.name)}
                  type="submit"
                  variant="quiet"
                >
                  {ACTIVITIES_COPY.clone}
                </Button>
              </form>
            </>
          }
          activity={activity}
          key={activity.id}
        />
      ))}
    </ul>
  );
}

export const metadata: Metadata = { title: ACTIVITIES_COPY.title };

// The built-in activities, each of which she can start or customize, and
// her own, oldest first, each of which she can start, tweak or clone.
export default async function ActivitiesPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnActivities(user.id);
  return (
    <>
      <BackLink href={HOME_PATH}>{ACTIVITIES_COPY.homeLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{ACTIVITIES_COPY.heading}</h1>
        <p className="text-muted">{ACTIVITIES_COPY.intro}</p>
      </div>
      <section
        aria-labelledby={BUILT_IN_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={BUILT_IN_HEADING_ID}>
          {ACTIVITIES_COPY.builtInHeading}
        </h2>
        <BuiltInActivityCards activities={listActivities()} />
      </section>
      <section aria-labelledby={OWN_HEADING_ID} className="flex flex-col gap-4">
        <h2 className="section-heading" id={OWN_HEADING_ID}>
          {ACTIVITIES_COPY.ownHeading}
        </h2>
        <OwnActivityCards activities={own} />
      </section>
    </>
  );
}
