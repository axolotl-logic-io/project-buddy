"use client";

import { type JSX, useActionState } from "react";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import { PersonaPicker } from "@/components/persona-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const IDLE: StartChatState = { kind: "idle" };

// The project and persona the form shows chosen: hers, again, when Claude
// couldn't start the chat, since React clears the form once the action ends;
// otherwise the given project and the default persona.
function choicesToShow(
  state: StartChatState,
  selectedProjectId: ProjectId | undefined,
): { projectId: ProjectId | undefined; personaId: PersonaId } {
  if (state.kind === "claudeUnavailable") {
    const { projectId, personaId } = state;
    return { projectId, personaId };
  }
  return { projectId: selectedProjectId, personaId: DEFAULT_PERSONA_ID };
}

export function NewChatForm({
  projects,
  selectedProjectId,
}: {
  projects: Project[];
  selectedProjectId?: ProjectId | undefined;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(startChatAction, IDLE);
  // The status line, empty except while the chat is being started, which
  // waits for the tutor's opening.
  let status = "";
  if (pending) {
    status = COPY.newChat.starting;
  }
  const { projectId, personaId } = choicesToShow(state, selectedProjectId);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* React ignores a changed defaultValue on a mounted select, and the
          persona picker goes back to its first choice when the form is
          reset, so each is mounted again for a new one. */}
      <SelectField
        defaultValue={projectId}
        key={projectId}
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
      <PersonaPicker defaultPersonaId={personaId} key={personaId} />
      {state.kind !== "idle" && <Alert>{state.message}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {COPY.newChat.start}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
