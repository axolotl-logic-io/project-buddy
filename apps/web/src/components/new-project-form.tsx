"use client";

// Suspense is read off React's default export: Biome doesn't resolve it as a
// named import, since @types/react declares it without `export`.
import React, { type JSX, use, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { type BuddyId, DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { BuddyPicker } from "@/components/buddy-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { extraTag } from "@/flags/flags.ts";
import type { UserBuddyId } from "@/ids.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// The name and buddy the form shows chosen: hers, again, when Claude
// couldn't start the project, since React clears the form once the action
// ends; otherwise no name and the default buddy.
function choicesToShow(state: CreateProjectState): {
  name: string;
  buddyId: BuddyId | UserBuddyId;
} {
  if (state.kind === "claudeUnavailable") {
    const { name, buddyId } = state;
    return { name, buddyId };
  }
  return { name: "", buddyId: DEFAULT_BUDDY_ID };
}

// The picker with her own buddies after the built-in ones, once they have
// loaded.
function PickerWithOwnBuddies({
  userBuddies,
  buddyId,
}: {
  userBuddies: Promise<readonly OwnBuddyChoice[]>;
  buddyId: BuddyId | UserBuddyId;
}): JSX.Element {
  return (
    <BuddyPicker
      defaultBuddyId={buddyId}
      label={PROJECTS_COPY.buddyLabel}
      userBuddies={use(userBuddies)}
    />
  );
}

// The new-project form, with its buddy picker for the interview, which the
// interview-persona extra shows; hidden, the picker still sends the default
// buddy. userBuddies are her own buddies, offered after the built-in
// ones once they load. "interview-persona" is a stored flag id (cookie and
// account data), kept through the buddy rename (#116).
export function NewProjectForm({
  userBuddies,
}: {
  userBuddies: Promise<readonly OwnBuddyChoice[]>;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    IDLE,
  );
  // The status line, empty except while the project is being created.
  let status = "";
  if (pending) {
    status = PROJECTS_COPY.creating;
  }
  const { name, buddyId } = choicesToShow(state);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        defaultValue={name}
        label={PROJECTS_COPY.nameLabel}
        name="name"
        required={true}
        type="text"
      />
      {/* The buddy picker goes back to its first choice when the form is
          reset, so it is mounted again for each choice to show. */}
      <div {...extraTag("interview-persona")}>
        <React.Suspense
          fallback={
            <BuddyPicker
              defaultBuddyId={buddyId}
              key={buddyId}
              label={PROJECTS_COPY.buddyLabel}
            />
          }
        >
          <PickerWithOwnBuddies
            key={buddyId}
            buddyId={buddyId}
            userBuddies={userBuddies}
          />
        </React.Suspense>
      </div>
      {state.kind !== "idle" && <Alert>{state.message}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {PROJECTS_COPY.create}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
