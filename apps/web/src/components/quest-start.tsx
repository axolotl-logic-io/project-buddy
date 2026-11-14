"use client";

import Link from "next/link";
import {
  type ComponentProps,
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
} from "@/app/(workspace)/quests/actions.ts";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { FormDialog } from "@/components/form-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { type ConstructId, isConstructId } from "@/constructs/index.ts";
import type { OwnPromptId, QuestId } from "@/ids.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuest,
  type PremadeQuestId,
  type QuestStartPreset,
} from "@/quests/premade-quests.ts";
import type { QuestCreationChoices } from "@/quests/quest-creation-choices.ts";
import { QUEST_START_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

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

// Starts the selected quest with a construct and, except for Dailies,
// optional Why. Its name and starting context come from the starting
// point or Chat's preset.
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
      <ConstructPicker
        defaultConstructId={defaultConstructId}
        userConstructs={choices.userConstructs}
      />
      {quest.id !== "dailies" && (
        <TextAreaField
          label={QUESTS_COPY.motivationLabel}
          hint={QUESTS_COPY.motivationHint}
          name="motivation"
          rows={3}
        />
      )}
      <input type="hidden" name="name" value={preset.name ?? quest.name} />
      <input
        type="hidden"
        name="context"
        value={preset.context ?? quest.context}
      />
      {state.kind !== "idle" && (
        <Alert>
          <span>{state.message}</span>
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

// The icon each starting point's tile shows beside its name.
const START_ICONS: Readonly<
  Record<PremadeQuestId, ComponentProps<typeof Icon>["name"]>
> = {
  dailies: "sun",
  learn: "book",
  make: "pencil",
  do: "flag",
};

// What a tile shows: its icon, the starting point's name, which names the
// tile, and its one-line tagline, which describes it.
function QuestStartTileFace({
  quest,
  nameId,
  taglineId,
}: {
  readonly quest: PremadeQuest;
  readonly nameId: string;
  readonly taglineId: string;
}): JSX.Element {
  return (
    <>
      <Icon className="text-primary" name={START_ICONS[quest.id]} />
      <span className="card-title" id={nameId}>
        {quest.name}
      </span>
      <span className="text-muted text-sm" id={taglineId}>
        {quest.tagline}
      </span>
    </>
  );
}

// One starting point as a single target, opening its form in the chosen
// presentation. The user's existing Dailies opens directly.
function QuestStartTile({
  quest,
  dailiesId,
  onChoose,
  choices,
  preset,
  presentation,
}: {
  readonly quest: PremadeQuest;
  readonly dailiesId: QuestId | undefined;
  readonly onChoose: (id: PremadeQuestId) => void;
  readonly choices: QuestCreationChoices;
  readonly preset: QuestStartPreset;
  readonly presentation: "dialog" | "inline";
}): JSX.Element {
  const { id } = quest;
  const nameId = useId();
  const taglineId = useId();
  const choose = useCallback((): void => {
    onChoose(id);
  }, [onChoose, id]);
  const face = (
    <QuestStartTileFace quest={quest} nameId={nameId} taglineId={taglineId} />
  );
  if (id === "dailies" && dailiesId !== undefined) {
    return (
      <li>
        <Link
          aria-describedby={taglineId}
          aria-labelledby={nameId}
          className="quest-start-tile"
          href={`/quests/${dailiesId}`}
        >
          {face}
        </Link>
      </li>
    );
  }
  if (presentation === "dialog") {
    return (
      <li>
        <FormDialog
          title={quest.name}
          closeLabel={QUEST_START_COPY.close}
          trigger={
            <button
              aria-describedby={taglineId}
              aria-labelledby={nameId}
              className="quest-start-tile"
              type="button"
            >
              {face}
            </button>
          }
        >
          <QuestStartForm quest={quest} choices={choices} preset={preset} />
        </FormDialog>
      </li>
    );
  }
  return (
    <li>
      <button
        aria-describedby={taglineId}
        aria-labelledby={nameId}
        className="quest-start-tile"
        onClick={choose}
        type="button"
      >
        {face}
      </button>
    </li>
  );
}

// Starting points open a form dialog by default. Inside Chat's existing
// dialog, inline presentation keeps the choice and form in that dialog.
// Presets carry the Chat's summary; Dailies isn't offered with one.
// An existing Dailies opens directly. Browsing and cancelling save nothing.
function QuestStartChoices({
  choices,
  preset = NO_PRESET,
  initialChoice,
  dailiesId,
  presentation = "dialog",
}: {
  readonly choices: QuestCreationChoices;
  readonly preset?: QuestStartPreset;
  readonly presentation?: "dialog" | "inline";
  readonly initialChoice?: PremadeQuestId | undefined;
  readonly dailiesId?: QuestId | undefined;
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
    (quest) => quest.id !== "dailies" || preset.context === undefined,
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
    <section className="quest-start" aria-labelledby={headingId}>
      <h2
        className="section-heading"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        {QUEST_START_COPY.heading}
      </h2>
      <ul className="quest-start-tiles">
        {offered.map((offering) => (
          <QuestStartTile
            key={offering.id}
            quest={offering}
            dailiesId={dailiesId}
            onChoose={show}
            choices={choices}
            preset={preset}
            presentation={presentation}
          />
        ))}
      </ul>
    </section>
  );
}

export { QuestStartChoices };
