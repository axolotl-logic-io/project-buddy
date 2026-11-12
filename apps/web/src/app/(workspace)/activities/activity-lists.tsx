// The Workshop's activities list: the built-in activities, each of which the
// user can customize, and their own, oldest first, each of which they can
// tweak, clone or retire, with a button that crafts a new one. Activities
// are instructions the construct follows, so none is a place to start a
// quest from.

import Link from "next/link";
import type { JSX } from "react";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import {
  cloneActivityAction,
  editBuiltInActivityAction,
  newActivityAction,
} from "./actions.ts";
import { RetireActivityForm } from "./retire-activity-form.tsx";

const BUILT_IN_HEADING_ID = "built-in-activities-heading";
const OWN_HEADING_ID = "own-activities-heading";

// An activity in a list: its id, which its actions name, its name, and, for
// a built-in activity, what it is.
interface ListedActivity {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

// An activity as a card: its name, which opens its page, what it is, if it
// says, then its actions.
function ActivityCard({
  activity,
  actions,
}: {
  readonly activity: ListedActivity;
  readonly actions: JSX.Element;
}): JSX.Element {
  return (
    <li className="card flex min-w-0 flex-col gap-2">
      <Link
        className="card-title wrap-anywhere self-start text-link"
        href={`/activities/${activity.id}`}
      >
        {activity.name}
      </Link>
      {activity.description !== undefined && (
        <p className="wrap-anywhere text-muted text-sm">
          {activity.description}
        </p>
      )}
      <div className="card-actions">{actions}</div>
    </li>
  );
}

// The built-in activities as cards, each with a button that customizes it:
// makes a clone of the user's own and opens it to edit.
function BuiltInActivityCards({
  activities,
}: {
  readonly activities: readonly ListedActivity[];
}): JSX.Element {
  return (
    <ul className="definition-grid">
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

// The user's own activities as cards, each with a link that tweaks it in
// place and a button that clones it; or, if they have none, a line that
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
    <ul className="definition-grid">
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
              <RetireActivityForm
                activityId={activity.id}
                name={activity.name}
              />
            </>
          }
          activity={activity}
          key={activity.id}
        />
      ))}
    </ul>
  );
}

async function ActivityLists(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnActivities(user.id);
  return (
    <>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-heading" id={OWN_HEADING_ID}>
            {ACTIVITIES_COPY.ownHeading}
          </h2>
          <form action={newActivityAction}>
            <Button type="submit" variant="secondary">
              {ACTIVITIES_COPY.newActivity}
            </Button>
          </form>
        </div>
        <OwnActivityCards activities={own} />
      </section>
    </>
  );
}

export { ActivityLists };
