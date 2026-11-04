import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { SellSection } from "@/app/(workspace)/marketplace/sell-section.tsx";
import { requireUser } from "@/auth/current-user.ts";
import { getOwnBuddy, type OwnBuddy } from "@/buddies/buddy-store.ts";
import { type Buddy, getBuddy, isBuddyId } from "@/buddies/index.ts";
import { PromptNameField, PromptText } from "@/components/prompt-text.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { readSaleState, type SaleState } from "@/marketplace/listing-store.ts";
import {
  BUDDIES_COPY,
  BUDDY_COPY,
  BUDDY_DEFINITION_COPY,
} from "@/ui/copy/buddies.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  editBuiltInBuddyAction,
  resetBuddyPromptAction,
  saveBuddyAction,
} from "../actions.ts";

const PROMPT_HEADING_ID = "buddy-parts-heading";

function BuddyHeading({
  name,
  intro,
}: {
  readonly name: string;
  readonly intro: string;
}): JSX.Element {
  return (
    <>
      <BackLink href="/buddies">{BUDDY_COPY.buddiesLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{name}</h1>
        <p className="text-muted">{intro}</p>
      </div>
    </>
  );
}

function BuiltInBuddy({ buddy }: { readonly buddy: Buddy }): JSX.Element {
  return (
    <>
      <BuddyHeading intro={BUDDY_COPY.builtInIntro} name={buddy.name} />
      <form action={editBuiltInBuddyAction}>
        <input name="buddyId" type="hidden" value={buddy.id} />
        <Button type="submit">{BUDDIES_COPY.customize}</Button>
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
          text={buddy.definition.prompt}
          {...BUDDY_DEFINITION_COPY.prompt}
        />
      </section>
    </>
  );
}

function OwnBuddyForm({
  buddy,
  sale,
}: {
  readonly buddy: OwnBuddy;
  readonly sale: SaleState;
}): JSX.Element {
  return (
    <>
      <BuddyHeading intro={BUDDY_COPY.ownIntro} name={buddy.name} />
      <form
        action={saveBuddyAction}
        className="flex flex-col gap-4"
        key={buddy.updatedAt.toISOString()}
      >
        <input name="buddyId" type="hidden" value={buddy.id} />
        <div className="panel">
          <PromptNameField name={buddy.name} />
        </div>
        <h2 className="section-heading" id={PROMPT_HEADING_ID}>
          {PROMPT_COPY.promptHeading}
        </h2>
        <PromptText
          editable={true}
          name="prompt"
          text={buddy.definition.prompt}
          {...BUDDY_DEFINITION_COPY.prompt}
        />
        <Button className="self-start" type="submit">
          {PROMPT_COPY.save}
        </Button>
      </form>
      <form action={resetBuddyPromptAction}>
        <input name="buddyId" type="hidden" value={buddy.id} />
        <Button type="submit" variant="quiet">
          {PROMPT_COPY.resetLabel("prompt")}
        </Button>
      </form>
      <SellSection kind="buddy" promptId={buddy.id} sale={sale} />
    </>
  );
}

export const metadata: Metadata = { title: BUDDY_COPY.title };

export default async function BuddyPage({
  params,
}: PageProps<"/buddies/[buddyId]">): Promise<JSX.Element> {
  const { buddyId } = await params;
  const user = await requireUser();
  if (isBuddyId(buddyId)) {
    return <BuiltInBuddy buddy={getBuddy(buddyId)} />;
  }
  const buddy = await getOwnBuddy(user.id, buddyId);
  if (buddy === undefined) {
    notFound();
  }
  const sale = await readSaleState(user.id, {
    kind: "buddy",
    promptId: buddy.id,
  });
  return <OwnBuddyForm buddy={buddy} sale={sale} />;
}
