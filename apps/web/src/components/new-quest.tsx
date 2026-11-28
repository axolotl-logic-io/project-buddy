"use client";

import { unstable_rethrow } from "next/navigation";
import {
  type JSX,
  type SubmitEvent,
  startTransition,
  useCallback,
  useState,
} from "react";
import { startQuestAction } from "@/app/(stream)/(site)/(workspace)/quests/actions.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { FormDialog } from "@/components/form-dialog.tsx";
import {
  type PendingPage,
  useShowPage,
} from "@/components/pending-page-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { QuestFrame } from "@/components/ui/page-frame.tsx";
import { QUEST_ID } from "@/ids.ts";
import {
  checkQuestName,
  QUEST_NAME_MAX_LENGTH,
  type QuestName,
} from "@/quests/quest-name.ts";
import { NEW_QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

// What the user entered in the dialog.
interface Entered {
  readonly name: string;
  readonly motivation: string;
}

const NOTHING_ENTERED: Entered = { name: "", motivation: "" };

// Whether the action's error is Next's own answer, such as the redirect
// that opens the started quest, which the router has already followed.
function answeredByNext(error: unknown): boolean {
  try {
    unstable_rethrow(error);
  } catch {
    return true;
  }
  return false;
}

// A new quest's name and the user's optional Why, as last entered, and why
// the last start was refused.
function NewQuestForm({
  entered,
  problem,
  onStart,
}: {
  readonly entered: Entered;
  readonly problem: string | undefined;
  readonly onStart: (entered: Entered) => void;
}): JSX.Element {
  const start = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      onStart({
        name: String(data.get("name") ?? ""),
        motivation: String(data.get("motivation") ?? ""),
      });
    },
    [onStart],
  );
  return (
    <form className="flex flex-col gap-5" onSubmit={start}>
      <TextField
        autoComplete="off"
        defaultValue={entered.name}
        label={NEW_QUEST_COPY.nameLabel}
        maxLength={QUEST_NAME_MAX_LENGTH}
        name="name"
        required={true}
      />
      <TextAreaField
        defaultValue={entered.motivation}
        label={QUESTS_COPY.motivationLabel}
        hint={QUESTS_COPY.motivationHint}
        name="motivation"
        rows={3}
      />
      {problem !== undefined && (
        <Alert>
          <span>{problem}</span>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{NEW_QUEST_COPY.start}</Button>
      </div>
    </form>
  );
}

// The page of a quest just started, until the server's arrives: its name
// at the end of the trail, under Quests, and its empty frame.
function startedQuestPage(name: QuestName): PendingPage {
  return {
    trail: (current: readonly Breadcrumb[]): readonly Breadcrumb[] => [
      ...current.slice(0, -1),
      { label: QUESTS_COPY.heading, href: "/quests" },
      { label: name },
    ],
    main: <QuestFrame>{null}</QuestFrame>,
  };
}

// New quest, at the end of Quests' trail band, and its dialog. Opening
// and closing it starts nothing; only its form does. Starting a quest with
// a name closes the dialog and opens the quest's page at once, under the
// id the browser made for it. If the server refuses it, Quests comes back
// with the dialog open as the user left it, saying why.
function NewQuest(): JSX.Element {
  const showPage = useShowPage();
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState<Entered>(NOTHING_ENTERED);
  const [problem, setProblem] = useState<string | undefined>();
  const changeOpen = useCallback((next: boolean): void => {
    if (!next) {
      setEntered(NOTHING_ENTERED);
      setProblem(undefined);
    }
    setOpen(next);
  }, []);
  const start = useCallback(
    (details: Entered): void => {
      const checked = checkQuestName(details.name);
      if (checked.kind !== "named") {
        setProblem(
          NEW_QUEST_COPY.nameProblem(checked.kind, QUEST_NAME_MAX_LENGTH),
        );
        return;
      }
      const id = QUEST_ID.parse(crypto.randomUUID());
      setOpen(false);
      setProblem(undefined);
      startTransition(async () => {
        showPage(startedQuestPage(checked.name));
        let refusal: string | undefined = NEW_QUEST_COPY.failed;
        try {
          refusal = await startQuestAction({ ...details, id });
        } catch (error) {
          if (answeredByNext(error)) {
            refusal = undefined;
          }
        }
        if (refusal === undefined) {
          return;
        }
        const why = refusal;
        startTransition(() => {
          setEntered(details);
          setProblem(why);
          setOpen(true);
        });
      });
    },
    [showPage],
  );
  return (
    <div className="new-quest-trail-tools">
      <FormDialog
        title={NEW_QUEST_COPY.title}
        closeLabel={NEW_QUEST_COPY.close}
        open={open}
        onOpenChange={changeOpen}
        trigger={
          <Button>
            <Icon name="plus" />
            <span className="new-quest-label">{NEW_QUEST_COPY.open}</span>
          </Button>
        }
      >
        <NewQuestForm entered={entered} problem={problem} onStart={start} />
      </FormDialog>
    </div>
  );
}

export { NewQuest };
