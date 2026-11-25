"use client";

import {
  type JSX,
  type SubmitEvent,
  startTransition,
  useActionState,
} from "react";
import {
  type StartQuestState,
  startQuestAction,
} from "@/app/(workspace)/quests/actions.ts";
import { FormDialog } from "@/components/form-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { NEW_QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

const IDLE: StartQuestState = { kind: "idle" };

// Manual dispatch keeps every field as the user left it on failure.
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

// A new quest's name and the user's optional Why. Starting it opens it.
function NewQuestForm(): JSX.Element {
  const [state, action, pending] = useActionState(startQuestAction, IDLE);
  const onSubmit = submitQuest.bind(null, pending, action);
  let status = "";
  if (pending) {
    status = NEW_QUEST_COPY.starting;
  }
  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <TextField
        autoComplete="off"
        label={NEW_QUEST_COPY.nameLabel}
        maxLength={QUEST_NAME_MAX_LENGTH}
        name="name"
        required={true}
      />
      <TextAreaField
        label={QUESTS_COPY.motivationLabel}
        hint={QUESTS_COPY.motivationHint}
        name="motivation"
        rows={3}
      />
      {state.kind !== "idle" && (
        <Alert>
          <span>{state.message}</span>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button aria-busy={pending} disabled={pending} type="submit">
          {NEW_QUEST_COPY.start}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}

// New quest, at the end of Quests' trail band, and its dialog. Opening
// and closing it starts nothing; only its form does.
function NewQuest(): JSX.Element {
  return (
    <div className="new-quest-trail-tools">
      <FormDialog
        title={NEW_QUEST_COPY.title}
        closeLabel={NEW_QUEST_COPY.close}
        trigger={
          <Button>
            <Icon name="plus" />
            <span className="new-quest-label">{NEW_QUEST_COPY.open}</span>
          </Button>
        }
      >
        <NewQuestForm />
      </FormDialog>
    </div>
  );
}

export { NewQuest };
