"use client";

// The buddy page's fields, rendered in the browser, where useId gives
// each field's label the id of its own control.
import type { JSX } from "react";
import type { BuddyParts } from "@/buddies/index.ts";
import {
  BUDDY_PART_KEYS,
  BUDDY_SKILL_FLAGS,
  type BuddyPartKey,
  isMechanicsPart,
  SYSTEM_PROMPT_PARTS,
} from "@/buddies/part-defaults.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { extraTag } from "@/flags/flags.ts";
import { BUDDY_COPY, BUDDY_PARTS_COPY } from "@/ui/copy/buddies.ts";
import { resetBuddyPartAction } from "../actions.ts";

// The id of the form that resets this part, outside the form that saves the
// parts, since forms don't nest.
function resetFormId(key: BuddyPartKey): string {
  return `reset-${key}`;
}

// What the part does, for a part of the system prompt that {{name}} becomes
// her name, and for a mechanics part, what an edit can break.
function partHint(key: BuddyPartKey): string {
  const hint = [BUDDY_PARTS_COPY[key].help];
  if (SYSTEM_PROMPT_PARTS.has(key)) {
    hint.push(BUDDY_COPY.namePlaceholderHint);
  }
  if (isMechanicsPart(key)) {
    hint.push(BUDDY_COPY.mechanicsWarning);
  }
  return hint.join(" ");
}

// Skill switches hide their editors independently of prompt mechanics.
// Hidden fields stay in the form, so switching a skill off retains its text.
// "persona-mechanics" is a stored flag id, kept through the buddy rename.
function partTag(key: BuddyPartKey): ReturnType<typeof extraTag> | object {
  const skillFlag = BUDDY_SKILL_FLAGS[key];
  switch (skillFlag) {
    case "brainstorming":
      return extraTag("brainstorming");
    case "project-breakdown":
      return extraTag("project-breakdown");
    default:
      break;
  }
  if (isMechanicsPart(key)) {
    return extraTag("persona-mechanics");
  }
  return {};
}

// The name field of her own buddy.
export function NameField({ name }: { readonly name: string }): JSX.Element {
  return (
    <TextField
      defaultValue={name}
      label={BUDDY_COPY.nameLabel}
      name="name"
      required={true}
    />
  );
}

// Every part of a buddy as a labelled textarea, in the page's order. Each
// part of her own buddy is a field of the form around it, with a button
// that resets the part through its own form (ResetPartForms); a built-in
// buddy's parts are read-only. A mechanics part is the persona-mechanics
// extra: hidden by display only, so its field is still saved unchanged.
export function PartFields({
  parts,
  editable,
}: {
  readonly parts: BuddyParts;
  readonly editable: boolean;
}): JSX.Element {
  return (
    <div className="panel flex flex-col gap-6">
      {BUDDY_PART_KEYS.map((key) => (
        <div className="flex flex-col gap-2" key={key} {...partTag(key)}>
          <TextAreaField
            className="min-h-40 font-mono text-sm"
            defaultValue={parts[key]}
            hint={partHint(key)}
            label={BUDDY_PARTS_COPY[key].label}
            name={key}
            readOnly={!editable}
          />
          {editable === true && (
            <Button
              aria-label={BUDDY_COPY.resetLabel(BUDDY_PARTS_COPY[key].label)}
              className="self-start"
              form={resetFormId(key)}
              type="submit"
              variant="quiet"
            >
              {BUDDY_COPY.reset}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// The forms that reset each part of her buddy, which PartFields' buttons
// submit. They show nothing.
export function ResetPartForms({
  buddyId,
}: {
  readonly buddyId: string;
}): JSX.Element {
  return (
    <div hidden={true}>
      {BUDDY_PART_KEYS.map((key) => (
        <form action={resetBuddyPartAction} id={resetFormId(key)} key={key}>
          <input name="buddyId" type="hidden" value={buddyId} />
          <input name="part" type="hidden" value={key} />
        </form>
      ))}
    </div>
  );
}
