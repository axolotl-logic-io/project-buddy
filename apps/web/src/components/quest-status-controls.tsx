"use client";

import {
  type JSX,
  type ReactNode,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { StatusFeedbackContext } from "@/components/quest-status-feedback-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
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

function UndoControl({
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

// Quest cards retain a direct restore action.
function StatusControls({
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
    <form action={action}>
      <input type="hidden" name="questId" value={quest.id} />
      <input type="hidden" name="fromStatus" value={quest.status} />
      <input type="hidden" name="revision" value={quest.statusRevision} />
      <Button
        type="submit"
        name="toStatus"
        value="active"
        variant="secondary"
        disabled={pending}
      >
        {QUEST_STATUS_COPY.restore}
      </Button>
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
