import { describe, expect, test } from "vitest";
import { getPersona, renderPersonaPrompt } from "@/personas/index.ts";
import { buildTutorSystemPrompt } from "@/tutor/system-prompt.ts";

describe("buildTutorSystemPrompt", () => {
  const mrT = getPersona("mr-t");
  if (mrT === undefined) {
    throw new Error("mr-t persona missing");
  }

  test("includes the chat persona's prompt", () => {
    const prompt = buildTutorSystemPrompt({
      projectName: "Low-poly fox",
      persona: mrT,
    });

    expect(prompt).toContain(renderPersonaPrompt(mrT));
  });

  test("names the project the chat belongs to", () => {
    const prompt = buildTutorSystemPrompt({
      projectName: "Low-poly fox",
      persona: mrT,
    });

    expect(prompt).toContain('"Low-poly fox"');
  });

  test("sets up the tutor role before the persona", () => {
    const prompt = buildTutorSystemPrompt({
      projectName: "Low-poly fox",
      persona: mrT,
    });

    expect(prompt.indexOf("Blender tutor")).toBeGreaterThanOrEqual(0);
    expect(prompt.indexOf("Blender tutor")).toBeLessThan(
      prompt.indexOf(renderPersonaPrompt(mrT)),
    );
  });
});
