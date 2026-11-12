// For browser tests of pages that show a quest's plan: a stand-in for
// src/plan/plan-store.ts, which a test file mounts with
//   vi.mock("@/plan/plan-store.ts", () => import("../plan/plan-store-test-kit.ts"));
// Every quest's plan is FOX_PLAN_STATE: steps with long words and a done
// step, so pages show each part of the plan.

import { vi } from "vitest";
import type { Plan, PlanState } from "@/plan/plan.ts";
import type * as store from "@/plan/plan-store.ts";

// A step of one word, longer than a phone's screen is wide.
const LONG_STEP_REPEATS = 12;
const LONG_STEP = "Retopologize".repeat(LONG_STEP_REPEATS);

const FOX_PLAN: Plan = {
  steps: [
    { number: 1, text: "Gather reference photos of red foxes", done: true },
    { number: 2, text: "Block out the body and the tail", done: false },
    { number: 3, text: LONG_STEP, done: false },
    { number: 4, text: "Render a turntable", done: false },
  ],
  nextNumber: 5,
};

const FOX_PLAN_STATE: PlanState = { version: 3, plan: FOX_PLAN, undone: [] };

const readPlanState = vi.fn<typeof store.readPlanState>(() =>
  Promise.resolve(FOX_PLAN_STATE),
);
const readPlan = vi.fn<typeof store.readPlan>(() => Promise.resolve(FOX_PLAN));

export { FOX_PLAN, FOX_PLAN_STATE, LONG_STEP, readPlan, readPlanState };
