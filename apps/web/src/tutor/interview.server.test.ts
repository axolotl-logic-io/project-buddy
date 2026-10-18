// A new project's interview, in the test database with the mock tutor: only
// the project's interview chat has the interview in its prompt, with the
// memory so far, and the tutor saves each answer as a version of the
// memory. That the interview ends once the memory holds her goal, skill
// level, purpose and milestones is the real-Claude smoke test's to check
// (use-cases/README.md).
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { startChat, startProject } from "@/chats/start-chat.ts";
import { listMessages } from "@/chats/store.ts";
import { readMemory, readMemoryHistory } from "@/memory/memory-store.ts";
import { getProject } from "@/projects/store.ts";
import {
  messageText,
  tutorEdits,
  tutorPrompt,
  tutorReply,
} from "@/test-database/chat-test-kit.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import { signIn } from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import { EMPTY_MEMORY_PROMPT } from "@/tutor/memory-prompt.ts";

// The heading of the interview's part of the tutor's prompt.
const INTERVIEW_PROMPT = "# The project interview";

const GOAL = "## Goal\n\n- A low-poly fox";
const SKILL = "## Skill level\n\n- beginner";
const PURPOSE = "## Purpose\n\n- game";
const MILESTONES = "## Milestones\n\n- [ ] Block out the body";

// What the tutor's update_memory answers when it saved a change.
const UPDATED = { status: "updated" };

// A new project of the signed-in user's, through the site's own start, and
// its interview chat, with Hippy.
async function startInterview(user: User): Promise<Chat> {
  await signIn(user);
  const started = await startProject(
    user.id,
    `Interview project ${crypto.randomUUID()}`,
    getBuddy("hippy"),
  );
  if (started.kind !== "started") {
    throw new Error(`The project didn't start: ${started.kind}`);
  }
  return started.chat;
}

// A lesson in the interview chat's project, with Mr. Tee.
async function startLesson(user: User, interview: Chat): Promise<Chat> {
  const project = await getProject(user.id, interview.projectId);
  if (project === undefined) {
    throw new Error("The interview's project is gone");
  }
  const started = await startChat(user.id, project, getBuddy("mr-tee"));
  if (started.kind !== "started") {
    throw new Error(`The lesson didn't start: ${started.kind}`);
  }
  return started.chat;
}

describe("use_case_project_interview", () => {
  test("the interview chat's prompt holds the interview and the memory so far", async () => {
    const chat = await startInterview(await testUser());

    const before = await tutorPrompt(chat.id);
    expect(before).toContain(INTERVIEW_PROMPT);
    expect(before).toContain(EMPTY_MEMORY_PROMPT);

    expect(await tutorEdits(chat.id, "", GOAL)).toMatchObject(UPDATED);
    const after = await tutorPrompt(chat.id);
    expect(after).toContain(INTERVIEW_PROMPT);
    expect(after).toContain("A low-poly fox");
  });

  test("the tutor saves each answer, then the milestones, as versions by the tutor", async () => {
    const user = await testUser();
    const chat = await startInterview(user);

    const saves = [
      await tutorEdits(chat.id, "", GOAL),
      await tutorEdits(chat.id, "", SKILL),
      await tutorEdits(chat.id, "", PURPOSE),
      await tutorEdits(chat.id, "", MILESTONES),
    ];

    for (const save of saves) {
      expect(save).toMatchObject(UPDATED);
    }

    const { text } = await readMemory(user.id, chat.projectId);
    for (const answer of ["A low-poly fox", "beginner", "game", "Block out"]) {
      expect(text).toContain(answer);
    }
    const history = await readMemoryHistory(user.id, chat.projectId);
    expect(history.map(({ author }) => author)).toEqual([
      "tutor",
      "tutor",
      "tutor",
      "tutor",
    ]);
  });

  test("another chat in the project is a lesson, whose prompt has no interview but the memory", async () => {
    const user = await testUser();
    const interview = await startInterview(user);
    await tutorEdits(interview.id, "", GOAL);

    const prompt = await tutorPrompt((await startLesson(user, interview)).id);

    expect(prompt).not.toContain(INTERVIEW_PROMPT);
    expect(prompt).toContain("A low-poly fox");
  });
});

describe("use_case_resume_interview", () => {
  test("the interview chat she comes back to carries on where she left it", async () => {
    const user = await testUser();
    const chat = await startInterview(user);
    await tutorReply(chat.id, "I'd like to build a castle.");
    await tutorEdits(chat.id, "", "## Goal\n\n- A castle");

    const kept = await listMessages(user.id, chat.id);
    expect(kept.map(messageText)).toContain("I'd like to build a castle.");

    const prompt = await tutorPrompt(chat.id);
    expect(prompt).toContain(INTERVIEW_PROMPT);
    expect(prompt).toContain("A castle");

    await tutorEdits(chat.id, "", SKILL);
    const { text } = await readMemory(user.id, chat.projectId);
    expect(text).toContain("A castle");
    expect(text).toContain("beginner");
  });
});

describe("use_case_tutor_updates_memory", () => {
  test("the tutor's change is saved as a version by the tutor", async () => {
    const user = await testUser();
    const data = testData(user);
    const chat = await data.chat(await data.project());
    await signIn(user);

    expect(await tutorEdits(chat.id, "", "- Finished the roof")).toEqual({
      status: "updated",
      version: 1,
      oldText: "",
      newText: "- Finished the roof",
    });

    expect((await readMemory(user.id, chat.projectId)).text).toContain(
      "- Finished the roof",
    );
    const history = await readMemoryHistory(user.id, chat.projectId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ version: 1, author: "tutor" });
  });
});
