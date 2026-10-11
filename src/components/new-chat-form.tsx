"use client";

import { type JSX, useActionState } from "react";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import { PersonaPicker } from "@/components/persona-picker.tsx";
import type { ProjectId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const IDLE: StartChatState = { kind: "idle" };

export function NewChatForm({
  projects,
  selectedProjectId,
}: {
  projects: Project[];
  selectedProjectId?: ProjectId | undefined;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(startChatAction, IDLE);
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="font-medium">{COPY.newChat.projectLabel}</span>
        <select
          className="input-field"
          defaultValue={selectedProjectId}
          name="projectId"
          required={true}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <PersonaPicker />
      {state.kind === "invalid" && (
        <p className="error-text" role="alert">
          {state.message}
        </p>
      )}
      <button
        className="button-primary self-start"
        disabled={pending}
        type="submit"
      >
        {COPY.newChat.start}
      </button>
    </form>
  );
}
