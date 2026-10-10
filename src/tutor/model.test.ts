import { describe, expect, test } from "vitest";
import { TUTOR_MODEL_ID, tutorModel } from "@/tutor/model.ts";

const CLAUDE_MODEL = /^claude-/u;
const ANTHROPIC_PROVIDER = /^anthropic/u;

describe("tutorModel", () => {
  test("uses a Claude model through the Anthropic provider", () => {
    const model = tutorModel();

    expect(TUTOR_MODEL_ID).toMatch(CLAUDE_MODEL);
    expect(model.modelId).toBe(TUTOR_MODEL_ID);
    expect(model.provider).toMatch(ANTHROPIC_PROVIDER);
  });
});
