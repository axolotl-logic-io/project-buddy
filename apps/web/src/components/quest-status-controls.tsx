"use client";

import { DropdownMenu } from "radix-ui";
import {
  createContext,
  type JSX,
  type ReactNode,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { changeQuestStatusAction } from "@/app/(workspace)/projects/status-actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
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
      <Notice role="status" tabIndex={-1} ref={resultRef}>
        {state.message}
      </Notice>
      {state.change !== undefined && (
        <UndoStatusChange
          key={`${state.change.projectId}-${state.change.revision}`}
          change={state.change}
        />
      )}
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
    <form action={action} className="flex flex-col gap-2">
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

// Submit while the portalled item is still attached. Closing the menu
// otherwise removes its button before the browser's default form action.
function submitStatusItem(event: Event): void {
  const control = event.currentTarget;
  if (control instanceof HTMLButtonElement && !control.disabled) {
    control.form?.requestSubmit(control);
  }
}

function StatusControls({
  project,
  restoreOnly = false,
}: {
  readonly project: Pick<Project, "id" | "status" | "statusRevision" | "role">;
  readonly restoreOnly?: boolean;
}): JSX.Element | null {
  const publish = useContext(StatusFeedbackContext);
  const [, action, pending] = useActionState(
    changeWithFeedback.bind(null, publish, true),
    IDLE,
  );
  if (project.role !== "owner") {
    return null;
  }
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild={true}>
          <Button variant="secondary" aria-disabled={pending}>
            {QUEST_STATUS_COPY.menu}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="quest-actions-menu"
            sideOffset={4}
            align="end"
          >
            {QUEST_STATUSES.filter((status) => status !== project.status).map(
              (status) => (
                <DropdownMenu.Item
                  disabled={pending}
                  key={status}
                  asChild={true}
                  onSelect={submitStatusItem}
                >
                  <button
                    className="menu-link w-full"
                    type="submit"
                    form={`quest-status-${project.id}`}
                    name="toStatus"
                    value={status}
                    disabled={pending}
                  >
                    {QUEST_STATUS_COPY.actions[status]}
                  </button>
                </DropdownMenu.Item>
              ),
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <form id={`quest-status-${project.id}`} action={action}>
        <input type="hidden" name="projectId" value={project.id} />
        <input type="hidden" name="fromStatus" value={project.status} />
        <input type="hidden" name="revision" value={project.statusRevision} />
        {control}
      </form>
    </div>
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
