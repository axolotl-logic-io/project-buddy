"use client";

import { Dialog } from "radix-ui";
import {
  type JSX,
  type MouseEvent,
  type SubmitEvent,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { FormDialog } from "@/components/form-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
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

// The Dailies quest's Start Day: a button and its confirming dialog, which
// may also remove every task or every Idea; under it, how long ago the last
// day started; and, until someone sends a message in the new day's
// conversation, Undo. Each sends its command to the conversation
// (src/commands/panel-commands.ts), which then opens the day it leaves on.
function StartDay({
  lastStartedAt,
  undoable,
}: {
  readonly lastStartedAt: Date | undefined;
  readonly undoable: boolean;
}): JSX.Element {
  const [portalContainer, setPortalContainer] = useState<
    HTMLElement | undefined
  >();
  const { send, busy, problem } = usePanelSend();
  const open = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    setPortalContainer(event.currentTarget.closest("dialog") ?? undefined);
  }, []);
  const start = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      send(
        PANEL_COMMAND.startDay({
          clearTasks: form.get("clearTasks") === "on",
          clearIdeas: form.get("clearIdeas") === "on",
        }),
      ).catch(() => undefined);
    },
    [send],
  );
  const undo = useCallback((): void => {
    send(PANEL_COMMAND.undoStartDay).catch(() => undefined);
  }, [send]);
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
          <Button type="submit" variant="secondary" disabled={busy}>
            {label}
          </Button>
          {problem !== undefined && <Alert>{problem}</Alert>}
        </form>
      </FormDialog>
      <LastStarted startedAt={lastStartedAt} />
      {undoable === true && (
        <div className="flex flex-col gap-1">
          <Button variant="quiet" disabled={busy} onClick={undo}>
            {QUEST_CONVERSATION_COPY.undoStartDay}
          </Button>
          <p className="text-muted text-sm">
            {QUEST_CONVERSATION_COPY.undoNote}
          </p>
        </div>
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

export { StartDay };
