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
