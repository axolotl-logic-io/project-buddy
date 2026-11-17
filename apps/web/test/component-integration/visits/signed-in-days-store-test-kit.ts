import { vi } from "vitest";
import type * as store from "@/visits/signed-in-days-store.ts";

const readSignedInDays = vi.fn<typeof store.readSignedInDays>(() =>
  Promise.resolve({ total: 24, trackedSince: "2026-10-20" }),
);

export { readSignedInDays };
