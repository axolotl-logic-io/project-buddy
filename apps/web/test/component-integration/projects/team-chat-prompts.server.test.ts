// What a team project's chat sends to the browser when a member moves it
// into one of their own activities, in the test database with the mock
// buddy. The chat shows the change by the activity's name, for everyone in
// the project and on reopening, but the messages the page sends hold none
// of the activity's prompt parts. The activity's instructions are shared
// with the members through the chat's activity session, which replies
// follow (docs/team-projects.md).
import { getToolName, isToolUIPart } from "ai";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { cloneActivity, updateActivity } from "@/activities/activity-store.ts";
import {
  SELECT_ACTIVITY_OUTPUT,
  SELECT_ACTIVITY_TOOL,
} from "@/activities/select-activity-contract.ts";
import { listMessages } from "@/chats/store.ts";
import { SelectActivityPart } from "@/components/chat/select-activity-part.tsx";
import { addProjectMember } from "@/projects/members-store.ts";
import { SELECT_ACTIVITY_COPY } from "@/ui/copy/chat.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { buddyReply } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const SECRET_INSTRUCTIONS = "Speak only in limericks about marine turtles.";
const SECRET_KICKOFF = "Open with a limerick about the shell.";
const ACTIVITY_NAME = "Limerick hour";

describe("use_case_buddy_changes_activity", () => {
  test("a member's own activity reaches no one's chat messages, which still show the change", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const data = testData(owner);
    const project = await data.project();
    const chat = await data.chat(project);
    await addProjectMember(member.id, project.id);
    const clone = await cloneActivity(member.id, DEFAULT_ACTIVITY_ID);
    if (clone === undefined) {
      throw new Error("The activity wasn't cloned");
    }
    const own = await updateActivity(member.id, clone.id, {
      name: ACTIVITY_NAME,
      definition: {
        prompt: SECRET_INSTRUCTIONS,
        openingRequest: SECRET_KICKOFF,
      },
    });
    if (own === undefined) {
      throw new Error("The activity wasn't edited");
    }

    await signIn(member);
    const input = JSON.stringify({ activityId: own.id });
    await buddyReply(chat.id, `/mock-tool ${SELECT_ACTIVITY_TOOL} ${input}`);

    const served = await Promise.all(
      [owner, member].map((user) => listMessages(user.id, chat.id)),
    );
    for (const sent of served) {
      const payload = JSON.stringify(sent);
      expect(payload).not.toContain(SECRET_INSTRUCTIONS);
      expect(payload).not.toContain(SECRET_KICKOFF);
      const call = sent
        .flatMap(({ parts }) => parts)
        .find(
          (part) =>
            isToolUIPart(part) && getToolName(part) === SELECT_ACTIVITY_TOOL,
        );
      if (call === undefined || !("output" in call)) {
        throw new Error("The buddy didn't call select_activity");
      }
      const output = SELECT_ACTIVITY_OUTPUT.parse(call.output);
      expect(output).toEqual({
        status: "entered",
        activityId: own.id,
        name: ACTIVITY_NAME,
      });
      expect(
        renderToStaticMarkup(
          createElement(SelectActivityPart, { part: { result: output } }),
        ),
      ).toContain(SELECT_ACTIVITY_COPY.entered(ACTIVITY_NAME));
    }
    // The chat runs on the activity for everyone in the project.
    expect((await currentActivity(owner.id, chat)).id).toBe(own.id);
  });
});
