import { describe, expect, test } from "vitest";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { getActivity } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { readMemory, saveMemory } from "@/memory/memory-store.ts";
import { listProjects } from "@/projects/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  formOf,
  messageText,
} from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const DISCOVERY = getActivity("find-something-to-make");

describe("use_case_start_chat_in_activity", () => {
  test.each([
    { destination: "standalone", questName: undefined, count: 1 },
    {
      destination: "existing",
      questName: "An ongoing creative quest",
      count: 1,
    },
    { destination: "new", questName: "A small experiment", count: 2 },
  ])(
    "discovery starts through the ordinary $destination adventure form",
    async ({ destination, questName, count }) => {
      const user = await testUser();
      const existing = await testData(user).project(
        "An ongoing creative quest",
      );
      await signIn(user);
      let projectId = "";
      if (destination === "existing") {
        projectId = existing.id;
      }
      if (destination === "new") {
        projectId = "new";
      }
      const initial = await readMemory(user.id, existing.id);
      await saveMemory(user.id, {
        projectId: existing.id,
        basedOn: initial.version,
        author: "user",
        text: "Goal: explore small paper sculptures. Next step: try one fold.",
      });
      const memoryBefore = await readMemory(user.id, existing.id);
      const starting = startChatAction(
        { kind: "idle" },
        formOf({
          projectId,
          activityId: DISCOVERY.id,
          constructId: "lumen",
          name: "A small experiment",
        }),
      );
      await Promise.allSettled([starting]);
      const [chat] = await listAllChats(user.id);
      if (chat === undefined) {
        throw new Error("No discovery adventure started");
      }
      await expectRedirect(() => starting, `/chats/${chat.id}`);
      expect(await currentActivity(user.id, chat)).toEqual({
        id: DISCOVERY.id,
        name: DISCOVERY.name,
        definition: DISCOVERY.definition,
      });
      expect(chat.construct).toEqual({
        name: getConstruct("lumen").name,
        definition: getConstruct("lumen").definition,
      });
      const opening = (await listMessages(user.id, chat.id)).map(messageText);
      expect(opening).toEqual([
        preparedOpening(getConstruct("lumen").definition, DISCOVERY.definition),
      ]);
      expect(await goldSpent(user)).toBe(0);
      const projects = await listProjects(user.id);
      expect(chat.project?.name).toBe(questName);
      expect(projects).toHaveLength(count);
      expect(await readMemory(user.id, existing.id)).toEqual(memoryBefore);
      const prompt = await constructPrompt(chat.id);
      expect(prompt).toContain(DISCOVERY.definition.prompt);
    },
  );
});

test("failed generated discovery opening preserves choices and saves no quest or adventure", async () => {
  const user = await testUser();
  await signIn(user);
  const result = await startChatAction(
    { kind: "idle" },
    formOf({
      projectId: "new",
      activityId: DISCOVERY.id,
      constructId: "vellum",
      name: "Creative experiment /mock-error overloaded_error",
      motivation: "I want to try something with paper.",
    }),
  );
  expect(result).toMatchObject({
    kind: "claudeUnavailable",
    projectId: "new",
    activityId: DISCOVERY.id,
    constructId: "vellum",
    motivation: "I want to try something with paper.",
    name: "Creative experiment /mock-error overloaded_error",
  });
  expect(await listAllChats(user.id)).toEqual([]);
  expect(await listProjects(user.id)).toEqual([]);
});
