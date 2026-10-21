import { describe, expect, test } from "vitest";
import { BUDDY_IDS } from "@/buddies/buddy.ts";
import { BUDDY_SHARED_RULES } from "@/buddies/buddy-parts.ts";
import {
  DEFAULT_BUDDY_ID,
  getBuddy,
  isBuddyId,
  listBuddies,
  renderBuddyPrompt,
} from "@/buddies/index.ts";

const MIN_SAMPLE_LINES = 3;
// A Markdown list, one item per line, or nothing.
const RULE_LIST = /^(?:- \S.*(?:\n- \S.*)*)?$/u;
const TONE_NOT_FACTS = /tone, not facts/iu;
const APP_RENDERS_CITATIONS = /app renders citations/iu;
const NEVER_INVENT = /never invent/iu;
const RESTYLE = /restyle/iu;

describe("buddy registry", () => {
  test("lists exactly the six built-in buddies", () => {
    expect(listBuddies().map((buddy) => buddy.id)).toEqual([
      "hippy",
      "mr-tee",
      "fjord-tines",
      "span-tines",
      "argon-sprangler",
      "roland-dustchain",
    ]);
    expect(BUDDY_IDS).toEqual(listBuddies().map((buddy) => buddy.id));
  });

  test("uses each character's display name", () => {
    expect(listBuddies().map((buddy) => buddy.name)).toEqual([
      "Hippy",
      "Mr. Tee",
      "Fjord Tines",
      "Span Tines",
      "Argon Sprangler",
      "Roland Dustchain",
    ]);
  });

  test("defaults to Hippy", () => {
    expect(DEFAULT_BUDDY_ID).toBe("hippy");
    expect(getBuddy(DEFAULT_BUDDY_ID).name).toBe("Hippy");
  });

  test("returns the buddy for every id", () => {
    expect(getBuddy("mr-tee").name).toBe("Mr. Tee");
    for (const buddy of listBuddies()) {
      expect(getBuddy(buddy.id)).toBe(buddy);
    }
  });

  test("recognizes only registered ids", () => {
    expect(isBuddyId("roland-dustchain")).toBe(true);
    expect(isBuddyId("coach")).toBe(false);
    expect(isBuddyId("constructor")).toBe(false);
  });
});

describe.each(listBuddies())("buddy $id", (buddy) => {
  test("has a name and every part of the prompt, as text", () => {
    expect(buddy.name.trim()).not.toBe("");
    // A buddy may have no teaching rules of its own.
    const { teachingRules: _, ...parts } = buddy.parts;
    for (const [part, text] of Object.entries(parts)) {
      expect(text.trim(), part).not.toBe("");
    }
  });

  test("has no {{name}} placeholder in any part", () => {
    for (const [part, text] of Object.entries(buddy.parts)) {
      expect(text, part).not.toContain("{{name}}");
    }
  });

  test("has a voice with sample lines, and its own teaching rules", () => {
    expect(buddy.parts.voice).toContain(`# Buddy: ${buddy.name}`);
    const sampleLines = buddy.parts.voice
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(sampleLines.length).toBeGreaterThanOrEqual(MIN_SAMPLE_LINES);
    expect(buddy.parts.teachingRules).toMatch(RULE_LIST);
  });

  test("starts from the shared rules", () => {
    expect(buddy.parts.sharedRules).toBe(BUDDY_SHARED_RULES);
  });

  test("renders a system-prompt fragment with its voice, then every rule", () => {
    const prompt = renderBuddyPrompt(buddy);

    // Where the voice, the shared rules and any teaching rules start.
    const starts = [
      buddy.parts.voice,
      BUDDY_SHARED_RULES,
      buddy.parts.teachingRules,
    ]
      .filter((text) => text !== "")
      .map((text) => prompt.indexOf(text));
    expect(starts[0]).toBe(0);
    expect(starts).not.toContain(-1);
    expect(starts).toEqual(starts.toSorted((one, other) => one - other));
  });
});

describe("shared buddy rules", () => {
  const sharedRules = BUDDY_SHARED_RULES;

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
