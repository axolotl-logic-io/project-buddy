import { describe, expect, test } from "vitest";
import type { BuddyParts } from "@/buddies/buddy.ts";
import { BUDDY_SHARED_RULES, buddyParts } from "@/buddies/buddy-parts.ts";
import { getBuddy } from "@/buddies/index.ts";
import {
  BUDDY_PART_KEYS,
  type BuddyPartKey,
  defaultPart,
  isBuddyPartKey,
  isMechanicsPart,
  SYSTEM_PROMPT_PARTS,
} from "@/buddies/part-defaults.ts";
import { userBuddyIdFixture } from "../id-fixtures.ts";

// Every part but the buddy's own voice and teaching rules.
const SHARED_PARTS: readonly BuddyPartKey[] = BUDDY_PART_KEYS.filter(
  (key) => key !== "voice" && key !== "teachingRules",
);

const DEFAULTS: BuddyParts = buddyParts({ voice: "", teachingRules: "" });

describe("buddy part keys", () => {
  test("name every part once", () => {
    expect(new Set(BUDDY_PART_KEYS)).toEqual(new Set(Object.keys(DEFAULTS)));
    expect(new Set(BUDDY_PART_KEYS).size).toBe(BUDDY_PART_KEYS.length);
  });

  test("recognise a part's key and nothing else", () => {
    expect(isBuddyPartKey("voice")).toBe(true);
    expect(isBuddyPartKey("answerNow")).toBe(true);
    expect(isBuddyPartKey("toString")).toBe(false);
    expect(isBuddyPartKey("")).toBe(false);
  });

  test("mark the mechanics parts, not the role, voice or teaching rules", () => {
    expect(new Set(BUDDY_PART_KEYS.filter(isMechanicsPart))).toEqual(
      new Set([
        "answerNow",
        "centralChat",
        "citation",
        "citeManualTool",
        "createProjectTool",
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

  test("put the central chat after the interview, as a part of the system prompt", () => {
    expect(BUDDY_PART_KEYS.indexOf("centralChat")).toBe(
      BUDDY_PART_KEYS.indexOf("interview") + 1,
    );
    expect(SYSTEM_PROMPT_PARTS.has("centralChat")).toBe(true);
  });
});

describe("a part's default", () => {
  test("is the voice and teaching rules of the built-in buddy it was cloned from", () => {
    const mrTee = getBuddy("mr-tee").parts;

    expect(defaultPart("voice", "mr-tee")).toBe(mrTee.voice);
    expect(defaultPart("teachingRules", "mr-tee")).toBe(mrTee.teachingRules);
  });

  test("is Hippy's voice and teaching rules for a clone of her own buddy, or of nothing", () => {
    const hippy = getBuddy("hippy").parts;

    for (const clonedFrom of [userBuddyIdFixture(), "nobody", undefined]) {
      expect(defaultPart("voice", clonedFrom)).toBe(hippy.voice);
      expect(defaultPart("teachingRules", clonedFrom)).toBe(
        hippy.teachingRules,
      );
    }
  });

  test("is every buddy's default for each other part, whatever it was cloned from", () => {
    for (const clonedFrom of ["roland-dustchain", "nobody", undefined]) {
      for (const key of SHARED_PARTS) {
        expect(defaultPart(key, clonedFrom)).toBe(DEFAULTS[key]);
      }
    }
    expect(defaultPart("sharedRules", "span-tines")).toBe(BUDDY_SHARED_RULES);
  });
});
