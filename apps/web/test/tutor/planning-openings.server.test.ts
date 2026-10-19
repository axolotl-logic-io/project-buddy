// Real account preferences, quota and start/store paths, with a recording
// mock at the model boundary: both interview and lesson openings receive
// only the enabled skill instructions, while snapshots keep all saved text.
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, expect, test, vi } from "vitest";
import { saveHiddenExtras, saveUserName } from "@/accounts/users-store.ts";
import { type Buddy, getBuddy } from "@/buddies/index.ts";
import { startChat, startProject } from "@/chats/start-chat.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import type { FlagId } from "@/flags/flags.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type { tutorModel } from "@/tutor/model.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { sessionCookies, signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const model = vi.hoisted(() => ({ tutorModel: vi.fn<typeof tutorModel>() }));
vi.mock("@/tutor/model.ts", () => model);

const recorder = new MockLanguageModelV4({
  doStream: mockTutorModel(() => [
    { text: "What would you like to make?", toolCalls: [] },
  ]).doStream,
});

const CHOICES: readonly { readonly hidden: readonly FlagId[] }[] = [
  { hidden: [] },
  { hidden: ["brainstorming"] },
  { hidden: ["project-breakdown"] },
  { hidden: ["brainstorming", "project-breakdown"] },
];

const SKILL_FLAGS: readonly FlagId[] = ["brainstorming", "project-breakdown"];

const BUDDY: Buddy = {
  ...getBuddy("mr-tee"),
  parts: {
    ...getBuddy("mr-tee").parts,
    brainstorming: "Explore {{name}}'s choices.",
    projectBreakdown: "Plan {{name}}'s milestones.",
  },
};

beforeEach(() => {
  recorder.doStreamCalls.splice(0);
  model.tutorModel.mockReturnValue(recorder);
});

test.each(CHOICES)(
  "saved switches $hidden reach both opening requests",
  async ({ hidden }) => {
    const user = await testUser();
    await saveUserName(user.id, "Mabel");
    await saveHiddenExtras(user.id, hidden);
    await signIn(user);
    const forged = SKILL_FLAGS.filter((flag) => !hidden.includes(flag));
    (await sessionCookies()).set(hiddenFlagsCookie(forged));
    const project = await testData(user).project();

    const interview = await startProject(user.id, "Low-poly fox", BUDDY);
    const lesson = await startChat(user.id, project, BUDDY);

    expect(recorder.doStreamCalls).toHaveLength(2);
    for (const call of recorder.doStreamCalls) {
      const [shared] = call.prompt;
      if (shared?.role !== "system") {
        throw new Error("The opening has no shared system prompt");
      }
      expect(shared.content.includes("Explore Mabel's choices.")).toBe(
        !hidden.includes("brainstorming"),
      );
      expect(shared.content.includes("Plan Mabel's milestones.")).toBe(
        !hidden.includes("project-breakdown"),
      );
    }
    for (const result of [interview, lesson]) {
      expect(result.kind).toBe("started");
      if (result.kind !== "started") {
        throw new Error("The opening did not start a chat");
      }
      expect(result.chat.buddy.parts).toEqual(BUDDY.parts);
    }
  },
);

test("successive openings use their owner, not the browser session or a reused buddy", async () => {
  const [mabel, dipper] = await Promise.all([testUser(), testUser()]);
  await saveUserName(mabel.id, "Mabel");
  await saveUserName(dipper.id, "Dipper");
  await saveHiddenExtras(mabel.id, ["brainstorming"]);
  await saveHiddenExtras(dipper.id, ["project-breakdown"]);
  // Keep the same browser signed in as Mabel for both owners' domain calls.
  // Authentication is the caller's job; prompt construction must use owner.
  await signIn(mabel);
  (await sessionCookies()).set(hiddenFlagsCookie([]));
  const [mabelProject, dipperProject] = await Promise.all([
    testData(mabel).project(),
    testData(dipper).project(),
  ]);
  const mabelInterview = await startProject(mabel.id, "Low-poly fox", BUDDY);
  const mabelLesson = await startChat(mabel.id, mabelProject, BUDDY);
  const dipperInterview = await startProject(dipper.id, "Low-poly fox", BUDDY);
  const dipperLesson = await startChat(dipper.id, dipperProject, BUDDY);

  for (const { results, calls, included, omitted, foreignName } of [
    {
      results: [mabelInterview, mabelLesson],
      calls: recorder.doStreamCalls.slice(0, 2),
      included: "Plan Mabel's milestones.",
      omitted: "Explore Mabel's choices.",
      foreignName: "Dipper",
    },
    {
      results: [dipperInterview, dipperLesson],
      calls: recorder.doStreamCalls.slice(2),
      included: "Explore Dipper's choices.",
      omitted: "Plan Dipper's milestones.",
      foreignName: "Mabel",
    },
  ]) {
    expect(calls).toHaveLength(results.length);
    for (const result of results) {
      expect(result.kind).toBe("started");
      if (result.kind !== "started") {
        throw new Error("The opening did not start a chat");
      }
      expect(result.chat.buddy.parts).toEqual(BUDDY.parts);
    }
    for (const call of calls) {
      const [shared] = call.prompt;
      if (shared?.role !== "system") {
        throw new Error("The opening has no shared system prompt");
      }
      expect(shared.content).toContain(included);
      expect(shared.content).not.toContain(omitted);
      expect(shared.content).not.toContain(foreignName);
    }
  }
  const [first, second, third, fourth] = recorder.doStreamCalls;
  // The chat-specific section differs between an interview and a lesson;
  // the account-specific shared prefix must match within an owner only.
  expect(first?.prompt[0]).toEqual(second?.prompt[0]);
  expect(first?.prompt[0]).not.toEqual(third?.prompt[0]);
  expect(third?.prompt[0]).toEqual(fourth?.prompt[0]);
});
