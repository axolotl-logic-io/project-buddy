import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";
import { cache } from "react";
import {
  getOwnActivity,
  type OwnActivity,
} from "@/activities/activity-store.ts";
import { activityResetPrompt } from "@/activities/default-prompt.ts";
import {
  type Activity,
  getActivity,
  isActivityId,
} from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { StartWorkDialog } from "@/components/start-work-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { measureServerOperation } from "@/performance/server-spans.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import {
  ACTIVITIES_COPY,
  ACTIVITY_COPY,
  ACTIVITY_DEFINITION_COPY,
} from "@/ui/copy/activities.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { pageTitle } from "@/ui/copy/site.ts";
import { editBuiltInActivityAction, saveActivityAction } from "../actions.ts";
import { RetireActivityForm } from "../retire-activity-form.tsx";

const PROMPT_HEADING_ID = "activity-parts-heading";

function ActivityHeading({
  name,
  intro,
}: {
  readonly name: string;
  readonly intro: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="page-heading wrap-anywhere">{name}</h1>
      <p className="text-muted">{intro}</p>
    </div>
  );
}

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
        aria-labelledby={PROMPT_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={PROMPT_HEADING_ID}>
          {PROMPT_COPY.activityFieldsHeading}
        </h2>
        <PromptText
          editable={false}
          name="prompt"
          text={activity.definition.prompt}
          {...ACTIVITY_DEFINITION_COPY.prompt}
        />
        <PromptText
          editable={false}
          name="openingRequest"
          text={activity.definition.openingRequest}
          {...ACTIVITY_DEFINITION_COPY.openingRequest}
        />
      </section>
    </>
  );
}

function OwnActivityForm({
  activity,
  viewer,
}: {
  readonly activity: OwnActivity;
  readonly viewer: string;
}): JSX.Element {
  return (
    <>
      <ActivityHeading intro={ACTIVITY_COPY.ownIntro} name={activity.name} />
      <PromptEditor
        action={saveActivityAction}
        defaultPrompt={activityResetPrompt(activity.clonedFrom).prompt}
        heading={PROMPT_COPY.activityFieldsHeading}
        idName="activityId"
        key={activity.updatedAt.toISOString()}
        kind="activity"
        name={activity.name}
        promptId={activity.id}
        savedAt={activity.updatedAt.toISOString()}
        viewer={viewer}
        texts={[
          {
            name: "prompt",
            text: activity.definition.prompt,
            ...ACTIVITY_DEFINITION_COPY.prompt,
          },
          {
            name: "openingRequest",
            text: activity.definition.openingRequest,
            ...ACTIVITY_DEFINITION_COPY.openingRequest,
          },
        ]}
      />
      <RetireActivityForm name={activity.name} activityId={activity.id} />
    </>
  );
}

// Shared only within one React server request; acting user remains part of the key.
const readOwnDefinition = cache(getOwnActivity);

export async function generateMetadata({
  params,
}: PageProps<"/activities/[activityId]">): Promise<Metadata> {
  const { activityId } = await params;
  const user = await requireUser();
  let name: string | undefined;
  if (isActivityId(activityId)) {
    ({ name } = getActivity(activityId));
  } else {
    name = (
      await measureServerOperation("activity-metadata", () =>
        readOwnDefinition(user.id, activityId),
      )
    )?.name;
  }
  return { title: pageTitle(name ?? "Activity") };
}

export default async function ActivityPage({
  params,
  searchParams,
}: PageProps<"/activities/[activityId]">): Promise<JSX.Element> {
  const { activityId } = await params;
  const { saved } = await searchParams;
  const user = await requireUser();
  if (isActivityId(activityId)) {
    const activity = getActivity(activityId);
    const choices = await questCreationChoices(user.id);
    return (
      <Workshop>
        <BuiltInActivity activity={activity} />
        <StartWorkDialog
          choices={choices}
          startWith={{ kind: "activity", id: activity.id, name: activity.name }}
        />
      </Workshop>
    );
  }
  const activity = await measureServerOperation("activity-data", () =>
    readOwnDefinition(user.id, activityId),
  );
  if (activity === undefined) {
    const retired = await getRetiredDefinition(user.id, activityId);
    if (retired?.kind === "activity") {
      redirect(`/retirement/${retired.id}`);
    }
    notFound();
  }
  return (
    <Workshop>
      <FormStatus>{saved === "1" && PROMPT_COPY.saved}</FormStatus>
      <OwnActivityForm viewer={user.id} activity={activity} />
    </Workshop>
  );
}
