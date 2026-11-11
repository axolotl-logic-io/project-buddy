"use client";

import Link from "next/link";
import {
  type JSX,
  type SubmitEvent,
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  type StartQuestState,
  startQuestAction,
} from "@/app/(workspace)/projects/actions.ts";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
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
// Journal and who to work with. The server gives it the starting point's
// activity, which the construct can change later in the conversation.
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

// One starting point as a card: what it is and the button that shows its
// details. The user's Dailies quest, once it exists, opens directly.
function QuestStartCard({
  quest,
  dailiesId,
  onChoose,
}: {
  readonly quest: PremadeQuest;
  readonly dailiesId: ProjectId | undefined;
  readonly onChoose: (id: PremadeQuestId) => void;
}): JSX.Element {
  const { id } = quest;
  const choose = useCallback((): void => {
    onChoose(id);
  }, [onChoose, id]);
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
        <Button
          aria-label={QUEST_START_COPY.chooseLabel(quest.name)}
          onClick={choose}
          variant="secondary"
        >
          {QUEST_START_COPY.choose}
        </Button>
      )}
    </li>
  );
}

// The four ways to start a quest: Dailies, Learn a thing, Make a thing and
// Do a thing. Choosing one shows its details in their place, already filled
// in, to edit or start as they are; Back shows the four again. It opens no
// dialog of its own, so a page can hold it in one. preset fills in what the
// page starting it already knows, such as a construct or a Chat's summary,
// and initialChoice shows that one's details at once. A preset Journal is a
// goal of its own, so Dailies, the user's one ongoing quest, isn't offered
// with one. dailiesId is the user's Dailies quest, if they have one, which
// its card opens instead. Looking and going back create nothing and spend
// nothing.
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [chosen, setChosen] = useState(initialChoice);
  // Whether the next render follows a choice, whose heading takes focus.
  const focusHeadingRef = useRef<boolean>(false);
  useEffect(() => {
    if (focusHeadingRef.current) {
      focusHeadingRef.current = false;
      headingRef.current?.focus();
    }
  });
  const show = useCallback((id: PremadeQuestId | undefined): void => {
    focusHeadingRef.current = true;
    setChosen(id);
  }, []);
  const back = useCallback((): void => {
    show(undefined);
  }, [show]);
  const offered = PREMADE_QUESTS.filter(
    (quest) => quest.id !== "dailies" || preset.journal === undefined,
  );
  const shown = offered.find(({ id }) => id === chosen);
  if (shown !== undefined) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby={headingId}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            className="section-heading"
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
          >
            {shown.name}
          </h2>
          <Button onClick={back} variant="quiet">
            <Icon name="arrow-left" />
            {QUEST_START_COPY.back}
          </Button>
        </div>
        <QuestStartForm quest={shown} choices={choices} preset={preset} />
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      <h2
        className="section-heading"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        {QUEST_START_COPY.heading}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {offered.map((offering) => (
          <QuestStartCard
            key={offering.id}
            quest={offering}
            dailiesId={dailiesId}
            onChoose={show}
          />
        ))}
      </ul>
    </section>
  );
}

export { QuestStartChoices };
