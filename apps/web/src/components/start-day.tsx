"use client";

import { Dialog } from "radix-ui";
import {
  type JSX,
  type SubmitEvent,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import { todayHere } from "@/dailies/dailies.ts";
import { changeDayAction } from "@/dailies/day-actions.ts";
import type { ChatId, QuestId } from "@/ids.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";

const MINUTE_MS = 60_000;

// The minute the server renders: none, since it can't know the browser's
// clock.
const NOT_HYDRATED = 0;

// The current minute, once the page is hydrated, so how long ago the day
// started stays right on a page left open; the server renders no minute.
function subscribeToMinutes(changed: () => void): () => void {
  const timer = setInterval(changed, MINUTE_MS);
  return (): void => {
    clearInterval(timer);
  };
}

function currentMinute(): number {
  return Math.floor(Date.now() / MINUTE_MS);
}

function noMinute(): number {
  return NOT_HYDRATED;
}

// How long ago the newest day started, once the page is hydrated: the server
// can't know the browser's clock, so it renders the line unseen.
function LastStarted({
  startedAt,
}: {
  readonly startedAt: Date | undefined;
}): JSX.Element {
  const minute = useSyncExternalStore(
    subscribeToMinutes,
    currentMinute,
    noMinute,
  );
  if (startedAt === undefined) {
    return (
      <p className="text-muted text-sm">{QUEST_CONVERSATION_COPY.noDayYet}</p>
    );
  }
  if (minute === NOT_HYDRATED) {
    return (
      <p className="invisible text-muted text-sm">
        {QUEST_CONVERSATION_COPY.lastDayStarted(0)}
      </p>
    );
  }
  return (
    <p className="text-muted text-sm">
      {QUEST_CONVERSATION_COPY.lastDayStarted(
        minute * MINUTE_MS - startedAt.getTime(),
      )}
    </p>
  );
}

function StartDay({
  questId,
  chatId,
  lastStartedAt,
  undoable,
}: {
  readonly questId: QuestId;
  readonly chatId: ChatId | undefined;
  readonly lastStartedAt: Date | undefined;
  readonly undoable: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);
  const { run, busy, status, problem } = useQuestAction(changeDayAction);
  const start = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      run({
        op: "start",
        questId,
        chatId,
        localDate: todayHere(new Date()),
        clearTasks: form.get("clearTasks") === "on",
        clearIdeas: form.get("clearIdeas") === "on",
      })
        .then((saved) => {
          if (saved) {
            setOpen(false);
          }
        })
        .catch(() => undefined);
    },
    [questId, chatId, run],
  );
  const undo = useCallback((): void => {
    run({ op: "undo", questId, chatId })
      .finally(() => startRef.current?.focus())
      .catch(() => undefined);
  }, [questId, chatId, run]);
  const label = QUEST_CONVERSATION_COPY.startDay;
  return (
    <div className="flex flex-col items-start gap-1">
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        closeLabel={QUEST_CONVERSATION_COPY.cancel}
        trigger={
          <Button ref={startRef} variant="secondary">
            {label}
          </Button>
        }
      >
        <form onSubmit={start} className="flex flex-col gap-3">
          <p>{QUEST_CONVERSATION_COPY.confirmStartDay}</p>
          <label>
            <input type="checkbox" name="clearTasks" />{" "}
            {QUEST_CONVERSATION_COPY.clearTasks}
          </label>
          <p className="text-muted">{QUEST_CONVERSATION_COPY.keepTasks}</p>
          <label>
            <input type="checkbox" name="clearIdeas" />{" "}
            {QUEST_CONVERSATION_COPY.clearIdeas}
          </label>
          <Dialog.Close asChild={true}>
            <Button variant="secondary">
              {QUEST_CONVERSATION_COPY.cancel}
            </Button>
          </Dialog.Close>
          <Button
            type="submit"
            variant="secondary"
            aria-busy={busy}
            disabled={busy}
          >
            {label}
          </Button>
          {problem !== undefined && <Alert>{problem}</Alert>}
        </form>
      </FormDialog>
      <LastStarted startedAt={lastStartedAt} />
      {undoable === true && (
        <div className="flex flex-col gap-1">
          <Button
            variant="quiet"
            aria-busy={busy}
            disabled={busy}
            onClick={undo}
          >
            {QUEST_CONVERSATION_COPY.undoStartDay}
          </Button>
          <p className="text-muted text-sm">
            {QUEST_CONVERSATION_COPY.undoNote}
          </p>
        </div>
      )}
      <FormStatus>{status}</FormStatus>
      {open === false && problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

export { StartDay };
