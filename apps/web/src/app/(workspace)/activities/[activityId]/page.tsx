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
import { SellSection } from "@/app/(workspace)/marketplace/sell-section.tsx";
import { requireUser } from "@/auth/current-user.ts";
import { PromptNameField, PromptText } from "@/components/prompt-text.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { readSaleState, type SaleState } from "@/marketplace/listing-store.ts";
import {
  ACTIVITIES_COPY,
  ACTIVITY_COPY,
  ACTIVITY_DEFINITION_COPY,
} from "@/ui/copy/activities.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import { workshopOptions } from "@/workshop/options.ts";
import {
  editBuiltInActivityAction,
  resetActivityPromptAction,
  saveActivityAction,
} from "../actions.ts";

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
          {PROMPT_COPY.promptHeading}
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
}: {
  readonly activity: OwnActivity;
  readonly sale: SaleState;
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
        <h2 className="section-heading" id={PROMPT_HEADING_ID}>
          {PROMPT_COPY.promptHeading}
        </h2>
        <PromptText
          editable={true}
          name="prompt"
          text={activity.definition.prompt}
          {...ACTIVITY_DEFINITION_COPY.prompt}
        />
        <PromptText
          editable={true}
          name="openingRequest"
          text={activity.definition.openingRequest}
          {...ACTIVITY_DEFINITION_COPY.openingRequest}
        />
        <Button className="self-start" type="submit">
          {PROMPT_COPY.save}
        </Button>
      </form>
      <form action={resetActivityPromptAction}>
        <input name="activityId" type="hidden" value={activity.id} />
        <Button type="submit" variant="quiet">
          {PROMPT_COPY.resetLabel("prompt")}
        </Button>
      </form>
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
      <OwnActivityForm activity={activity} sale={sale} />
    </Workshop>
  );
}
