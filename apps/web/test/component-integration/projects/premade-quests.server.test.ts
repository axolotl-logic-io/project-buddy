import { describe, expect, test } from "vitest";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { createActivity } from "@/activities/activity-store.ts";
import { startPremadeQuestAction } from "@/app/(workspace)/projects/premade-actions.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { saveInterviewConstruct } from "@/constructs/interview-construct.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { PREMADE_QUESTS } from "@/projects/premade-quests.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { getProject, listProjects } from "@/projects/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

describe("use_case_start_premade_quest", () => {
  test.each(PREMADE_QUESTS)(
    "$name creates an ordinary private quest with editable plans and the selected activity",
    async (quest) => {
      const [user, stranger] = await Promise.all([testUser(), testUser()]);
      await signIn(user);
      await saveInterviewConstruct(user.id, "lumen");
      const choices = await questCreationChoices(user.id);
      expect(choices.preferredConstructId).toBe("lumen");
      const starting = startPremadeQuestAction(
        { kind: "idle" },
        formOf({
          name: `${quest.name} for me`,
          journal: `${quest.journal}\n\nMy own plan.`,
          motivation: "Make a gift",
          activityId: quest.activityId,
          constructId: choices.preferredConstructId,
        }),
      );
      await Promise.allSettled([starting]);
      const [saved] = await listProjects(user.id);
      if (saved === undefined) {
        throw new Error("No quest created");
      }
      const [chat] = await listChats(user.id, saved.id);
      if (chat === undefined) {
        throw new Error("No adventure created");
      }
      await expectRedirect(() => starting, `/chats/${chat.id}`);
      expect(saved).toMatchObject({
        name: `${quest.name} for me`,
        role: "owner",
        shared: false,
        status: "active",
      });
      expect(chat.construct.name).toBe("Lumen");
      expect((await currentActivity(user.id, chat)).id).toBe(quest.activityId);
      expect(await listMessages(user.id, chat.id)).toHaveLength(1);
      expect((await readMemory(user.id, saved.id)).text).toBe(
        `${quest.journal}\n\nMy own plan.\n\nMake a gift`,
      );
      expect(await listMilestones(user.id, saved.id)).toEqual([]);
      expect(await getProject(stranger.id, saved.id)).toBeUndefined();
      expect(await getChat(stranger.id, chat.id)).toBeUndefined();
      expect((await readMemory(stranger.id, saved.id)).text).toBe("");
    },
  );

  test("another available activity and construct replace the suggested choices", async () => {
    const user = await testUser();
    const activity = await createActivity(user.id, {
      name: "My activity",
      definition: {
        prompt: "Help explore an idea.",
        openingRequest: "Ask about an idea.",
      },
    });
    const construct = await testData(user).editedConstruct();
    await signIn(user);
    const starting = startPremadeQuestAction(
      { kind: "idle" },
      formOf({
        name: "My idea",
        journal: "My starting point",
        motivation: "",
        activityId: activity.id,
        constructId: construct.id,
      }),
    );
    await Promise.allSettled([starting]);
    const [saved] = await listProjects(user.id);
    if (saved === undefined) {
      throw new Error("No quest created");
    }
    const [chat] = await listChats(user.id, saved.id);
    if (chat === undefined) {
      throw new Error("No adventure created");
    }
    await expectRedirect(() => starting, `/chats/${chat.id}`);
    expect(chat.construct.name).toBe(construct.name);
    expect((await currentActivity(user.id, chat)).id).toBe(activity.id);
  });

  test.each(["name", "construct", "activity", "opening"])(
    "%s refusal saves nothing",
    async (failure) => {
      const [user, stranger] = await Promise.all([testUser(), testUser()]);
      const construct = await testData(user).editedConstruct();
      const foreign = await testData(stranger).editedConstruct();
      await signIn(user);
      const details = {
        name: "My idea",
        journal: "My plan",
        motivation: "My reason",
        activityId: "brainstorming",
        constructId: construct.id,
      };
      let changes: Record<string, string> = { name: " " };
      if (failure === "construct") {
        changes = { constructId: foreign.id };
      }
      if (failure === "activity") {
        changes = { activityId: "missing" };
      }
      if (failure === "opening") {
        changes = { name: "Idea /mock-error overloaded_error" };
      }
      const result = await startPremadeQuestAction(
        { kind: "idle" },
        formOf({ ...details, ...changes }),
      );
      let expected = "invalid";
      if (failure === "opening") {
        expected = "claudeUnavailable";
      }
      expect(result.kind).toBe(expected);
      expect(await listProjects(user.id)).toEqual([]);
    },
  );
});
