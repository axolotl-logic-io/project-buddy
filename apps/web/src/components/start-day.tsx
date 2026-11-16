"use client";

import { Dialog } from "radix-ui";
import {
  type JSX,
  type MouseEvent,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";
import { FormDialog } from "@/components/form-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { todayHere } from "@/dailies/dailies.ts";
import { startDayAction, undoStartDayAction } from "@/dailies/day-actions.ts";
import type { ChatId } from "@/ids.ts";
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

function SubmitButton({
  label,
  variant,
}: {
  readonly label: string;
  readonly variant: "secondary" | "quiet";
}): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

// Starts a new day with the browser's own date, taken when the form is sent,
// so a page left open overnight still dates the day right.
async function startWithToday(formData: FormData): Promise<void> {
  formData.set("localDate", todayHere(new Date()));
  await startDayAction(formData);
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

// The Dailies quest's Start Day: a button and its confirming dialog, which
// may also remove every step or every Idea; under it, how long ago the last
// day started; and, until someone sends a message in the new day's
// conversation, Undo.
function StartDay({
  chatId,
  lastStartedAt,
  undoable,
}: {
  readonly chatId: ChatId;
  readonly lastStartedAt: Date | undefined;
  readonly undoable: boolean;
}): JSX.Element {
  const [portalContainer, setPortalContainer] = useState<
    HTMLElement | undefined
  >();
  const open = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    setPortalContainer(event.currentTarget.closest("dialog") ?? undefined);
  }, []);
  const label = QUEST_CONVERSATION_COPY.startDay;
  return (
    <div className="flex flex-col items-start gap-1">
      <FormDialog
        portalContainer={portalContainer}
        title={label}
        closeLabel={QUEST_CONVERSATION_COPY.cancel}
        trigger={
          <Button variant="secondary" onClick={open}>
            {label}
          </Button>
        }
      >
        <form action={startWithToday} className="flex flex-col gap-3">
          <p>{QUEST_CONVERSATION_COPY.confirmStartDay}</p>
          <label>
            <input type="checkbox" name="clearSteps" />{" "}
            {QUEST_CONVERSATION_COPY.clearSteps}
          </label>
          <p className="text-muted">{QUEST_CONVERSATION_COPY.keepSteps}</p>
          <label>
            <input type="checkbox" name="clearIdeas" />{" "}
            {QUEST_CONVERSATION_COPY.clearIdeas}
          </label>
          <Dialog.Close asChild={true}>
            <Button variant="secondary">
              {QUEST_CONVERSATION_COPY.cancel}
            </Button>
          </Dialog.Close>
          <input type="hidden" name="chatId" value={chatId} />
          <SubmitButton label={label} variant="secondary" />
        </form>
      </FormDialog>
      <LastStarted startedAt={lastStartedAt} />
      {undoable === true && (
        <form action={undoStartDayAction} className="flex flex-col gap-1">
          <input type="hidden" name="chatId" value={chatId} />
          <SubmitButton
            label={QUEST_CONVERSATION_COPY.undoStartDay}
            variant="quiet"
          />
          <p className="text-muted text-sm">
            {QUEST_CONVERSATION_COPY.undoNote}
          </p>
        </form>
      )}
    </div>
  );
}

export { StartDay };
