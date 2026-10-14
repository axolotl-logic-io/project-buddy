import { describe, expect, test } from "vitest";
import { userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona } from "@/personas/index.ts";
import {
  defaultPart,
  isMechanicsPart,
  isPersonaPartKey,
  PERSONA_PART_KEYS,
  type PersonaPartKey,
} from "@/personas/part-defaults.ts";
import type { PersonaParts } from "@/personas/persona.ts";
import {
  PERSONA_SHARED_RULES,
  personaParts,
} from "@/personas/persona-parts.ts";

// Every part but the persona's own voice and teaching rules.
const SHARED_PARTS: readonly PersonaPartKey[] = PERSONA_PART_KEYS.filter(
  (key) => key !== "voice" && key !== "teachingRules",
);

const DEFAULTS: PersonaParts = personaParts({ voice: "", teachingRules: "" });

describe("persona part keys", () => {
  test("name every part once", () => {
    expect(new Set(PERSONA_PART_KEYS)).toEqual(new Set(Object.keys(DEFAULTS)));
    expect(new Set(PERSONA_PART_KEYS).size).toBe(PERSONA_PART_KEYS.length);
  });

  test("recognise a part's key and nothing else", () => {
    expect(isPersonaPartKey("voice")).toBe(true);
    expect(isPersonaPartKey("answerNow")).toBe(true);
    expect(isPersonaPartKey("toString")).toBe(false);
    expect(isPersonaPartKey("")).toBe(false);
  });

  test("mark the mechanics parts, not the role, voice or teaching rules", () => {
    expect(new Set(PERSONA_PART_KEYS.filter(isMechanicsPart))).toEqual(
      new Set([
        "answerNow",
        "citation",
        "citeManualTool",
        "emptyMemory",
        "interview",
        "memoryIntro",
        "neutralKickoff",
        "openingKickoff",
        "searchManualTool",
        "sharedRules",
        "updateMemoryTool",
      ]),
    );
  });
});

describe("a part's default", () => {
  test("is the voice and teaching rules of the built-in persona it was cloned from", () => {
    const mrTee = getPersona("mr-tee").parts;

    expect(defaultPart("voice", "mr-tee")).toBe(mrTee.voice);
    expect(defaultPart("teachingRules", "mr-tee")).toBe(mrTee.teachingRules);
  });

  test("is Hippy's voice and teaching rules for a clone of her own persona, or of nothing", () => {
    const hippy = getPersona("hippy").parts;

    for (const clonedFrom of [userPersonaIdFixture(), "nobody", undefined]) {
      expect(defaultPart("voice", clonedFrom)).toBe(hippy.voice);
      expect(defaultPart("teachingRules", clonedFrom)).toBe(
        hippy.teachingRules,
      );
    }
  });

  test("is every persona's default for each other part, whatever it was cloned from", () => {
    for (const clonedFrom of ["roland-dustchain", "nobody", undefined]) {
      for (const key of SHARED_PARTS) {
        expect(defaultPart(key, clonedFrom)).toBe(DEFAULTS[key]);
      }
    }
    expect(defaultPart("sharedRules", "span-tines")).toBe(PERSONA_SHARED_RULES);
  });
});
