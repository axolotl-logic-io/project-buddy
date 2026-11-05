"use client";

import { type JSX, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// A new quest starts with the account's interview construct.
export function NewProjectForm(): JSX.Element {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    IDLE,
  );
  // The status line, empty except while the project is being created.
  let status = "";
  if (pending) {
    status = PROJECTS_COPY.creating;
  }
  let name = "";
  let motivation = "";
  if (state.kind === "claudeUnavailable" || state.kind === "invalidName") {
    ({ name, motivation } = state);
  }
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
      <TextAreaField
        defaultValue={motivation}
        label={PROJECTS_COPY.motivationLabel}
        hint={PROJECTS_COPY.motivationHint}
        name="motivation"
        rows={3}
      />
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
