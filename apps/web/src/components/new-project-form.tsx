"use client";

// Suspense is read off React's default export: Biome doesn't resolve it as a
// named import, since @types/react declares it without `export`.
import React, { type JSX, use, useActionState } from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { PersonaPicker } from "@/components/persona-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { extraTag } from "@/flags/flags.ts";
import type { UserPersonaId } from "@/ids.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";
import type { OwnPersonaChoice } from "@/personas/persona-store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// The name and persona the form shows chosen: hers, again, when Claude
// couldn't start the project, since React clears the form once the action
// ends; otherwise no name and the default persona.
function choicesToShow(state: CreateProjectState): {
  name: string;
  personaId: PersonaId | UserPersonaId;
} {
  if (state.kind === "claudeUnavailable") {
    const { name, personaId } = state;
    return { name, personaId };
  }
  return { name: "", personaId: DEFAULT_PERSONA_ID };
}

// The picker with her own personas after the built-in ones, once they have
// loaded.
function PickerWithOwnPersonas({
  userPersonas,
  personaId,
}: {
  userPersonas: Promise<readonly OwnPersonaChoice[]>;
  personaId: PersonaId | UserPersonaId;
}): JSX.Element {
  return (
    <PersonaPicker
      defaultPersonaId={personaId}
      label={PROJECTS_COPY.personaLabel}
      userPersonas={use(userPersonas)}
    />
  );
}

// The new-project form, with its persona picker for the interview, which the
// interview-persona extra shows; hidden, the picker still sends the default
// persona. userPersonas are her own personas, offered after the built-in
// ones once they load.
export function NewProjectForm({
  userPersonas,
}: {
  userPersonas: Promise<readonly OwnPersonaChoice[]>;
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
  const { name, personaId } = choicesToShow(state);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        defaultValue={name}
        label={PROJECTS_COPY.nameLabel}
        name="name"
        required={true}
        type="text"
      />
      {/* The persona picker goes back to its first choice when the form is
          reset, so it is mounted again for each choice to show. */}
      <div {...extraTag("interview-persona")}>
        <React.Suspense
          fallback={
            <PersonaPicker
              defaultPersonaId={personaId}
              key={personaId}
              label={PROJECTS_COPY.personaLabel}
            />
          }
        >
          <PickerWithOwnPersonas
            key={personaId}
            personaId={personaId}
            userPersonas={userPersonas}
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
