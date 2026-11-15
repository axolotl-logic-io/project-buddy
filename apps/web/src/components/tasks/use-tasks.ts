// The tasks controller: one quest's tasks as the page shows it, and the
// changes the user can make to it from here, without the construct. A page
// makes one with useTasksController and gives it to the task list's controls inside
// it through TasksContext; they read it with useTasks.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ChatId, QuestId } from "@/ids.ts";
import type { TasksOperation, TasksState } from "@/tasks/tasks.ts";
import type {
  changeTasksAction,
  runChatCommandAction,
  TasksActionResult,
  undoTasksChangeAction,
} from "@/tasks/tasks-actions.ts";
import { TASKS_COPY, tasksLineText } from "@/ui/copy/tasks.ts";

// The Server Actions that change the tasks (src/tasks/tasks-actions.ts). A
// page, a Server Component, hands them to its client components, so these
// never import the server's modules themselves.
interface TasksActions {
  readonly change: typeof changeTasksAction;
  readonly undo: typeof undoTasksChangeAction;
  readonly command: typeof runChatCommandAction;
}

// What the last change from these controls said: a line to show, and the
// version it saved, which Undo undoes. failed is true when the change
// could not be saved or the quest is gone, rather than being refused with
// a reason such as a missing step.
interface TasksFeedback {
  readonly text: string;
  readonly undoVersion?: number | undefined;
  readonly failed?: boolean;
}

// One quest's tasks as the page shows it, and the changes the user can make
// to it from here, without the construct.
interface TasksController {
  readonly questId: QuestId;
  // The conversation the controls are in, for ownership and change history.
  readonly chatId?: ChatId | undefined;
  readonly state: TasksState;
  // Why the controls are off, such as while the construct replies; undefined
  // while they are on.
  readonly disabledNote?: string | undefined;
  // True while a change is being saved.
  readonly pending: boolean;
  readonly feedback: TasksFeedback | undefined;
  // The id of the adventure's newest tasks card message, the one that shows
  // the live tasks; undefined outside an adventure or without one.
  readonly newestCardId?: string | undefined;
  readonly change: (operations: readonly TasksOperation[]) => Promise<boolean>;
  readonly undo: (version: number) => Promise<void>;
  // Takes a newer tasks from elsewhere, such as the construct's change or an
  // action's answer; an older one is ignored.
  readonly receive: (state: TasksState) => void;
}

// What the controller needs: the quest, the adventure, if any, the tasks as
// the page read it, what the controls answer with in an adventure, and why
// they are off, if they are.
interface TasksControllerOptions {
  readonly questId: QuestId;
  readonly actions: TasksActions | undefined;
  readonly chatId?: ChatId | undefined;
  readonly initialState: TasksState | undefined;
  readonly disabledNote?: string | undefined;
  readonly newestCardId?: string | undefined;
  // The newest tasks a construct's change in the adventure showed, which the
  // controller takes when it is newer than its own.
  readonly observed?: Pick<TasksState, "version" | "tasks"> | undefined;
}

const TasksContext = createContext<TasksController | undefined>(undefined);

const NO_TASKS: TasksState = {
  version: 0,
  tasks: { steps: [], nextNumber: 1 },
  undone: [],
};

function newer(current: TasksState, next: TasksState): TasksState {
  if (next.version < current.version) {
    return current;
  }
  return next;
}

// Direct controls show their result and Undo locally, without a conversation message.
function feedbackOf(result: TasksActionResult): TasksFeedback | undefined {
  switch (result.kind) {
    case "changed":
      return {
        text: result.lines.map(tasksLineText).join(". "),
        undoVersion: result.version,
      };
    case "quest-status":
    case "shown":
      return undefined;
    case "failed":
      return { text: TASKS_COPY.failed[result.reason] };
    case "problem":
      return { text: result.text };
    case "not-found":
      return { text: TASKS_COPY.failed["not-found"], failed: true };
    default:
      return result satisfies never;
  }
}

// The controller of one quest's tasks, or undefined without its actions.
function useTasksController({
  questId,
  actions,
  chatId,
  initialState,
  disabledNote,
  newestCardId,
  observed,
}: TasksControllerOptions): TasksController | undefined {
  const [state, setState] = useState<TasksState>(initialState ?? NO_TASKS);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<TasksFeedback | undefined>();
  const [seenInitial, setSeenInitial] = useState(initialState);
  if (seenInitial !== initialState) {
    // The page read the tasks again, such as after a refresh: take it if it
    // is newer than the tasks shown.
    setSeenInitial(initialState);
    if (initialState !== undefined) {
      setState((current) => newer(current, initialState));
    }
  }
  const receive = useCallback((next: TasksState): void => {
    setState((current) => newer(current, next));
  }, []);
  const settle = useCallback(
    (result: TasksActionResult): void => {
      if (
        result.kind !== "problem" &&
        result.kind !== "not-found" &&
        result.kind !== "quest-status"
      ) {
        receive(result.state);
      }
      setFeedback(feedbackOf(result));
    },
    [receive],
  );
  const run = useCallback(
    async (action: () => Promise<TasksActionResult>): Promise<boolean> => {
      setPending(true);
      try {
        const result = await action();
        settle(result);
        return result.kind === "changed";
      } catch {
        setFeedback({ text: TASKS_COPY.failed["not-saved"], failed: true });
        return false;
      } finally {
        setPending(false);
      }
    },
    [settle],
  );
  const change = useCallback(
    (operations: readonly TasksOperation[]): Promise<boolean> =>
      run(async () => {
        if (actions === undefined) {
          return { kind: "not-found" };
        }
        return await actions.change({ questId, chatId, operations });
      }),
    [run, actions, questId, chatId],
  );
  const undo = useCallback(
    async (version: number): Promise<void> => {
      await run(async () => {
        if (actions === undefined) {
          return { kind: "not-found" };
        }
        return await actions.undo({ questId, chatId, version });
      });
    },
    [run, actions, questId, chatId],
  );
  let shown = state;
  if (observed !== undefined && observed.version > state.version) {
    shown = { ...observed, undone: state.undone };
  }
  return useMemo(() => {
    if (actions === undefined) {
      return;
    }
    return {
      questId,
      chatId,
      state: shown,
      disabledNote,
      pending,
      feedback,
      newestCardId,
      change,
      undo,
      receive,
    };
  }, [
    questId,
    actions,
    chatId,
    shown,
    disabledNote,
    pending,
    feedback,
    newestCardId,
    change,
    undo,
    receive,
  ]);
}

// The tasks controller around this component, or undefined outside a quest.
function useTasks(): TasksController | undefined {
  return useContext(TasksContext);
}

export type { TasksActions, TasksController };
export { TasksContext, useTasks, useTasksController };
