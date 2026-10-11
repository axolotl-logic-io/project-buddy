"use client";

import { type JSX, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { COPY } from "@/ui/copy.ts";

const IDLE: CreateProjectState = { kind: "idle" };

export function NewProjectForm(): JSX.Element {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    IDLE,
  );
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-medium">{COPY.projects.nameLabel}</span>
          <input
            className="rounded border border-line px-2 py-1"
            name="name"
            required={true}
            type="text"
          />
        </label>
        <button className="button-primary" disabled={pending} type="submit">
          {COPY.projects.create}
        </button>
      </div>
      {state.kind === "invalid" && (
        <p className="error-text" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
