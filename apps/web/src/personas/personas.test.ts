import { describe, expect, test } from "vitest";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isPersonaId,
  listPersonas,
  renderPersonaPrompt,
} from "@/personas/index.ts";
import { PERSONA_IDS } from "@/personas/persona.ts";
import { PERSONA_SHARED_RULES } from "@/personas/persona-parts.ts";

const MIN_SAMPLE_LINES = 3;
// A Markdown list, one item per line, or nothing.
const RULE_LIST = /^(?:- \S.*(?:\n- \S.*)*)?$/u;
const TONE_NOT_FACTS = /tone, not facts/iu;
const APP_RENDERS_CITATIONS = /app renders citations/iu;
const NEVER_INVENT = /never invent/iu;
const RESTYLE = /restyle/iu;

describe("persona registry", () => {
  test("lists exactly the six built-in personas", () => {
    expect(listPersonas().map((persona) => persona.id)).toEqual([
      "hippy",
      "mr-tee",
      "fjord-tines",
      "span-tines",
      "argon-sprangler",
      "roland-dustchain",
    ]);
    expect(PERSONA_IDS).toEqual(listPersonas().map((persona) => persona.id));
  });

  test("uses each character's display name", () => {
    expect(listPersonas().map((persona) => persona.name)).toEqual([
      "Hippy",
      "Mr. Tee",
      "Fjord Tines",
      "Span Tines",
      "Argon Sprangler",
      "Roland Dustchain",
    ]);
  });

  test("defaults to Hippy", () => {
    expect(DEFAULT_PERSONA_ID).toBe("hippy");
    expect(getPersona(DEFAULT_PERSONA_ID).name).toBe("Hippy");
  });

  test("returns the persona for every id", () => {
    expect(getPersona("mr-tee").name).toBe("Mr. Tee");
    for (const persona of listPersonas()) {
      expect(getPersona(persona.id)).toBe(persona);
    }
  });

  test("recognizes only registered ids", () => {
    expect(isPersonaId("roland-dustchain")).toBe(true);
    expect(isPersonaId("coach")).toBe(false);
    expect(isPersonaId("constructor")).toBe(false);
  });
});

describe.each(listPersonas())("persona $id", (persona) => {
  test("is an id, a name and every part of the prompt, as text", () => {
    expect(Object.keys(persona)).toEqual(["id", "name", "parts"]);
    expect(persona.name.trim()).not.toBe("");
    // A persona may have no teaching rules of its own.
    const { teachingRules: _, ...parts } = persona.parts;
    for (const [part, text] of Object.entries(parts)) {
      expect(text.trim(), part).not.toBe("");
    }
  });

  test("has no {{name}} placeholder in any part", () => {
    for (const [part, text] of Object.entries(persona.parts)) {
      expect(text, part).not.toContain("{{name}}");
    }
  });

  test("has a voice with sample lines, and its own teaching rules", () => {
    expect(persona.parts.voice).toContain(`# Buddy: ${persona.name}`);
    const sampleLines = persona.parts.voice
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(sampleLines.length).toBeGreaterThanOrEqual(MIN_SAMPLE_LINES);
    expect(persona.parts.teachingRules).toMatch(RULE_LIST);
  });

  test("starts from the shared rules", () => {
    expect(persona.parts.sharedRules).toBe(PERSONA_SHARED_RULES);
  });

  test("renders a system-prompt fragment with its voice, then every rule", () => {
    const prompt = renderPersonaPrompt(persona);

    const rules = [PERSONA_SHARED_RULES, persona.parts.teachingRules]
      .filter((text) => text !== "")
      .join("\n");
    expect(prompt).toBe(`${persona.parts.voice}\n\n## Rules\n\n${rules}`);
  });
});

describe("shared persona rules", () => {
  const sharedRules = PERSONA_SHARED_RULES;

  test("keeps steps, menu paths, shortcuts and citation links exact", () => {
    expect(sharedRules).toMatch(TONE_NOT_FACTS);
    for (const term of ["steps", "menu paths", "shortcuts", "citation links"]) {
      expect(sharedRules).toContain(term);
    }
  });

  test("leaves citations to the app", () => {
    expect(sharedRules).toMatch(APP_RENDERS_CITATIONS);
    expect(sharedRules).toMatch(NEVER_INVENT);
    expect(sharedRules).toMatch(RESTYLE);
  });
});
