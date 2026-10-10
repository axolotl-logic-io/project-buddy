import { describe, expect, it } from "vitest";
import { getPersona, renderPersonaPrompt } from "@/personas";
import { buildTutorSystemPrompt } from "@/tutor/system-prompt";

describe("buildTutorSystemPrompt", () => {
  const mrT = getPersona("mr-t");
  if (!mrT) throw new Error("mr-t persona missing");

  it("includes the chat persona's prompt", () => {
    const prompt = buildTutorSystemPrompt({
      projectName: "Low-poly fox",
      persona: mrT,
    });

    expect(prompt).toContain(renderPersonaPrompt(mrT));
  });

  it("names the project the chat belongs to", () => {
    const prompt = buildTutorSystemPrompt({
      projectName: "Low-poly fox",
      persona: mrT,
    });

    expect(prompt).toContain('"Low-poly fox"');
  });

  it("sets up the tutor role before the persona", () => {
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
