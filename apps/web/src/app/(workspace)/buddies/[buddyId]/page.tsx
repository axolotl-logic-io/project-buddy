import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { getUserBuddy, type UserBuddy } from "@/buddies/buddy-store.ts";
import { type Buddy, getBuddy, isBuddyId } from "@/buddies/index.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { BUDDIES_COPY, BUDDY_COPY } from "@/ui/copy/buddies.ts";
import { editBuiltInBuddyAction, saveBuddyAction } from "../actions.ts";
import { FixedParts } from "./fixed-parts.tsx";
import { NameField, PartFields, ResetPartForms } from "./part-fields.tsx";

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
          {BUDDY_COPY.partsHeading}
        </h2>
        <PartFields editable={false} parts={buddy.parts} />
      </section>
      <FixedParts />
    </>
  );
}

// Her own buddy as a form that saves its name and every part. The form
// starts afresh whenever the buddy changes, so it shows what was saved.
function OwnBuddy({ buddy }: { readonly buddy: UserBuddy }): JSX.Element {
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
          <NameField name={buddy.name} />
        </div>
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {BUDDY_COPY.partsHeading}
        </h2>
        <PartFields editable={true} parts={buddy.parts} />
        <Button className="self-start" type="submit">
          {BUDDY_COPY.save}
        </Button>
      </form>
      <ResetPartForms buddyId={buddy.id} />
      <FixedParts />
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
  const buddy = await getUserBuddy(user.id, buddyId);
  if (buddy === undefined) {
    notFound();
  }
  return <OwnBuddy buddy={buddy} />;
}
