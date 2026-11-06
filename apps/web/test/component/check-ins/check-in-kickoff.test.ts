import { expect, test } from "vitest";
import {
  CHECK_IN_KICKOFF,
  isCheckInKickoff,
} from "@/check-ins/check-in-kickoff.ts";

test("check-in opening asks for a high-level task and reserves unverified technical steps for tool-enabled replies", () => {
  expect(CHECK_IN_KICKOFF).toContain("This opening has no lookup tools");
  expect(CHECK_IN_KICKOFF).toContain(
    "without Blender steps, commands, menu paths, settings or shortcuts",
  );
  expect(CHECK_IN_KICKOFF).toContain("quest's Journal");
  expect(isCheckInKickoff(CHECK_IN_KICKOFF)).toBe(true);
});
