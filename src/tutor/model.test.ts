import { describe, expect, it } from "vitest";
import { TUTOR_MODEL_ID, tutorModel } from "@/tutor/model";

describe("tutorModel", () => {
  it("uses a Claude model through the Anthropic provider", () => {
    const model = tutorModel();

    expect(TUTOR_MODEL_ID).toMatch(/^claude-/);
    expect(model.modelId).toBe(TUTOR_MODEL_ID);
    expect(model.provider).toMatch(/^anthropic/);
  });
});
