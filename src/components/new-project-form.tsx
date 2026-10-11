"use client";

import { type JSX, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { PersonaPicker } from "@/components/persona-picker.tsx";
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
    status = COPY.interview.creating;
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-medium">{COPY.projects.nameLabel}</span>
        <input
          className="rounded border border-line px-2 py-1"
          name="name"
          required={true}
          type="text"
        />
      </label>
      <PersonaPicker />
      {state.kind === "invalid" && (
        <p className="error-text" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button className="button-primary" disabled={pending} type="submit">
          {COPY.projects.create}
        </button>
        <p role="status">{status}</p>
      </div>
    </form>
  );
}
