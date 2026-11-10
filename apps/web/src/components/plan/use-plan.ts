// The plan controller: one quest's plan as the page shows it, and the
// changes the user can make to it from here, without the construct. A page
// makes one with usePlanController and gives it to the plan's controls inside
// it through PlanContext; they read it with usePlan.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ChatMessage } from "@/chats/message-author.ts";
import type { ChatId, ProjectId } from "@/ids.ts";
import type { PlanOperation, PlanState } from "@/plan/plan.ts";
import type {
  changePlanAction,
  PlanActionResult,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { PLAN_COPY, planLineText } from "@/ui/copy/plan.ts";

// The Server Actions that change the plan (src/plan/plan-actions.ts). A
// page, a Server Component, hands them to its client components, so these
// never import the server's modules themselves.
interface PlanActions {
  readonly change: typeof changePlanAction;
  readonly undo: typeof undoPlanChangeAction;
  readonly command: typeof runChatCommandAction;
}

// What the last change from these controls said: a line to show, and the
// version it saved, which Undo undoes, when it changed the plan outside an
// adventure. failed is true when the change failed, as when it couldn't be
// saved or the quest is gone, rather than being refused with a reason, such
// as the 30-step limit.
interface PlanFeedback {
  readonly text: string;
  readonly undoVersion?: number | undefined;
  readonly failed?: boolean;
}

// One quest's plan as the page shows it, and the changes the user can make
// to it from here, without the construct.
interface PlanController {
  readonly projectId: ProjectId;
  // The adventure the controls are in, if any: their changes are saved to
  // it as plan messages.
  readonly chatId?: ChatId | undefined;
  readonly state: PlanState;
  // Why the controls are off, such as while the construct replies; undefined
  // while they are on.
  readonly disabledNote?: string | undefined;
  // True while a change is being saved.
  readonly pending: boolean;
  readonly feedback: PlanFeedback | undefined;
  // The id of the adventure's newest plan card message, the one that shows
  // the live plan; undefined outside an adventure or without one.
  readonly newestCardId?: string | undefined;
  readonly change: (operations: readonly PlanOperation[]) => Promise<void>;
  readonly undo: (version: number) => Promise<void>;
  // Takes a newer plan from elsewhere, such as the construct's change or an
  // action's answer; an older one is ignored.
  readonly receive: (state: PlanState) => void;
}

// What the controller needs: the quest, the adventure, if any, the plan as
// the page read it, what the controls answer with in an adventure, and why
// they are off, if they are.
interface PlanControllerOptions {
  readonly projectId: ProjectId | undefined;
  readonly actions: PlanActions | undefined;
  readonly chatId?: ChatId | undefined;
  readonly initialState: PlanState | undefined;
  readonly disabledNote?: string | undefined;
  readonly newestCardId?: string | undefined;
  // The newest plan a construct's change in the adventure showed, which the
  // controller takes when it is newer than its own.
  readonly observed?: Pick<PlanState, "version" | "plan"> | undefined;
  readonly onMessage?: ((message: ChatMessage) => void) | undefined;
}

const PlanContext = createContext<PlanController | undefined>(undefined);

const NO_PLAN: PlanState = {
  version: 0,
  plan: { steps: [], nextNumber: 1 },
  undone: [],
};

function newer(current: PlanState, next: PlanState): PlanState {
  if (next.version < current.version) {
    return current;
  }
  return next;
}

// What an action's result shows: a line for a change made outside an
// adventure, where no plan message shows it, and why nothing changed.
function feedbackOf(
  result: PlanActionResult,
  inAdventure: boolean,
): PlanFeedback | undefined {
  switch (result.kind) {
    case "changed":
      if (inAdventure) {
        return undefined;
      }
      return {
        text: result.lines.map(planLineText).join(". "),
        undoVersion: result.version,
      };
    case "shown":
      return undefined;
    case "failed":
      return { text: PLAN_COPY.failed[result.reason] };
    case "problem":
      return { text: result.text };
    case "not-found":
      return { text: PLAN_COPY.failed["not-found"], failed: true };
    default:
      return result satisfies never;
  }
}

// The controller of one quest's plan, or undefined without a quest, such as
// in a standalone adventure.
function usePlanController({
  projectId,
  actions,
  chatId,
  initialState,
  disabledNote,
  newestCardId,
  observed,
  onMessage,
}: PlanControllerOptions): PlanController | undefined {
  const [state, setState] = useState<PlanState>(initialState ?? NO_PLAN);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<PlanFeedback | undefined>();
  const [seenInitial, setSeenInitial] = useState(initialState);
  if (seenInitial !== initialState) {
    // The page read the plan again, such as after a refresh: take it if it
    // is newer than the plan shown.
    setSeenInitial(initialState);
    if (initialState !== undefined) {
      setState((current) => newer(current, initialState));
    }
  }
  const receive = useCallback((next: PlanState): void => {
    setState((current) => newer(current, next));
  }, []);
  const settle = useCallback(
    (result: PlanActionResult): void => {
      if (result.kind !== "problem" && result.kind !== "not-found") {
        receive(result.state);
      }
      if (
        (result.kind === "changed" || result.kind === "shown") &&
        result.message !== undefined
      ) {
        onMessage?.(result.message);
      }
      setFeedback(feedbackOf(result, chatId !== undefined));
    },
    [chatId, onMessage, receive],
  );
  const run = useCallback(
    async (action: () => Promise<PlanActionResult>): Promise<void> => {
      setPending(true);
      try {
        settle(await action());
      } catch {
        setFeedback({ text: PLAN_COPY.failed["not-saved"], failed: true });
      } finally {
        setPending(false);
      }
    },
    [settle],
  );
  const change = useCallback(
    (operations: readonly PlanOperation[]): Promise<void> =>
      run(async () => {
        if (actions === undefined) {
          return { kind: "not-found" };
        }
        return await actions.change({ projectId, chatId, operations });
      }),
    [run, actions, projectId, chatId],
  );
  const undo = useCallback(
    (version: number): Promise<void> =>
      run(async () => {
        if (actions === undefined) {
          return { kind: "not-found" };
        }
        return await actions.undo({ projectId, chatId, version });
      }),
    [run, actions, projectId, chatId],
  );
  let shown = state;
  if (observed !== undefined && observed.version > state.version) {
    shown = { ...observed, undone: state.undone };
  }
  return useMemo(() => {
    if (projectId === undefined || actions === undefined) {
      return;
    }
    return {
      projectId,
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
    projectId,
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

// The plan controller around this component, or undefined outside a quest.
function usePlan(): PlanController | undefined {
  return useContext(PlanContext);
}

export type { PlanActions, PlanController, PlanFeedback };
export { PlanContext, usePlan, usePlanController };
