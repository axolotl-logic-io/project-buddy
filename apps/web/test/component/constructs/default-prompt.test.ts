import { expect, test } from "vitest";
import {
  constructResetPrompt,
  starterConstructDefinition,
} from "@/constructs/default-prompt.ts";
import { listConstructs } from "@/constructs/index.ts";

const CHARACTER_HEADING = /^# Character Sheet\n/u;

test("construct starters and every reset source use a Character Sheet", () => {
  expect(
    starterConstructDefinition().prompt.startsWith("# Character Sheet\n"),
  ).toBe(true);
  for (const construct of listConstructs()) {
    expect(constructResetPrompt(construct.id).prompt).toMatch(
      CHARACTER_HEADING,
    );
  }
});
