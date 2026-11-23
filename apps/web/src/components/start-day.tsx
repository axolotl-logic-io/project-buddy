"use client";

import { Dialog } from "radix-ui";
import {
  type JSX,
  type ReactNode,
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
import { changeQuestDay } from "@/dailies/quest-day-actions.ts";
import type { QuestId } from "@/ids.ts";
import type { Space } from "@/spaces/space-store.ts";
import { DAY_GRID_COPY } from "@/ui/copy/dailies.ts";

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
    return <p className="text-muted text-sm">{DAY_GRID_COPY.noDayYet}</p>;
  }
  if (minute === NOT_HYDRATED) {
    return (
      <p className="invisible text-muted text-sm">
        {DAY_GRID_COPY.lastDayStarted(0)}
      </p>
    );
  }
  return (
    <p className="text-muted text-sm">
      {DAY_GRID_COPY.lastDayStarted(minute * MINUTE_MS - startedAt.getTime())}
    </p>
  );
}

function StartDay({
  questId,
  spaces,
  lastStartedAt,
  undoable,
  children,
}: {
  readonly questId: QuestId;
  readonly spaces: readonly Space[];
  readonly lastStartedAt: Date | undefined;
  readonly undoable: boolean;
  readonly children?: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);
  const { run, busy, status, problem } = useQuestAction(changeQuestDay);
  const start = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      run({
        op: "start",
        questId,
        localDate: todayHere(new Date()),
        emptySpaces: form.getAll("emptySpaces"),
      })
        .then((saved) => {
          if (saved) {
            setOpen(false);
          }
        })
        .catch(() => undefined);
    },
    [questId, run],
  );
  const undo = useCallback((): void => {
    run({ op: "undo", questId })
      .finally(() => startRef.current?.focus())
      .catch(() => undefined);
  }, [questId, run]);
  const label = DAY_GRID_COPY.startDay;
  return (
    <div className="flex flex-col items-start gap-1">
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        closeLabel={DAY_GRID_COPY.cancel}
        trigger={
          <Button ref={startRef} variant="secondary">
            {label}
          </Button>
        }
      >
        <form onSubmit={start} className="flex flex-col gap-3">
          <p>{DAY_GRID_COPY.confirmStartDay}</p>
          <fieldset className="flex flex-col gap-2">
            <legend>{DAY_GRID_COPY.emptySpaces}</legend>
            {spaces.map(({ id, name }) => (
              <label key={id}>
                <input type="checkbox" name="emptySpaces" value={id} /> {name}
              </label>
            ))}
          </fieldset>
          <Dialog.Close asChild={true}>
            <Button variant="secondary">{DAY_GRID_COPY.cancel}</Button>
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
            {DAY_GRID_COPY.undoStartDay}
          </Button>
          <p className="text-muted text-sm">{DAY_GRID_COPY.undoNote}</p>
        </div>
      )}
      {children}
      <FormStatus>{status}</FormStatus>
      {open === false && problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

export { StartDay };
