// The messages a person adds to an adventure without the construct: a plan
// change or a plan card. No reply answers one, and the construct reads each
// as a short note rather than a request.
import { describe, expect, test } from "vitest";
import {
  awaitsReply,
  isPlanMessage,
  planCardMessage,
  planChangeMessage,
} from "@/plan/plan-message.ts";
import {
  PLAN_NOTE_MARK,
  planPartForModel,
} from "@/replies/plan-message-prompt.ts";

const CHANGE = planChangeMessage("m1", {
  version: 4,
  lines: [
    { kind: "complete", text: "Block out the body" },
    { kind: "add", text: "Retopologize the head", before: "Sculpt" },
  ],
  command: "/done",
});

describe("plan messages", () => {
  test("are user messages that no reply answers", () => {
    expect(isPlanMessage(CHANGE)).toBe(true);
    expect(awaitsReply(CHANGE)).toBe(false);
    expect(awaitsReply(planCardMessage("m2", { command: "/plan" }))).toBe(
      false,
    );
    const words = {
      role: "user" as const,
      parts: [{ type: "text" as const, text: "/done" }],
    };
    expect(isPlanMessage(words)).toBe(false);
    expect(awaitsReply(words)).toBe(true);
    expect(awaitsReply({ role: "assistant", parts: [] })).toBe(false);
  });

  test("reach the construct as a marked note of what changed", () => {
    const [part] = CHANGE.parts;
    if (part === undefined || !("data" in part)) {
      throw new Error("The change has no data part");
    }
    expect(planPartForModel(part)).toEqual({
      type: "text",
      text: `${PLAN_NOTE_MARK} The user changed the plan, without you: checked off "Block out the body"; added "Retopologize the head" before "Sculpt". The plan in your instructions is current.`,
    });
    expect(planPartForModel({ type: "data-other", data: {} })).toBeUndefined();
  });
});
