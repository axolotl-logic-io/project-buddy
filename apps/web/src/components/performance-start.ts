"use client";

import { createContext, useContext } from "react";
import type { Construct } from "@/constructs/index.ts";
import type { QuestId, UserId } from "@/ids.ts";
import type { List } from "@/lists/list-store.ts";
import type { Performance } from "@/performances/performance-store.ts";
import type { Rite } from "@/rites/rite.ts";

// Who is on the quest page, which a performance's composer needs.
interface Stage {
  readonly questId: QuestId;
  readonly viewer: UserId;
  readonly author: string;
  readonly construct: Construct;
}

interface PerformanceStart {
  // The performance started before the server has saved it.
  readonly started: Performance | undefined;
  readonly stage: Stage;
  // Starts the rite on the list at once. refused runs, with why, when the
  // server refuses it, which takes the performance away again.
  readonly start: (
    rite: Rite,
    list: Pick<List, "id" | "name" | "type">,
    refused: (problem: string) => void,
  ) => void;
}

// The quest page's performances (running-performance.tsx).
const PerformanceStartContext = createContext<PerformanceStart | undefined>(
  undefined,
);

function usePerformanceStart(): PerformanceStart {
  const start = useContext(PerformanceStartContext);
  if (start === undefined) {
    throw new Error("A performance starts only on a quest page");
  }
  return start;
}

export type { PerformanceStart, Stage };
export { PerformanceStartContext, usePerformanceStart };
