// The messages a person adds to an adventure without the construct: a tasks
// change or a tasks card. No reply answers one, and the construct reads each
// as a short note rather than a request.

import { describe, expect, test } from "vitest";
import {
  TASKS_NOTE_MARK,
  tasksPartForModel,
} from "@/replies/tasks-message-prompt.ts";
import {
  awaitsReply,
  isTasksMessage,
  tasksCardMessage,
  tasksChangeMessage,
} from "@/tasks/tasks-message.ts";

const CHANGE = tasksChangeMessage("m1", {
  version: 4,
  lines: [
    { kind: "complete", text: "Block out the body" },
    { kind: "add", text: "Retopologize the head", before: "Sculpt" },
  ],
  command: "/done",
});

describe("tasks messages", () => {
  test("are user messages that no reply answers", () => {
    expect(isTasksMessage(CHANGE)).toBe(true);
    expect(awaitsReply(CHANGE)).toBe(false);
    expect(awaitsReply(tasksCardMessage("m2", { command: "/tasks" }))).toBe(
      false,
    );
    const words = {
      role: "user" as const,
      parts: [{ type: "text" as const, text: "/done" }],
    };
    expect(isTasksMessage(words)).toBe(false);
    expect(awaitsReply(words)).toBe(true);
    expect(awaitsReply({ role: "assistant", parts: [] })).toBe(false);
  });

  test("reach the construct as a marked note of what changed", () => {
    const [part] = CHANGE.parts;
    if (part === undefined || !("data" in part)) {
      throw new Error("The change has no data part");
    }
    expect(tasksPartForModel(part)).toEqual({
      type: "text",
      text: `${TASKS_NOTE_MARK} The user changed the tasks, without you: checked off "Block out the body"; added "Retopologize the head" before "Sculpt". The tasks in your instructions is current.`,
    });
    expect(tasksPartForModel({ type: "data-other", data: {} })).toBeUndefined();
  });
});
