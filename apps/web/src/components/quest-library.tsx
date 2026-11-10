"use client";

import {
  type JSX,
  type SubmitEvent,
  startTransition,
  useActionState,
  useId,
} from "react";
import {
  type PremadeQuestState,
  startPremadeQuestAction,
} from "@/app/(workspace)/projects/premade-actions.ts";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { FormDialog } from "@/components/form-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import {
  PREMADE_QUESTS,
  type PremadeQuest,
} from "@/projects/premade-quests.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { PROJECTS_COPY, QUEST_LIBRARY_COPY } from "@/ui/copy/projects.ts";

const IDLE: PremadeQuestState = { kind: "idle" };

// Manual dispatch preserves every field on failure.
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

function PremadeQuestForm({
  quest,
  choices,
}: {
  readonly quest: PremadeQuest;
  readonly choices: QuestCreationChoices;
}): JSX.Element {
  const [state, action, pending] = useActionState(
    startPremadeQuestAction,
    IDLE,
  );
  const onSubmit = submitQuest.bind(null, pending, action);
  let status = "";
  if (pending) {
    status = PROJECTS_COPY.creating;
  }
  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <p className="text-muted">{quest.description}</p>
      <TextField
        label={PROJECTS_COPY.nameLabel}
        name="name"
        defaultValue={quest.name}
        maxLength={PROJECT_NAME_MAX_LENGTH}
        required={true}
      />
      <TextAreaField
        label={QUEST_LIBRARY_COPY.journalLabel}
        hint={QUEST_LIBRARY_COPY.journalHint}
        name="journal"
        defaultValue={quest.journal}
        rows={12}
      />
      <TextAreaField
        label={PROJECTS_COPY.motivationLabel}
        hint={PROJECTS_COPY.motivationHint}
        name="motivation"
        rows={3}
      />
      <SelectField
        label={QUEST_LIBRARY_COPY.activityLabel}
        name="activityId"
        defaultValue={quest.activityId}
      >
        {choices.activities.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </SelectField>
      <ConstructPicker
        defaultConstructId={choices.preferredConstructId}
        userConstructs={choices.userConstructs}
      />
      {state.kind !== "idle" && (
        <Alert>
          <span>{state.message}</span>
          {state.kind === "outOfGold" && <EarnGoldLink />}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {QUEST_LIBRARY_COPY.start}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}

function PremadeQuestPreview({
  quest,
  choices,
}: {
  readonly quest: PremadeQuest;
  readonly choices: QuestCreationChoices;
}): JSX.Element {
  return (
    <FormDialog
      title={quest.name}
      closeLabel={PROJECTS_COPY.closeNewProject}
      trigger={
        <Button
          variant="secondary"
          aria-label={QUEST_LIBRARY_COPY.exploreLabel(quest.name)}
        >
          {QUEST_LIBRARY_COPY.explore}
        </Button>
      }
    >
      <PremadeQuestForm quest={quest} choices={choices} />
    </FormDialog>
  );
}

function QuestLibrary({
  choices,
}: {
  readonly choices: QuestCreationChoices;
}): JSX.Element {
  const headingId = useId();
  return (
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      <h2 className="sr-only" id={headingId}>
        {QUEST_LIBRARY_COPY.heading}
      </h2>
      <p className="text-muted">{QUEST_LIBRARY_COPY.intro}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PREMADE_QUESTS.map((quest) => (
          <li
            className="card flex min-w-0 flex-col items-start gap-3"
            key={quest.id}
          >
            <h3 className="card-title">{quest.name}</h3>
            <p className="text-muted">{quest.description}</p>
            <PremadeQuestPreview quest={quest} choices={choices} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActivityQuestEntry({
  activityId,
  choices,
}: {
  readonly activityId: string;
  readonly choices: QuestCreationChoices;
}): JSX.Element | null {
  const quest = PREMADE_QUESTS.find(
    (offering) => offering.activityId === activityId,
  );
  if (activityId !== "find-something-to-make" || quest === undefined) {
    return null;
  }
  return (
    <div className="activity-quest-entry">
      <h3 className="card-title">{quest.name}</h3>
      <p className="text-muted">{QUEST_LIBRARY_COPY.activityIntro}</p>
      <PremadeQuestPreview quest={quest} choices={choices} />
    </div>
  );
}

export { ActivityQuestEntry, PremadeQuestPreview, QuestLibrary };
