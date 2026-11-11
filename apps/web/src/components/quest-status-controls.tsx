"use client";

import { Popover } from "radix-ui";
import {
  createContext,
  type JSX,
  type ReactNode,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { changeQuestStatusAction } from "@/app/(workspace)/projects/status-actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import {
  QUEST_STATUSES,
  type StatusActionState,
  type StatusChange,
} from "@/projects/quest-status.ts";
import type { Project } from "@/projects/store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const IDLE: StatusActionState = { kind: "idle" };
const StatusFeedbackContext = createContext<
  ((state: StatusActionState) => void) | undefined
>(undefined);

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
            key={`${state.change.projectId}-${state.change.revision}`}
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
      <input type="hidden" name="projectId" value={change.projectId} />
      <input type="hidden" name="fromStatus" value={change.toStatus} />
      <input type="hidden" name="toStatus" value={change.fromStatus} />
      <input type="hidden" name="revision" value={change.revision} />
      <Button type="submit" variant="quiet" disabled={pending}>
        {QUEST_STATUS_COPY.undo}
      </Button>
    </form>
  );
}

// A popover keeps infrequent status actions out of the navigation row.
function StatusControls({
  project,
  restoreOnly = false,
}: {
  readonly project: Pick<Project, "id" | "status" | "statusRevision">;
  readonly restoreOnly?: boolean;
}): JSX.Element | null {
  const publish = useContext(StatusFeedbackContext);
  const [open, setOpen] = useState(false);
  const feedbackFocusRef = useRef<boolean>(false);
  const submit = useCallback(
    async (
      previous: StatusActionState,
      submitted: FormData,
    ): Promise<StatusActionState> => {
      const result = await changeWithFeedback(
        publish,
        true,
        previous,
        submitted,
      );
      feedbackFocusRef.current = true;
      setOpen(false);
      return result;
    },
    [publish],
  );
  const [, action, pending] = useActionState(submit, IDLE);
  const changeOpen = useCallback((next: boolean): void => {
    if (next) {
      feedbackFocusRef.current = false;
    }
    setOpen(next);
  }, []);
  const preserveFeedbackFocus = useCallback((event: Event): void => {
    if (feedbackFocusRef.current) {
      event.preventDefault();
    }
  }, []);
  let control: JSX.Element;
  if (restoreOnly === true) {
    control = (
      <Button
        type="submit"
        name="toStatus"
        value="active"
        variant="secondary"
        disabled={pending}
      >
        {QUEST_STATUS_COPY.restore}
      </Button>
    );
  } else {
    control = (
      <div className="quest-status-actions">
        {QUEST_STATUSES.filter((status) => status !== project.status).map(
          (status) => (
            <Button
              key={status}
              type="submit"
              name="toStatus"
              value={status}
              variant="quiet"
              className={`quest-status-${status}`}
              disabled={pending}
            >
              {status === "completed" && <Icon name="check" />}
              {QUEST_STATUS_COPY.actions[status]}
            </Button>
          ),
        )}
      </div>
    );
  }
  const form = (
    <form id={`quest-status-${project.id}`} action={action}>
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="fromStatus" value={project.status} />
      <input type="hidden" name="revision" value={project.statusRevision} />
      {control}
    </form>
  );
  if (restoreOnly === true) {
    return form;
  }
  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild={true}>
        <Button
          variant="quiet"
          className="quest-actions-trigger"
          aria-label={QUEST_STATUS_COPY.menu}
          title={QUEST_STATUS_COPY.menu}
        >
          <Icon name="more" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="quest-actions-panel"
          align="end"
          onCloseAutoFocus={preserveFeedbackFocus}
          aria-label={QUEST_STATUS_COPY.menu}
        >
          <p className="text-muted text-sm">
            {QUEST_STATUS_COPY.labels[project.status]}
          </p>
          {form}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
