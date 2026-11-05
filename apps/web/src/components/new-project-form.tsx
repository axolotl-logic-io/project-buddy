"use client";

// Suspense is read off React's default export: Biome doesn't resolve it as a
// named import, since @types/react declares it without `export`.
import React, { type JSX, use, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import { type ConstructId, DEFAULT_CONSTRUCT_ID } from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// The name and construct the form shows chosen: theirs, again, when the name
// was refused or Claude couldn't start the project, since React clears the
// form once the action ends; otherwise no name and the default construct.
function choicesToShow(state: CreateProjectState): {
  name: string;
  constructId: ConstructId | OwnPromptId;
} {
  if (state.kind === "claudeUnavailable" || state.kind === "invalidName") {
    const { name, constructId } = state;
    return { name, constructId };
  }
  return { name: "", constructId: DEFAULT_CONSTRUCT_ID };
}

// The picker with her own constructs after the built-in ones, once they have
// loaded.
function PickerWithOwnConstructs({
  userConstructs,
  constructId,
}: {
  userConstructs: Promise<readonly OwnConstructChoice[]>;
  constructId: ConstructId | OwnPromptId;
}): JSX.Element {
  return (
    <ConstructPicker
      defaultConstructId={constructId}
      label={PROJECTS_COPY.constructLabel}
      userConstructs={use(userConstructs)}
    />
  );
}

// The new-project form, with its construct picker for the interview.
// userConstructs are her own constructs, offered after the built-in ones once
// they load.
export function NewProjectForm({
  userConstructs,
}: {
  userConstructs: Promise<readonly OwnConstructChoice[]>;
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
  const { name, constructId } = choicesToShow(state);
  let nameError: string | undefined;
  if (state.kind === "invalidName") {
    ({ message: nameError } = state);
  }
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        defaultValue={name}
        error={nameError}
        label={PROJECTS_COPY.nameLabel}
        maxLength={PROJECT_NAME_MAX_LENGTH}
        name="name"
        required={true}
        type="text"
      />
      {/* The construct picker goes back to its first choice when the form is
          reset, so it is mounted again for each choice to show. */}
      <React.Suspense
        fallback={
          <ConstructPicker
            defaultConstructId={constructId}
            key={constructId}
            label={PROJECTS_COPY.constructLabel}
          />
        }
      >
        <PickerWithOwnConstructs
          key={constructId}
          constructId={constructId}
          userConstructs={userConstructs}
        />
      </React.Suspense>
      {state.kind !== "idle" && state.kind !== "invalidName" && (
        <Alert>
          <span>{state.message}</span>
          {state.kind === "outOfGold" && <EarnGoldLink />}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {PROJECTS_COPY.create}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
