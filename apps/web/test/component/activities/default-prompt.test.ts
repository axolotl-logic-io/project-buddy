import { expect, test } from "vitest";
import { ACTIVITY_IDS } from "@/activities/activity.ts";
import {
  activityResetPrompt,
  starterActivityDefinition,
} from "@/activities/default-prompt.ts";

test("activity starters and every reset source use an Activity Sheet", () => {
  expect(
    starterActivityDefinition().prompt.startsWith("# Activity Sheet\n"),
  ).toBe(true);
  for (const id of ACTIVITY_IDS) {
    expect(
      activityResetPrompt(id).prompt.startsWith("# Activity Sheet\n"),
    ).toBe(true);
  }
});
