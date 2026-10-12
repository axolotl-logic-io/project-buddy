"use client";

import { type JSX, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// The name she sent, shown again when Claude couldn't start the project:
// React clears the form once the action ends.
function nameToShow(state: CreateProjectState): string {
  if (state.kind === "claudeUnavailable") {
    const { name } = state;
    return name;
  }
  return "";
}

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
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        defaultValue={nameToShow(state)}
        label={PROJECTS_COPY.nameLabel}
        name="name"
        required={true}
        type="text"
      />
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
