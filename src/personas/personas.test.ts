import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isPersonaId,
  listPersonas,
  PERSONA_IDS,
  PERSONA_SHARED_RULES,
  renderPersonaPrompt,
} from "@/personas";

describe("persona registry", () => {
  it("lists exactly the six personas Autumn chose", () => {
    expect(listPersonas().map((persona) => persona.id)).toEqual([
      "hippy",
      "mr-t",
      "ford-pines",
      "stan-pines",
      "egon-spengler",
      "roland-deschain",
    ]);
    expect(PERSONA_IDS).toEqual(listPersonas().map((persona) => persona.id));
  });

  it("uses each character's display name", () => {
    expect(listPersonas().map((persona) => persona.name)).toEqual([
      "Hippy",
      "Mr. T",
      "Ford Pines",
      "Stan Pines",
      "Egon Spengler",
      "Roland Deschain",
    ]);
  });

  it("defaults to Hippy", () => {
    expect(DEFAULT_PERSONA_ID).toBe("hippy");
    expect(getPersona(DEFAULT_PERSONA_ID)?.name).toBe("Hippy");
  });

  it("returns the persona for a known id", () => {
    expect(getPersona("mr-t")?.name).toBe("Mr. T");
  });

  it("returns undefined for an unknown id", () => {
    expect(getPersona("coach")).toBeUndefined();
    expect(getPersona("")).toBeUndefined();
    expect(getPersona("toString")).toBeUndefined();
  });

  it("recognizes only registered ids", () => {
    expect(isPersonaId("roland-deschain")).toBe(true);
    expect(isPersonaId("coach")).toBe(false);
    expect(isPersonaId("constructor")).toBe(false);
  });
});

describe.each(listPersonas())("persona $id", (persona) => {
  it("has a name, a voice description, sample lines and rules", () => {
    expect(persona.name.trim()).not.toBe("");
    expect(persona.voice.trim()).not.toBe("");
    expect(persona.sampleLines.length).toBeGreaterThanOrEqual(3);
    for (const line of persona.sampleLines) {
      expect(line.trim()).not.toBe("");
    }
    expect(persona.rules.length).toBeGreaterThan(PERSONA_SHARED_RULES.length);
    for (const rule of persona.rules) {
      expect(rule.trim()).not.toBe("");
    }
  });

  it("includes every shared rule", () => {
    for (const rule of PERSONA_SHARED_RULES) {
      expect(persona.rules).toContain(rule);
    }
  });

  it("renders a system-prompt fragment with every field", () => {
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
});

describe("shared persona rules", () => {
  const sharedRules = PERSONA_SHARED_RULES.join("\n");

  it("keeps steps, menu paths, shortcuts and citation links exact", () => {
    expect(sharedRules).toMatch(/tone, not facts/i);
    for (const term of ["steps", "menu paths", "shortcuts", "citation links"]) {
      expect(sharedRules).toContain(term);
    }
  });

  it("leaves citations to the app", () => {
    expect(sharedRules).toMatch(/app renders citations/i);
    expect(sharedRules).toMatch(/never invent/i);
    expect(sharedRules).toMatch(/restyle/i);
  });
});

describe("Hippy", () => {
  it("guides each lesson like a trip", () => {
    const hippy = getPersona("hippy");

    expect(hippy?.voice).toMatch(/trip/i);
  });
});
