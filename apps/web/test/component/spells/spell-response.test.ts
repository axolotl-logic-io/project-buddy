import { expect, test } from "vitest";
import { getSpell } from "@/spells/spell.ts";
import { spellResponse } from "@/spells/spell-response.ts";

test("response placeholders expand once without interpreting inserted message content", () => {
  expect(
    spellResponse(
      "{{spell}} saved {{message}} in {{bucket}} for {{name}}.",
      getSpell("brainstorm"),
      "Try {{spell}}",
      { userName: "Sam" },
    ),
  ).toBe("Brainstorm saved Try {{spell}} in Ideas for Sam.");
  expect(
    spellResponse("For {{name}}: {{unknown}}", getSpell("plan"), "hello"),
  ).toBe("For the user: {{unknown}}");
});

test("random reply selection can choose every alternative before expanding placeholders", () => {
  const LastChoiceRandom = 0.999;
  const replies = ["First: {{message}}", "Last: {{bucket}}"];
  expect(
    spellResponse(replies, getSpell("plan"), "Sketch", { random: () => 0 }),
  ).toBe("First: Sketch");
  expect(
    spellResponse(replies, getSpell("plan"), "Sketch", {
      random: () => LastChoiceRandom,
    }),
  ).toBe("Last: Plan");
});
