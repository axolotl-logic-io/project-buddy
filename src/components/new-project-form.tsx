"use client";

import { type JSX, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { COPY } from "@/ui/copy.ts";

const IDLE: CreateProjectState = { kind: "idle" };

export function NewProjectForm(): JSX.Element {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    IDLE,
  );
  // The status line, empty except while the project is being created.
  let status = "";
  if (pending) {
    status = COPY.projects.creating;
  }
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        label={COPY.projects.nameLabel}
        name="name"
        required={true}
        type="text"
      />
      {state.kind === "invalid" && <Alert>{state.message}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {COPY.projects.create}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
