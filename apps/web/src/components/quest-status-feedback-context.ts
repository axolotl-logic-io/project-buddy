import { createContext } from "react";
import type { StatusActionState } from "@/quests/quest-status.ts";

const StatusFeedbackContext = createContext<
  ((state: StatusActionState) => void) | undefined
>(undefined);

export { StatusFeedbackContext };
