"use client";

import { type JSX, useActionState } from "react";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import { PersonaPicker } from "@/components/persona-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import { FormAlert } from "@/components/ui/form-message.tsx";
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
    <form action={formAction} className="flex flex-col gap-5">
      <SelectField
        defaultValue={selectedProjectId}
        label={COPY.newChat.projectLabel}
        name="projectId"
        required={true}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </SelectField>
      <PersonaPicker />
      {state.kind === "invalid" && <FormAlert>{state.message}</FormAlert>}
      <Button className="self-start" disabled={pending} type="submit">
        {COPY.newChat.start}
      </Button>
    </form>
  );
}
