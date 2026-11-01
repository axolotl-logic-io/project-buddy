// The new-chat form's activity and project, which go together: the project
// interview and a new project choose each other, and leaving one leaves the
// other.
import { describe, expect, test } from "vitest";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/activity.ts";
import {
  chooseActivity,
  chooseProject,
  initialSelection,
  NEW_PROJECT,
  type NewChatSelection,
} from "@/chats/new-chat-selection.ts";

const PROJECT = "a-project";
const INTERVIEW_NEW: NewChatSelection = {
  activityId: INTERVIEW_ACTIVITY_ID,
  projectId: NEW_PROJECT,
};

describe("the interview and a new project go together", () => {
  test("choosing the interview chooses a new project", () => {
    expect(
      chooseActivity(
        { activityId: "brainstorming", projectId: PROJECT },
        INTERVIEW_ACTIVITY_ID,
      ),
    ).toEqual(INTERVIEW_NEW);
  });

  test("choosing a new project chooses the interview", () => {
    expect(
      chooseProject(
        { activityId: "brainstorming", projectId: "" },
        NEW_PROJECT,
      ),
    ).toEqual(INTERVIEW_NEW);
  });

  test("choosing another activity leaves a new project for no project", () => {
    expect(chooseActivity(INTERVIEW_NEW, "brainstorming")).toEqual({
      activityId: "brainstorming",
      projectId: "",
    });
  });

  test("choosing an existing project leaves the interview for the default activity", () => {
    expect(chooseProject(INTERVIEW_NEW, PROJECT)).toEqual({
      activityId: DEFAULT_ACTIVITY_ID,
      projectId: PROJECT,
    });
  });

  test("other choices keep the rest of the selection", () => {
    const selection = { activityId: "brainstorming", projectId: PROJECT };
    expect(chooseActivity(selection, "project-breakdown")).toEqual({
      activityId: "project-breakdown",
      projectId: PROJECT,
    });
    expect(chooseProject(selection, "")).toEqual({
      activityId: "brainstorming",
      projectId: "",
    });
  });

  test("a start page for the interview shows a new project", () => {
    expect(
      initialSelection({
        activityId: INTERVIEW_ACTIVITY_ID,
        projectId: PROJECT,
      }),
    ).toEqual(INTERVIEW_NEW);
    expect(
      initialSelection({ activityId: "brainstorming", projectId: PROJECT }),
    ).toEqual({ activityId: "brainstorming", projectId: PROJECT });
  });
});
