import { useCallback, useState } from "react";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";

type QuestActionResult =
  | { readonly kind: "saved"; readonly message?: string }
  | { readonly kind: "problem"; readonly text: string };

interface QuestAction<Request> {
  readonly run: (request: Request) => Promise<boolean>;
  readonly busy: boolean;
  readonly status: string | undefined;
  readonly problem: string | undefined;
}

function useQuestAction<Request>(
  action: (request: Request) => Promise<QuestActionResult>,
): QuestAction<Request> {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const run = useCallback(
    async (request: Request): Promise<boolean> => {
      setBusy(true);
      setStatus(undefined);
      setProblem(undefined);
      try {
        const result = await action(request);
        if (result.kind === "problem") {
          setProblem(result.text);
          return false;
        }
        setStatus(result.message);
        return true;
      } catch {
        setProblem(PANEL_COMMANDS_COPY.problems.failed);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [action],
  );
  return { run, busy, status, problem };
}

export type { QuestActionResult };
export { useQuestAction };
