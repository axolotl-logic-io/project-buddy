import { describe, expect, test } from "vitest";
import {
  chooseActivity,
  chooseProject,
  initialSelection,
  NEW_PROJECT,
} from "@/chats/new-chat-selection.ts";

describe("activity and quest choices are independent", () => {
  test.each([
    "open-chat",
    "brainstorming",
    "project-breakdown",
    "own-activity",
  ])(
    "%s can start a new quest and then continue without a quest",
    (activityId) => {
      const selection = { activityId, projectId: "" };
      expect(chooseProject(selection, NEW_PROJECT)).toEqual({
        activityId,
        projectId: NEW_PROJECT,
      });
      expect(
        chooseActivity(
          { activityId: "open-chat", projectId: NEW_PROJECT },
          activityId,
        ),
      ).toEqual({ activityId, projectId: NEW_PROJECT });
      expect(chooseProject({ activityId, projectId: NEW_PROJECT }, "")).toEqual(
        selection,
      );
    },
  );
  test("older interview links choose Project Breakdown", () => {
    expect(
      initialSelection({ activityId: "interview", projectId: "" }),
    ).toEqual({ activityId: "project-breakdown", projectId: NEW_PROJECT });
    expect(
      initialSelection({ activityId: "interview", projectId: "existing" }),
    ).toEqual({ activityId: "project-breakdown", projectId: "existing" });
  });
});
