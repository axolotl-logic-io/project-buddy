import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";
import { SellSection } from "@/app/(workspace)/marketplace/sell-section.tsx";
import { requireUser } from "@/auth/current-user.ts";
import { ConstructEditor } from "@/components/constructs/construct-editor.tsx";
import { ConstructVisualPreview } from "@/components/constructs/construct-visual-preview.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
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
import { readSaleState, type SaleState } from "@/marketplace/listing-store.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";
import {
  CONSTRUCT_COPY,
  CONSTRUCT_DEFINITION_COPY,
  CONSTRUCTS_COPY,
} from "@/ui/copy/constructs.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { pageTitle } from "@/ui/copy/site.ts";
import { workshopOptions } from "@/workshop/options.ts";
import { editBuiltInConstructAction, saveConstructAction } from "../actions.ts";
import { RetireConstructForm } from "../retire-construct-form.tsx";

const PROMPT_HEADING_ID = "construct-parts-heading";

function ConstructHeading({
  name,
  intro,
}: {
  readonly name: string;
  readonly intro: string;
}): JSX.Element {
  return (
    <>
      <BackLink href="/constructs">{CONSTRUCT_COPY.constructsLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading wrap-anywhere">{name}</h1>
        <p className="text-muted">{intro}</p>
      </div>
    </>
  );
}

function BuiltInConstruct({
  construct,
}: {
  readonly construct: Construct;
}): JSX.Element {
  return (
    <>
      <ConstructHeading
        intro={CONSTRUCT_COPY.builtInIntro}
        name={construct.name}
      />
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
          {PROMPT_COPY.promptHeading}
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
  sale,
  viewer,
}: {
  readonly construct: OwnConstruct;
  readonly sale: SaleState;
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
      <ConstructHeading intro={CONSTRUCT_COPY.ownIntro} name={construct.name} />
      <ConstructEditor
        action={saveConstructAction}
        construct={construct}
        defaultPrompt={
          (construct.boughtFrom === undefined &&
            constructResetPrompt(construct.clonedFrom).prompt) ||
          undefined
        }
        heading={PROMPT_COPY.promptHeading}
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
      {construct.boughtFrom !== undefined && (
        <p className="text-muted">{PROMPT_COPY.boughtResetHint}</p>
      )}
      <RetireConstructForm
        sale={sale.kind}
        name={construct.name}
        constructId={construct.id}
      />
      <SellSection kind="construct" promptId={construct.id} sale={sale} />
    </>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/constructs/[constructId]">): Promise<Metadata> {
  const { constructId } = await params;
  const user = await requireUser();
  let name: string | undefined;
  if (isConstructId(constructId)) {
    ({ name } = getConstruct(constructId));
  } else {
    name = (await getOwnConstruct(user.id, constructId))?.name;
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
  const options = await workshopOptions(user.id);
  if (isConstructId(constructId)) {
    const construct = getConstruct(constructId);
    return (
      <Workshop
        options={options}
        initial={{
          kind: "construct",
          id: construct.id,
          name: construct.name,
          prompt: construct.definition.prompt,
          whenToUse: "",
          openingRequest: "",
        }}
      >
        <BuiltInConstruct construct={construct} />
      </Workshop>
    );
  }
  const construct = await getOwnConstruct(user.id, constructId);
  if (construct === undefined) {
    const retired = await getRetiredDefinition(user.id, constructId);
    if (retired?.kind === "construct") {
      redirect(`/retirement/${retired.id}`);
    }
    notFound();
  }
  const sale = await readSaleState(user.id, {
    kind: "construct",
    promptId: construct.id,
  });
  return (
    <Workshop
      options={options}
      initial={{
        kind: "construct",
        id: construct.id,
        name: construct.name,
        prompt: construct.definition.prompt,
        whenToUse: "",
        openingRequest: "",
      }}
    >
      <FormStatus>{saved === "1" && PROMPT_COPY.saved}</FormStatus>
      <OwnConstructForm viewer={user.id} construct={construct} sale={sale} />
    </Workshop>
  );
}
