import { startTransition, useCallback, useOptimistic, useState } from "react";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

type QuestActionResult =
  | {
      readonly kind: "saved";
      readonly message?: string;
      readonly undoVersion?: number;
    }
  | { readonly kind: "problem"; readonly text: string };

// What an action shows the moment the user acts, before the server replies:
// its change to the page, made with useOptimistic setters, and its status.
// The server's reply takes their place, so a refusal undoes the change.
// keep makes the change to the component's own state that a save keeps,
// and refused the one a refusal makes, such as opening a form again; each
// shows with the page the server sends back.
interface Outcome {
  readonly show?: () => void;
  readonly status?: string;
  readonly keep?: () => void;
  readonly refused?: () => void;
}

// The last action's feedback, as the server settled it.
interface Feedback {
  readonly status?: string | undefined;
  readonly problem?: string | undefined;
  readonly undoVersion?: number | undefined;
}

interface QuestAction<Request> {
  // Runs the action, showing its outcome at once.
  readonly start: (request: Request, outcome?: Outcome) => void;
  // Runs it the same, and resolves true once the server has saved it.
  readonly run: (request: Request, outcome?: Outcome) => Promise<boolean>;
  readonly busy: boolean;
  readonly undoVersion: number | undefined;
  readonly status: string | undefined;
  readonly problem: string | undefined;
}

const NO_FEEDBACK: Feedback = {};

// What start does once the server has answered: nothing more.
function ignoreSaved(): void {
  // The outcome's own callbacks have shown the answer.
}

function settle(result: QuestActionResult, outcome: Outcome): Feedback {
  if (result.kind === "problem") {
    return { problem: result.text };
  }
  return {
    status: outcome.status ?? result.message,
    undoVersion: result.undoVersion,
  };
}

// Runs a quest's Server Action. failed is the problem shown when the
// server doesn't answer.
function useQuestAction<Request>(
  action: (request: Request) => Promise<QuestActionResult>,
  failed: string = LISTS_COPY.saveFailed,
): QuestAction<Request> {
  const [settled, setSettled] = useState(NO_FEEDBACK);
  const [feedback, showFeedback] = useOptimistic(settled);
  const [busy, showBusy] = useOptimistic(false);
  // Runs it, then tells done whether the server saved it.
  const perform = useCallback(
    (
      request: Request,
      outcome: Outcome,
      done: (saved: boolean) => void,
    ): void => {
      startTransition(async () => {
        showBusy(true);
        showFeedback({ status: outcome.status });
        outcome.show?.();
        let next: Feedback = { problem: failed };
        try {
          next = settle(await action(request), outcome);
        } catch {
          // The server didn't answer, so the change is undone.
        }
        // The result shows with the page the server sent back with it, so
        // a notice never stands where that page's changes will push it.
        startTransition(() => {
          setSettled(next);
          if (next.problem === undefined) {
            outcome.keep?.();
          } else {
            outcome.refused?.();
          }
        });
        done(next.problem === undefined);
      });
    },
    [action, failed, showBusy, showFeedback],
  );
  const start = useCallback(
    (request: Request, outcome: Outcome = {}): void =>
      perform(request, outcome, ignoreSaved),
    [perform],
  );
  const run = useCallback(
    (request: Request, outcome: Outcome = {}): Promise<boolean> =>
      new Promise((resolve) => perform(request, outcome, resolve)),
    [perform],
  );
  return {
    start,
    run,
    busy,
    undoVersion: feedback.undoVersion,
    status: feedback.status,
    problem: feedback.problem,
  };
}

export type { Outcome, QuestAction, QuestActionResult };
export { useQuestAction };
