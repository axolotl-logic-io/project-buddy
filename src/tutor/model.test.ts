import { describe, expect, test } from "vitest";
import { TUTOR_MODEL_ID, tutorModel } from "@/tutor/model.ts";

describe("tutorModel", () => {
  test("uses a Claude model through the Anthropic provider", () => {
    const model = tutorModel();

    expect(TUTOR_MODEL_ID).toMatch(/^claude-/u);
    expect(model.modelId).toBe(TUTOR_MODEL_ID);
    expect(model.provider).toMatch(/^anthropic/u);
  });
});
