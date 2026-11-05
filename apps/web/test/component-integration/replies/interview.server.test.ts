// A new project's interview, in the test database with the mock construct: only
// the project's interview chat has the interview in its prompt, with the
// memory so far, and the construct saves each answer as a version of the
// memory. That the interview ends once the memory holds her goal, skill
// level, purpose and milestones is the real-Claude smoke test's to check
// (use-cases/README.md).

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/activity.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { getActivity } from "@/activities/index.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import { startChat, startProject } from "@/chats/start-chat.ts";
import { listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { readMemory, readMemoryHistory } from "@/memory/memory-store.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { getProject } from "@/projects/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructEdits,
  constructPrompt,
  constructReply,
  messageText,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// The interview's instructions, which its chat's prompt holds.
const INTERVIEW_PROMPT: string = getActivity(INTERVIEW_ACTIVITY_ID).definition
  .prompt;

const GOAL = "## Goal\n\n- A low-poly fox";
const MILESTONES = "## Milestones\n\n- [ ] Block out the body";

// What the construct's update_memory answers when it saved a change.
const UPDATED = { status: "updated" };

// A new project of the signed-in user's, through the site's own start, and
// its interview chat, with Hippy.
async function startInterview(user: User): Promise<ProjectChat> {
  await signIn(user);
  const started = await startProject(
    user.id,
    PROJECT_NAME.parse(`Interview project ${crypto.randomUUID()}`),
    getConstruct("hippy"),
  );
  if (started.kind !== "started") {
    throw new Error(`The project didn't start: ${started.kind}`);
  }
  return started.chat;
}

// Another chat in the interview chat's project, an open chat with Mr. Tee.
async function startOpenChat(
  user: User,
  interview: ProjectChat,
): Promise<ProjectChat> {
  const project = await getProject(user.id, interview.project.id);
  if (project === undefined) {
    throw new Error("The interview's project is gone");
  }
  const started = await startChat(user.id, {
    project,
    construct: getConstruct("mr-tee"),
    activity: builtInActivity(DEFAULT_ACTIVITY_ID),
  });
  if (started.kind !== "started" || started.chat.project === undefined) {
    throw new Error(`The chat didn't start: ${started.kind}`);
  }
  return { ...started.chat, project: started.chat.project };
}

describe("use_case_project_interview", () => {
  test("the construct saves each answer, then the milestones, as versions by the construct", async () => {
    const user = await testUser();
    const chat = await startInterview(user);

    const saves = [
      await constructEdits(chat.id, "", GOAL),
      await constructEdits(chat.id, "", MILESTONES),
    ];

    for (const save of saves) {
      expect(save).toMatchObject(UPDATED);
    }

    const { text } = await readMemory(user.id, chat.project.id);
    for (const answer of ["A low-poly fox", "Block out"]) {
      expect(text).toContain(answer);
    }
    const history = await readMemoryHistory(user.id, chat.project.id);
    expect(history.map(({ author }) => author)).toEqual([
      "construct",
      "construct",
    ]);
  });

  test("another chat in the project is an open chat, whose prompt has no interview but the memory", async () => {
    const user = await testUser();
    const interview = await startInterview(user);
    await constructEdits(interview.id, "", GOAL);

    const prompt = await constructPrompt(
      (await startOpenChat(user, interview)).id,
    );

    expect(prompt).not.toContain(INTERVIEW_PROMPT);
    expect(prompt).toContain("A low-poly fox");
  });
});

describe("use_case_resume_interview", () => {
  test("the interview chat she comes back to carries on where she left it", async () => {
    const user = await testUser();
    const chat = await startInterview(user);
    await constructReply(chat.id, "I'd like to build a castle.");
    await constructEdits(chat.id, "", "## Goal\n\n- A castle");

    const kept = await listMessages(user.id, chat.id);
    expect(kept.map(messageText)).toContain("I'd like to build a castle.");

    const prompt = await constructPrompt(chat.id);
    expect(prompt).toContain(INTERVIEW_PROMPT);
    expect(prompt).toContain("A castle");
  });
});

describe("use_case_construct_updates_memory", () => {
  test("the construct's change is saved as a version by the construct", async () => {
    const user = await testUser();
    const data = testData(user);
    const chat = await data.chat(await data.project());
    await signIn(user);

    expect(await constructEdits(chat.id, "", "- Finished the roof")).toEqual({
      status: "updated",
      version: 1,
      oldText: "",
      newText: "- Finished the roof",
    });

    expect((await readMemory(user.id, chat.project.id)).text).toContain(
      "- Finished the roof",
    );
    const history = await readMemoryHistory(user.id, chat.project.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ version: 1, author: "construct" });
  });
});
