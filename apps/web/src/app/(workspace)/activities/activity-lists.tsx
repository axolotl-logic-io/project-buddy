// The activities list, shared by the Activities page and the Workshop: the
// built-in activities, each of which she can start or customize, and her
// own, oldest first, each of which she can start, tweak or clone, with a
// button that crafts a new one.
import Link from "next/link";
import type { JSX } from "react";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import {
  type NewChatChoices,
  newChatChoices,
} from "@/chats/new-chat-choices.ts";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { ActivityQuestEntry } from "@/components/quest-library.tsx";
import { Button } from "@/components/ui/button.tsx";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
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

// An activity as a card: its name, which opens New chat, what it is, if
// it says, then its actions.
function ActivityCard({
  activity,
  actions,
  choices,
}: {
  readonly activity: ListedActivity;
  readonly actions: JSX.Element;
  readonly choices: NewChatChoices & QuestCreationChoices;
}): JSX.Element {
  return (
    <li className="card flex flex-col gap-2">
      <NewChatDialog
        {...choices}
        fixedActivity={true}
        selectedActivityId={activity.id}
        trigger={
          <button
            className="card-title self-start text-left text-link"
            type="button"
          >
            {activity.name}
          </button>
        }
      />
      {activity.description !== undefined && (
        <p className="text-muted text-sm">{activity.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
      <ActivityQuestEntry activityId={activity.id} choices={choices} />
    </li>
  );
}

// The built-in activities as cards, each with its New chat dialog and a button
// that customizes it: makes a clone of her own and opens it to edit.
function BuiltInActivityCards({
  activities,
  choices,
}: {
  readonly activities: readonly ListedActivity[];
  readonly choices: NewChatChoices & QuestCreationChoices;
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
          choices={choices}
          key={activity.id}
        />
      ))}
    </ul>
  );
}

// Her own activities as cards, each with its New chat dialog, a link that tweaks
// it in place and a button that clones it; or, if she has none, a line that
// says so.
function OwnActivityCards({
  activities,
  choices,
}: {
  readonly activities: readonly ListedActivity[];
  readonly choices: NewChatChoices & QuestCreationChoices;
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
              <RetireActivityForm
                activityId={activity.id}
                name={activity.name}
              />
            </>
          }
          activity={activity}
          choices={choices}
          key={activity.id}
        />
      ))}
    </ul>
  );
}

async function ActivityLists(): Promise<JSX.Element> {
  const user = await requireUser();
  const [own, chatChoices, preferred] = await Promise.all([
    listOwnActivities(user.id),
    newChatChoices(user.id),
    interviewConstruct(user.id),
  ]);
  const choices = { ...chatChoices, preferredConstructId: preferred.id };
  return (
    <>
      <section
        aria-labelledby={BUILT_IN_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={BUILT_IN_HEADING_ID}>
          {ACTIVITIES_COPY.builtInHeading}
        </h2>
        <BuiltInActivityCards activities={listActivities()} choices={choices} />
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
        <OwnActivityCards activities={own} choices={choices} />
      </section>
    </>
  );
}

export { ActivityLists };
