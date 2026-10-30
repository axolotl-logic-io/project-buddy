import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { getOwnBuddy, type OwnBuddy } from "@/buddies/buddy-store.ts";
import { type Buddy, getBuddy, isBuddyId } from "@/buddies/index.ts";
import { BUDDY_PART_KEYS } from "@/buddies/part-defaults.ts";
import {
  PromptNameField,
  PromptPartFields,
  PromptResetForms,
} from "@/components/prompt-part-fields.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { BUDDIES_COPY, BUDDY_COPY } from "@/ui/copy/buddies.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  editBuiltInBuddyAction,
  resetBuddyPartAction,
  saveBuddyAction,
} from "../actions.ts";
import { buddyPartFields } from "./part-fields.ts";

const PARTS_HEADING_ID = "buddy-parts-heading";

// The page's heading and the line under it.
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

// A built-in buddy, every part read-only, with a button that customizes
// it: makes a copy of her own and opens it to edit.
function BuiltInBuddy({ buddy }: { readonly buddy: Buddy }): JSX.Element {
  return (
    <>
      <BuddyHeading intro={BUDDY_COPY.builtInIntro} name={buddy.name} />
      <form action={editBuiltInBuddyAction}>
        <input name="buddyId" type="hidden" value={buddy.id} />
        <Button type="submit">{BUDDIES_COPY.customize}</Button>
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
          fields={buddyPartFields(buddy.parts)}
        />
      </section>
    </>
  );
}

// Her own buddy as a form that saves its name and every part. The form
// starts afresh whenever the buddy changes, so it shows what was saved.
function OwnBuddyForm({ buddy }: { readonly buddy: OwnBuddy }): JSX.Element {
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
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {PROMPT_COPY.partsHeading}
        </h2>
        <PromptPartFields
          editable={true}
          fields={buddyPartFields(buddy.parts)}
        />
        <Button className="self-start" type="submit">
          {PROMPT_COPY.save}
        </Button>
      </form>
      <PromptResetForms
        action={resetBuddyPartAction}
        id={buddy.id}
        idField="buddyId"
        keys={BUDDY_PART_KEYS}
      />
    </>
  );
}

export const metadata: Metadata = { title: BUDDY_COPY.title };

// A buddy's prompt as named parts: a built-in buddy's read-only, her own
// to edit. Another user's buddy, or an unknown id, is not found.
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
  return <OwnBuddyForm buddy={buddy} />;
}
