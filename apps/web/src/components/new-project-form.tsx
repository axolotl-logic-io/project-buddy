"use client";

import { Dialog } from "radix-ui";
import {
  type JSX,
  type SubmitEvent,
  startTransition,
  useActionState,
} from "react";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// Manual dispatch keeps the entered reason and picker selection after failures.
function submitQuest(
  pending: boolean,
  start: (data: FormData) => void,
  event: SubmitEvent<HTMLFormElement>,
): void {
  event.preventDefault();
  if (pending) {
    return;
  }
  const data = new FormData(event.currentTarget);
  startTransition(() => start(data));
}

export function NewProjectForm({
  choices,
  cancel = false,
}: {
  readonly choices?: QuestCreationChoices | undefined;
  readonly cancel?: boolean;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    IDLE,
  );
  const onSubmit = submitQuest.bind(null, pending, formAction);
  let status = "";
  if (pending) {
    status = PROJECTS_COPY.creating;
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <ConstructPicker
        defaultConstructId={choices?.preferredConstructId ?? "vellum"}
        userConstructs={choices?.userConstructs ?? []}
        hint={PROJECTS_COPY.constructHint}
      />
      <TextAreaField
        label={PROJECTS_COPY.whyLabel}
        hint={PROJECTS_COPY.motivationHint}
        name="motivation"
        rows={3}
      />
      {state.kind !== "idle" && (
        <Alert>
          <span>{state.message}</span>
          {state.kind === "outOfGold" && <EarnGoldLink />}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {PROJECTS_COPY.create}
        </Button>
        {cancel === true && (
          <Dialog.Close asChild={true}>
            <Button type="button" variant="secondary">
              {PROJECTS_COPY.cancel}
            </Button>
          </Dialog.Close>
        )}
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
