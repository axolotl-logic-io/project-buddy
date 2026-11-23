import { useCallback, useState } from "react";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";

type QuestActionResult =
  | {
      readonly kind: "saved";
      readonly message?: string;
      readonly undoVersion?: number;
    }
  | { readonly kind: "problem"; readonly text: string };

interface QuestAction<Request> {
  readonly run: (request: Request) => Promise<boolean>;
  readonly busy: boolean;
  readonly undoVersion: number | undefined;
  readonly status: string | undefined;
  readonly problem: string | undefined;
}

function useQuestAction<Request>(
  action: (request: Request) => Promise<QuestActionResult>,
): QuestAction<Request> {
  const [busy, setBusy] = useState(false);
  const [undoVersion, setUndoVersion] = useState<number>();
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
        setUndoVersion(result.undoVersion);
        return true;
      } catch {
        setProblem(SPACES_COPY.saveFailed);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [action],
  );
  return { run, busy, undoVersion, status, problem };
}

export type { QuestActionResult };
export { useQuestAction };
