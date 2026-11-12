import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";
import { cache } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ConstructVisualPreview } from "@/components/constructs/construct-visual-preview.tsx";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import {
  getOwnConstruct,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { constructResetPrompt } from "@/constructs/default-prompt.ts";
import {
  type Construct,
  getConstruct,
  isConstructId,
} from "@/constructs/index.ts";
import { measureServerOperation } from "@/performance/server-spans.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";
import {
  CONSTRUCT_COPY,
  CONSTRUCT_DEFINITION_COPY,
  CONSTRUCTS_COPY,
} from "@/ui/copy/constructs.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { pageTitle } from "@/ui/copy/site.ts";
import { editBuiltInConstructAction, saveConstructAction } from "../actions.ts";
import { RetireConstructForm } from "../retire-construct-form.tsx";

const PROMPT_HEADING_ID = "construct-parts-heading";

function BuiltInConstruct({
  construct,
}: {
  readonly construct: Construct;
}): JSX.Element {
  return (
    <>
      <p className="text-muted">{CONSTRUCT_COPY.builtInIntro}</p>
      <form action={editBuiltInConstructAction}>
        <input name="constructId" type="hidden" value={construct.id} />
        <Button type="submit">{CONSTRUCTS_COPY.customize}</Button>
      </form>
      <section
        className="flex min-w-0 flex-col gap-4"
        aria-label={VISUAL_COPY.heading}
      >
        <h2 className="section-heading">{VISUAL_COPY.heading}</h2>
        <p className="whitespace-pre-wrap break-words">
          {construct.definition.visual?.description}
        </p>
        <ConstructVisualPreview construct={construct} />
      </section>
      <section
        aria-labelledby={PROMPT_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={PROMPT_HEADING_ID}>
          {PROMPT_COPY.constructFieldsHeading}
        </h2>
        <PromptText
          editable={false}
          name="prompt"
          text={construct.definition.prompt}
          {...CONSTRUCT_DEFINITION_COPY.prompt}
        />
      </section>
    </>
  );
}

function visualRequiredMessage(
  construct: OwnConstruct,
): typeof VISUAL_COPY.requiredDescription | undefined {
  if (construct.definition.visual !== undefined) {
    return VISUAL_COPY.requiredDescription;
  }
  return undefined;
}

function OwnConstructForm({
  construct,
  viewer,
}: {
  readonly construct: OwnConstruct;
  readonly viewer: string;
}): JSX.Element {
  // Artwork attachments must not invalidate an otherwise current browser draft.
  const draftRevision = JSON.stringify([
    construct.name,
    construct.definition.prompt,
    construct.definition.visual?.description ?? "",
  ]);
  return (
    <>
      <p className="text-muted">{CONSTRUCT_COPY.ownIntro}</p>
      <PromptEditor
        action={saveConstructAction}
        defaultPrompt={constructResetPrompt(construct.clonedFrom).prompt}
        heading={PROMPT_COPY.constructFieldsHeading}
        idName="constructId"
        key={draftRevision}
        kind="construct"
        name={construct.name}
        promptId={construct.id}
        savedAt={draftRevision}
        viewer={viewer}
        texts={[
          {
            name: "prompt",
            text: construct.definition.prompt,
            ...CONSTRUCT_DEFINITION_COPY.prompt,
          },
          {
            name: "visualDescription",
            text: construct.definition.visual?.description ?? "",
            label: VISUAL_COPY.description,
            help: VISUAL_COPY.descriptionHelp,
            maxLength: 4000,
            literal: true,
            requiredMessage: visualRequiredMessage(construct),
          },
        ]}
      />
      <RetireConstructForm name={construct.name} constructId={construct.id} />
    </>
  );
}

// Shared only within one React server request; acting user remains part of the key.
const readOwnDefinition = cache(getOwnConstruct);

export async function generateMetadata({
  params,
}: PageProps<"/constructs/[constructId]">): Promise<Metadata> {
  const { constructId } = await params;
  const user = await requireUser();
  let name: string | undefined;
  if (isConstructId(constructId)) {
    ({ name } = getConstruct(constructId));
  } else {
    name = (
      await measureServerOperation("construct-metadata", () =>
        readOwnDefinition(user.id, constructId),
      )
    )?.name;
  }
  return { title: pageTitle(name ?? "Construct") };
}

export default async function ConstructPage({
  params,
  searchParams,
}: PageProps<"/constructs/[constructId]">): Promise<JSX.Element> {
  const { constructId } = await params;
  const { saved } = await searchParams;
  const user = await requireUser();
  if (isConstructId(constructId)) {
    const construct = getConstruct(constructId);
    return (
      <Workshop kind="construct">
        <BuiltInConstruct construct={construct} />
      </Workshop>
    );
  }
  const construct = await measureServerOperation("construct-data", () =>
    readOwnDefinition(user.id, constructId),
  );
  if (construct === undefined) {
    const retired = await getRetiredDefinition(user.id, constructId);
    if (retired?.kind === "construct") {
      redirect(`/retirement/${retired.id}`);
    }
    notFound();
  }
  return (
    <Workshop kind="construct">
      <FormStatus>{saved === "1" && PROMPT_COPY.saved}</FormStatus>
      <OwnConstructForm viewer={user.id} construct={construct} />
    </Workshop>
  );
}
