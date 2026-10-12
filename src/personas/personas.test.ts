import { describe, expect, test } from "vitest";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isPersonaId,
  listPersonas,
  renderPersonaPrompt,
} from "@/personas/index.ts";
import { PERSONA_IDS, PERSONA_SHARED_RULES } from "@/personas/persona.ts";

const MIN_SAMPLE_LINES = 3;
const TONE_NOT_FACTS = /tone, not facts/iu;
const APP_RENDERS_CITATIONS = /app renders citations/iu;
const NEVER_INVENT = /never invent/iu;
const RESTYLE = /restyle/iu;
const JOURNEY = /journey/iu;
// A built-in persona serves every user, so it assumes no one's gender.
const GENDERED_PRONOUN = /\b(?:she|her|hers|herself)\b/iu;
// The personas are spoofs: none names the character it parodies, or uses an
// in-world word from its source.
const ORIGINAL_TERMS: readonly RegExp[] = [
  /\bMr\.? T\b/iu,
  /\bFord Pines\b/iu,
  /\bStan Pines\b/iu,
  /\bSpengler\b/iu,
  /\bDeschain\b/iu,
  /\bka\b/iu,
  /\bthankya\b/iu,
  /\bway ?station\b/iu,
];

describe("persona registry", () => {
  test("lists exactly the six personas Autumn chose", () => {
    expect(listPersonas().map((persona) => persona.id)).toEqual([
      "hippy",
      "mr-tee",
      "fjord-pines",
      "stan-spines",
      "egon-spangler",
      "roland-dustchain",
    ]);
    expect(PERSONA_IDS).toEqual(listPersonas().map((persona) => persona.id));
  });

  test("uses each character's display name", () => {
    expect(listPersonas().map((persona) => persona.name)).toEqual([
      "Hippy",
      "Mr. Tee",
      "Fjord Pines",
      "Stan Spines",
      "Egon Spangler",
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
  test("has a name, a voice description, sample lines and rules", () => {
    expect(persona.name.trim()).not.toBe("");
    expect(persona.voice.trim()).not.toBe("");
    expect(persona.sampleLines.length).toBeGreaterThanOrEqual(MIN_SAMPLE_LINES);
    for (const line of persona.sampleLines) {
      expect(line.trim()).not.toBe("");
    }
    expect(persona.rules.length).toBeGreaterThan(PERSONA_SHARED_RULES.length);
    for (const rule of persona.rules) {
      expect(rule.trim()).not.toBe("");
    }
  });

  test("includes every shared rule", () => {
    for (const rule of PERSONA_SHARED_RULES) {
      expect(persona.rules).toContain(rule);
    }
  });

  test("renders a system-prompt fragment with every field", () => {
    const prompt = renderPersonaPrompt(persona);

    expect(prompt).toContain(persona.name);
    expect(prompt).toContain(persona.voice);
    for (const line of persona.sampleLines) {
      expect(prompt).toContain(line);
    }
    for (const rule of persona.rules) {
      expect(prompt).toContain(rule);
    }
  });

  test("assumes nothing about the user's gender", () => {
    expect(renderPersonaPrompt(persona)).not.toMatch(GENDERED_PRONOUN);
  });
});

describe.each(listPersonas())("persona $id is a spoof", (persona) => {
  test("names no original character and uses no in-world word", () => {
    const prompt = renderPersonaPrompt(persona);

    for (const term of ORIGINAL_TERMS) {
      expect(prompt).not.toMatch(term);
    }
  });
});

describe("shared persona rules", () => {
  const sharedRules = PERSONA_SHARED_RULES.join("\n");

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

describe("Hippy", () => {
  test("guides each lesson like a journey", () => {
    const hippy = getPersona("hippy");

    expect(hippy.voice).toMatch(JOURNEY);
  });
});
