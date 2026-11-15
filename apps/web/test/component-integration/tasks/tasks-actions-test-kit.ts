// For browser tests of pages that hand the task list's Server Actions to their
// client components: a stand-in for src/tasks/tasks-actions.ts, which a test
// file mounts with
//   vi.mock("@/tasks/tasks-actions.ts", () => import("../tasks/tasks-actions-test-kit.ts"));
// Each action is a mock that answers nothing until a test sets an answer.

import { vi } from "vitest";
import type * as actions from "@/tasks/tasks-actions.ts";

const changeTasksAction = vi.fn<typeof actions.changeTasksAction>();
const undoTasksChangeAction = vi.fn<typeof actions.undoTasksChangeAction>();
const runChatCommandAction = vi.fn<typeof actions.runChatCommandAction>();

export { changeTasksAction, runChatCommandAction, undoTasksChangeAction };
