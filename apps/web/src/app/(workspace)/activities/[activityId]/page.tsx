import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import {
  getOwnActivity,
  type OwnActivity,
} from "@/activities/activity-store.ts";
import {
  type Activity,
  getActivity,
  isActivityId,
} from "@/activities/index.ts";
import { ACTIVITY_PART_KEYS } from "@/activities/part-defaults.ts";
import { requireUser } from "@/auth/current-user.ts";
import {
  PromptNameField,
  PromptPartFields,
  PromptResetForms,
} from "@/components/prompt-part-fields.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ACTIVITIES_COPY, ACTIVITY_COPY } from "@/ui/copy/activities.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  editBuiltInActivityAction,
  resetActivityPartAction,
  saveActivityAction,
} from "../actions.ts";
import { activityPartFields } from "./part-fields.ts";

const PARTS_HEADING_ID = "activity-parts-heading";

// The page's heading and the line under it.
function ActivityHeading({
  name,
  intro,
}: {
  readonly name: string;
  readonly intro: string;
}): JSX.Element {
  return (
    <>
      <BackLink href="/activities">{ACTIVITY_COPY.activitiesLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{name}</h1>
        <p className="text-muted">{intro}</p>
      </div>
    </>
  );
}

// A built-in activity, every part read-only, with a button that customizes
// it: makes a copy of her own and opens it to edit.
function BuiltInActivity({
  activity,
}: {
  readonly activity: Activity;
}): JSX.Element {
  return (
    <>
      <ActivityHeading
        intro={ACTIVITY_COPY.builtInIntro}
        name={activity.name}
      />
      <form action={editBuiltInActivityAction}>
        <input name="activityId" type="hidden" value={activity.id} />
        <Button type="submit">{ACTIVITIES_COPY.customize}</Button>
      </form>
      <section
        aria-labelledby={PARTS_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {PROMPT_COPY.partsHeading}
        </h2>
        <PromptPartFields
          editable={false}
          fields={activityPartFields(activity.parts)}
        />
      </section>
    </>
  );
}

// Her own activity as a form that saves its name and every part. The form
// starts afresh whenever the activity changes, so it shows what was saved.
function OwnActivityForm({
  activity,
}: {
  readonly activity: OwnActivity;
}): JSX.Element {
  return (
    <>
      <ActivityHeading intro={ACTIVITY_COPY.ownIntro} name={activity.name} />
      <form
        action={saveActivityAction}
        className="flex flex-col gap-4"
        key={activity.updatedAt.toISOString()}
      >
        <input name="activityId" type="hidden" value={activity.id} />
        <div className="panel">
          <PromptNameField name={activity.name} />
        </div>
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {PROMPT_COPY.partsHeading}
        </h2>
        <PromptPartFields
          editable={true}
          fields={activityPartFields(activity.parts)}
        />
        <Button className="self-start" type="submit">
          {PROMPT_COPY.save}
        </Button>
      </form>
      <PromptResetForms
        action={resetActivityPartAction}
        id={activity.id}
        idField="activityId"
        keys={ACTIVITY_PART_KEYS}
      />
    </>
  );
}

export const metadata: Metadata = { title: ACTIVITY_COPY.title };

// An activity's prompt as named parts: a built-in activity's read-only, her
// own to edit. Another user's activity, or an unknown id, is not found.
export default async function ActivityPage({
  params,
}: PageProps<"/activities/[activityId]">): Promise<JSX.Element> {
  const { activityId } = await params;
  const user = await requireUser();
  if (isActivityId(activityId)) {
    return <BuiltInActivity activity={getActivity(activityId)} />;
  }
  const activity = await getOwnActivity(user.id, activityId);
  if (activity === undefined) {
    notFound();
  }
  return <OwnActivityForm activity={activity} />;
}
