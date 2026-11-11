"use client";

import Link from "next/link";
import {
  type JSX,
  type SubmitEvent,
  startTransition,
  useActionState,
  useId,
} from "react";
import {
  type StartQuestState,
  startQuestAction,
} from "@/app/(workspace)/projects/actions.ts";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { FormDialog } from "@/components/form-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { type ConstructId, isConstructId } from "@/constructs/index.ts";
import type { OwnPromptId, ProjectId } from "@/ids.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuest,
  type PremadeQuestId,
  type QuestStartPreset,
} from "@/projects/premade-quests.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { PROJECTS_COPY, QUEST_START_COPY } from "@/ui/copy/projects.ts";

const IDLE: StartQuestState = { kind: "idle" };

const NO_PRESET: QuestStartPreset = {};

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

// The construct to show first: the preset's, if it is one the user can
// choose, or else their New quest preference.
function presetConstructId(
  choices: QuestCreationChoices,
  { constructId }: QuestStartPreset,
): ConstructId | OwnPromptId {
  if (constructId !== undefined && isConstructId(constructId)) {
    return constructId;
  }
  return (
    choices.userConstructs.find(({ id }) => id === constructId)?.id ??
    choices.preferredConstructId
  );
}

// A starting point's details, ready to edit: its name, its starting
// Journal and who to work with. Its activity rides along unseen; the
// construct can change it later in the conversation.
function QuestStartForm({
  quest,
  choices,
  preset,
}: {
  readonly quest: PremadeQuest;
  readonly choices: QuestCreationChoices;
  readonly preset: QuestStartPreset;
}): JSX.Element {
  const [state, action, pending] = useActionState(startQuestAction, IDLE);
  const onSubmit = submitQuest.bind(null, pending, action);
  let status = "";
  if (pending) {
    status = QUEST_START_COPY.starting;
  }
  const defaultConstructId = presetConstructId(choices, preset);
  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <p className="text-muted">{quest.description}</p>
      <input type="hidden" name="premadeId" value={quest.id} />
      <input
        type="hidden"
        name="activityId"
        value={preset.activityId ?? quest.activityId}
      />
      <TextField
        label={PROJECTS_COPY.nameLabel}
        name="name"
        defaultValue={preset.name ?? quest.name}
        maxLength={PROJECT_NAME_MAX_LENGTH}
        required={true}
      />
      <TextAreaField
        label={QUEST_START_COPY.journalLabel}
        hint={QUEST_START_COPY.journalHint}
        name="journal"
        defaultValue={preset.journal ?? quest.journal}
        rows={8}
      />
      <ConstructPicker
        defaultConstructId={defaultConstructId}
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
          {QUEST_START_COPY.start}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}

// One starting point as a card: what it is and the button that opens its
// details. The user's Dailies quest, once it exists, opens directly.
function QuestStartCard({
  quest,
  choices,
  preset,
  open,
  dailiesId,
}: {
  readonly quest: PremadeQuest;
  readonly choices: QuestCreationChoices;
  readonly preset: QuestStartPreset;
  readonly open: boolean;
  readonly dailiesId: ProjectId | undefined;
}): JSX.Element {
  return (
    <li className="card flex min-w-0 flex-col items-start gap-3">
      <h3 className="card-title">{quest.name}</h3>
      <p className="text-muted">{quest.description}</p>
      {quest.id === "dailies" && dailiesId !== undefined && (
        <Button asChild={true} variant="secondary">
          <Link href={`/projects/${dailiesId}`}>
            {QUEST_START_COPY.openDailies}
          </Link>
        </Button>
      )}
      {(quest.id !== "dailies" || dailiesId === undefined) && (
        <FormDialog
          title={quest.name}
          closeLabel={QUEST_START_COPY.close}
          defaultOpen={open}
          trigger={
            <Button
              variant="secondary"
              aria-label={QUEST_START_COPY.chooseLabel(quest.name)}
            >
              {QUEST_START_COPY.choose}
            </Button>
          }
        >
          <QuestStartForm quest={quest} choices={choices} preset={preset} />
        </FormDialog>
      )}
    </li>
  );
}

// The four ways to start a quest: Dailies, Learn a thing, Make a thing and
// Do a thing. Choosing one opens its details, already filled in, to edit
// or start as they are; preset fills in what the page starting it already
// knows, such as an activity or a Chat's summary, and initialChoice opens
// that one's details at once. A preset Journal is a goal of its own, so
// Dailies, the user's one ongoing quest, isn't offered with one.
// dailiesId is the user's Dailies quest, if they have one, which its card
// opens instead. Looking and closing create nothing and spend nothing.
function QuestStartChoices({
  choices,
  preset = NO_PRESET,
  initialChoice,
  dailiesId,
}: {
  readonly choices: QuestCreationChoices;
  readonly preset?: QuestStartPreset;
  readonly initialChoice?: PremadeQuestId | undefined;
  readonly dailiesId?: ProjectId | undefined;
}): JSX.Element {
  const headingId = useId();
  const offered = PREMADE_QUESTS.filter(
    (quest) => quest.id !== "dailies" || preset.journal === undefined,
  );
  return (
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      <h2 className="section-heading" id={headingId}>
        {QUEST_START_COPY.heading}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {offered.map((quest) => (
          <QuestStartCard
            key={quest.id}
            quest={quest}
            choices={choices}
            preset={preset}
            open={quest.id === initialChoice}
            dailiesId={dailiesId}
          />
        ))}
      </ul>
    </section>
  );
}

export { QuestStartChoices };
