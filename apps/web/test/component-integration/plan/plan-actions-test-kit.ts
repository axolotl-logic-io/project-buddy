// For browser tests of pages that hand the plan's Server Actions to their
// client components: a stand-in for src/plan/plan-actions.ts, which a test
// file mounts with
//   vi.mock("@/plan/plan-actions.ts", () => import("../plan/plan-actions-test-kit.ts"));
// Each action is a mock that answers nothing until a test sets an answer.
import { vi } from "vitest";
import type * as actions from "@/plan/plan-actions.ts";

const changePlanAction = vi.fn<typeof actions.changePlanAction>();
const undoPlanChangeAction = vi.fn<typeof actions.undoPlanChangeAction>();
const runChatCommandAction = vi.fn<typeof actions.runChatCommandAction>();

export { changePlanAction, runChatCommandAction, undoPlanChangeAction };
