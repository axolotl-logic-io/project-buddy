// For browser tests of pages that show a quest: a stand-in for
// src/dailies/day-store.ts, which a test file mounts with
//   vi.mock("@/dailies/day-store.ts", () => import("../dailies/day-store-test-kit.ts"));
// The Dailies quest has no days yet, and no Start Day to undo.

import { vi } from "vitest";
import type * as store from "@/dailies/day-store.ts";

const readDailiesRecord = vi.fn<typeof store.readDailiesRecord>(() =>
  Promise.resolve({ days: [], undoable: false }),
);
const startDay = vi.fn<typeof store.startDay>();
const undoStartDay = vi.fn<typeof store.undoStartDay>();

export { readDailiesRecord, startDay, undoStartDay };
