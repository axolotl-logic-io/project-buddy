"use client";

import {
  type JSX,
  type ReactNode,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import {
  type ChatSend,
  useChatSend,
  usePanelSend,
} from "@/components/chat/chat-send.ts";
import { StatusFeedbackContext } from "@/components/quest-status-feedback-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, Notice } from "@/components/ui/form-message.tsx";
import type { StatusActionState, StatusChange } from "@/quests/quest-status.ts";
import type { Quest } from "@/quests/store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const IDLE: StatusActionState = { kind: "idle" };

async function changeWithFeedback(
  publish: ((state: StatusActionState) => void) | undefined,
  offerUndo: boolean,
  state: StatusActionState,
  form: FormData,
): Promise<StatusActionState> {
  const result = await changeQuestStatusAction(state, form);
  if (publish !== undefined) {
    let feedback = result;
    if (!offerUndo) {
      feedback = { ...result, change: undefined };
    }
    publish(feedback);
  }
  return result;
}

function QuestStatusFeedback({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const [state, publish] = useState<StatusActionState>(IDLE);
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.kind !== "idle") {
      resultRef.current?.focus();
    }
  }, [state]);
  return (
    <StatusFeedbackContext.Provider value={publish}>
      {children}
      <div className="quest-status-feedback">
        <Notice role="status" tabIndex={-1} ref={resultRef}>
          {state.message}
        </Notice>
        {state.change !== undefined && (
          <UndoStatusChange
            key={`${state.change.questId}-${state.change.revision}`}
            change={state.change}
          />
        )}
      </div>
    </StatusFeedbackContext.Provider>
  );
}

// In a quest's conversation, Undo sends the command that puts the quest's
// status back, as the panel's status buttons do.
function ChatUndoControl({
  change,
  send,
}: {
  readonly change: StatusChange;
  readonly send: ChatSend;
}): JSX.Element | null {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const undo = useCallback((): void => {
    setPending(true);
    send(PANEL_COMMAND.status(change.fromStatus))
      .then((result) => setDone(result.sent))
      .catch(() => undefined)
      .finally(() => setPending(false));
  }, [send, change.fromStatus]);
  if (done === true) {
    return null;
  }
  return (
    <Button variant="quiet" disabled={pending} onClick={undo}>
      {QUEST_STATUS_COPY.undo}
    </Button>
  );
}

function FormUndoControl({
  change,
}: {
  readonly change: StatusChange;
}): JSX.Element | null {
  const publish = useContext(StatusFeedbackContext);
  const [state, action, pending] = useActionState(
    changeWithFeedback.bind(null, publish, false),
    IDLE,
  );
  if (state.kind === "saved") {
    return null;
  }
  return (
    <form action={action}>
      <input type="hidden" name="questId" value={change.questId} />
      <input type="hidden" name="fromStatus" value={change.toStatus} />
      <input type="hidden" name="toStatus" value={change.fromStatus} />
      <input type="hidden" name="revision" value={change.revision} />
      <Button type="submit" variant="quiet" disabled={pending}>
        {QUEST_STATUS_COPY.undo}
      </Button>
    </form>
  );
}

function UndoControl({
  change,
}: {
  readonly change: StatusChange;
}): JSX.Element | null {
  const send = useChatSend();
  if (send !== undefined) {
    return <ChatUndoControl change={change} send={send} />;
  }
  return <FormUndoControl change={change} />;
}

// In a quest's conversation, each status button sends its command
// (/complete, /abandon or /restore) to the conversation, which notes it and
// publishes what changed, as when the command is typed. What came of it
// shows beside the buttons too, and takes focus from the button disabled
// meanwhile, since in a phone's drawer the page's own feedback is out of
// sight.
function ChatStatusControls({
  quest,
}: {
  readonly quest: Pick<Quest, "status">;
}): JSX.Element {
  const { send, busy, status, problem } = usePanelSend();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const run = useCallback(
    (to: "active" | "completed" | "abandoned"): void => {
      send(PANEL_COMMAND.status(to))
        .then((result) => {
          if (result.sent && result.note !== undefined) {
            queueMicrotask(() => statusRef.current?.focus());
          }
        })
        .catch(() => undefined);
    },
    [send],
  );
  const complete = useCallback((): void => run("completed"), [run]);
  const abandon = useCallback((): void => run("abandoned"), [run]);
  const restore = useCallback((): void => run("active"), [run]);
  let buttons: JSX.Element;
  if (quest.status === "active") {
    buttons = (
      <>
        <Button disabled={busy} onClick={complete}>
          {QUEST_STATUS_COPY.complete}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={abandon}>
          {QUEST_STATUS_COPY.abandon}
        </Button>
      </>
    );
  } else {
    buttons = (
      <Button variant="secondary" disabled={busy} onClick={restore}>
        {QUEST_STATUS_COPY.restore}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">{buttons}</div>
      <Notice role="status" tabIndex={-1} ref={statusRef}>
        {status}
      </Notice>
      {problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

// Active quests offer completion and abandonment; closed quests offer
// restore. In a quest's conversation the buttons send commands; elsewhere,
// as in Quests, they post the form.
function StatusControls({
  quest,
}: {
  readonly quest: Pick<Quest, "id" | "status" | "statusRevision">;
}): JSX.Element {
  const send = useChatSend();
  if (send !== undefined) {
    return <ChatStatusControls quest={quest} />;
  }
  return <FormStatusControls quest={quest} />;
}

function FormStatusControls({
  quest,
}: {
  readonly quest: Pick<Quest, "id" | "status" | "statusRevision">;
}): JSX.Element {
  const publish = useContext(StatusFeedbackContext);
  const [, action, pending] = useActionState(
    changeWithFeedback.bind(null, publish, true),
    IDLE,
  );
  return (
    <form action={action} className="flex flex-wrap gap-3">
      <input type="hidden" name="questId" value={quest.id} />
      <input type="hidden" name="fromStatus" value={quest.status} />
      <input type="hidden" name="revision" value={quest.statusRevision} />
      {quest.status === "active" && (
        <>
          <Button
            type="submit"
            name="toStatus"
            value="completed"
            disabled={pending}
          >
            {QUEST_STATUS_COPY.complete}
          </Button>
          <Button
            type="submit"
            name="toStatus"
            value="abandoned"
            variant="secondary"
            disabled={pending}
          >
            {QUEST_STATUS_COPY.abandon}
          </Button>
        </>
      )}
      {quest.status !== "active" && (
        <Button
          type="submit"
          name="toStatus"
          value="active"
          variant="secondary"
          disabled={pending}
        >
          {QUEST_STATUS_COPY.restore}
        </Button>
      )}
    </form>
  );
}

function QuestStatusControls(
  props: Parameters<typeof StatusControls>[0],
): JSX.Element {
  const publish = useContext(StatusFeedbackContext);
  if (publish === undefined) {
    return (
      <QuestStatusFeedback>
        <StatusControls {...props} />
      </QuestStatusFeedback>
    );
  }
  return <StatusControls {...props} />;
}

function UndoStatusChange(
  props: Parameters<typeof UndoControl>[0],
): JSX.Element {
  const publish = useContext(StatusFeedbackContext);
  if (publish === undefined) {
    return (
      <QuestStatusFeedback>
        <UndoControl {...props} />
      </QuestStatusFeedback>
    );
  }
  return <UndoControl {...props} />;
}

export { QuestStatusControls, QuestStatusFeedback, UndoStatusChange };
