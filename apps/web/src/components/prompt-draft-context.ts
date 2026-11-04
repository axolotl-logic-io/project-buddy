// Editors report their current draft, including programmatic changes such
// as recovery, reset and undo. A surrounding Workshop can test those values.
import { createContext } from "react";

interface PromptDraft {
  readonly name: string;
  readonly texts: Readonly<Record<string, string>>;
}
const PromptDraftContext = createContext<
  ((draft: PromptDraft) => void) | undefined
>(undefined);

export type { PromptDraft };
export { PromptDraftContext };
