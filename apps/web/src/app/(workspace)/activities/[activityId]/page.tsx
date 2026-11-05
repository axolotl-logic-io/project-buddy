import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";
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
import { SellSection } from "@/app/(workspace)/marketplace/sell-section.tsx";
import { requireUser } from "@/auth/current-user.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { readSaleState, type SaleState } from "@/marketplace/listing-store.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import {
  ACTIVITIES_COPY,
  ACTIVITY_COPY,
  ACTIVITY_DEFINITION_COPY,
} from "@/ui/copy/activities.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import { workshopOptions } from "@/workshop/options.ts";
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
    <>
      <BackLink href="/activities">{ACTIVITY_COPY.activitiesLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h2 className="section-heading">{name}</h2>
        <p className="text-muted">{intro}</p>
      </div>
    </>
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
  sale,
  viewer,
}: {
  readonly activity: OwnActivity;
  readonly sale: SaleState;
  readonly viewer: string;
}): JSX.Element {
  return (
    <>
      <ActivityHeading intro={ACTIVITY_COPY.ownIntro} name={activity.name} />
      <PromptEditor
        action={saveActivityAction}
        defaultPrompt={
          (activity.boughtFrom === undefined &&
            activityResetPrompt(activity.clonedFrom).prompt) ||
          undefined
        }
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
      {activity.boughtFrom !== undefined && (
        <p className="text-muted">{PROMPT_COPY.boughtResetHint}</p>
      )}
      <RetireActivityForm
        sale={sale.kind}
        name={activity.name}
        activityId={activity.id}
      />
      <SellSection kind="activity" promptId={activity.id} sale={sale} />
    </>
  );
}

export const metadata: Metadata = { title: WORKSHOP_COPY.title };

export default async function ActivityPage({
  params,
}: PageProps<"/activities/[activityId]">): Promise<JSX.Element> {
  const { activityId } = await params;
  const user = await requireUser();
  const options = await workshopOptions(user.id);
  if (isActivityId(activityId)) {
    const activity = getActivity(activityId);
    return (
      <Workshop
        options={options}
        initial={{
          kind: "activity",
          id: activity.id,
          name: activity.name,
          prompt: activity.definition.prompt,
          whenToUse: "",
          openingRequest: activity.definition.openingRequest,
        }}
      >
        <BuiltInActivity activity={activity} />
      </Workshop>
    );
  }
  const activity = await getOwnActivity(user.id, activityId);
  if (activity === undefined) {
    const retired = await getRetiredDefinition(user.id, activityId);
    if (retired?.kind === "activity") {
      redirect(`/retirement/${retired.id}`);
    }
    notFound();
  }
  const sale = await readSaleState(user.id, {
    kind: "activity",
    promptId: activity.id,
  });
  return (
    <Workshop
      options={options}
      initial={{
        kind: "activity",
        id: activity.id,
        name: activity.name,
        prompt: activity.definition.prompt,
        whenToUse: "",
        openingRequest: activity.definition.openingRequest,
      }}
    >
      <OwnActivityForm viewer={user.id} activity={activity} sale={sale} />
    </Workshop>
  );
}
