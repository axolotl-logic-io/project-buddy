import { describe, expect, test } from "vitest";
import { movedNextStep } from "@/memory/migrate-next-steps.ts";

const OVERSIZED_STEP_LENGTH = 201;

describe("legacy next step extraction", () => {
  test("preserves notes and removes only the matching line", () => {
    expect(
      movedNextStep(
        "Goal: Learn\r\n- **Next step:** Practice\r\nNote: Keep me\r\n",
      ),
    ).toEqual({ step: "Practice", text: "Goal: Learn\r\nNote: Keep me\r\n" });
  });
  test("skips absent, blank and oversized steps", () => {
    expect(movedNextStep("Note: Keep me")).toBeUndefined();
    expect(movedNextStep("Next step: ")).toBeUndefined();
    expect(
      movedNextStep(`Next step: ${"x".repeat(OVERSIZED_STEP_LENGTH)}`),
    ).toBeUndefined();
  });
  test("a second pass changes nothing", () => {
    const moved = movedNextStep("Next step: Practice\nNotes");
    expect(movedNextStep(moved?.text ?? "")).toBeUndefined();
  });
});
