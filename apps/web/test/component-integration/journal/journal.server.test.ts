import { describe, expect, test, vi } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { changeSectionAction } from "@/journal/journal-actions.ts";
import { readSection, writeSection } from "@/journal/journal-store.ts";
import { runChatCommandAction } from "@/plan/plan-actions.ts";
import { awaitsReply } from "@/plan/plan-message.ts";
import {
  CHANGE_PREFERENCES_TOOL,
  SECTION_OUTPUT,
  SET_GOAL_TOOL,
} from "@/replies/tools/journal-contract.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  constructReply,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

vi.mock("next/cache", async (original) => ({
  ...(await original<typeof import("next/cache")>()),
  refresh: (): void => {
    /* No page in a server test. */
  },
}));

describe("typed Journal sections", () => {
  test("use_case_edit_quest_goal", async () => {
    const { user, chat } = await signedInChat();
    const projectId = chat.project.id;
    const balance = await readGoldBalance(user.id);
    const first = await changeSectionAction({
      projectId,
      kind: "goal",
      basedOn: 0,
      edit: { kind: "goal", text: "Learn shading" },
    });
    expect(first.status).toBe("changed");
    expect(await readGoldBalance(user.id)).toBe(balance);
    expect(
      await changeSectionAction({
        projectId,
        kind: "goal",
        basedOn: 0,
        edit: { kind: "goal", text: "Stale" },
      }),
    ).toMatchObject({ status: "not-changed", reason: "outdated" });
    expect((await readSection(user.id, projectId, "goal"))?.content).toEqual({
      kind: "goal",
      text: "Learn shading",
    });
    expect(
      await changeSectionAction({ projectId, kind: "goal", undo: 1 }),
    ).toMatchObject({
      status: "changed",
      state: { content: { kind: "goal", text: "" }, version: 2 },
    });
    expect(
      (await readSection(user.id, projectId, "goal"))?.history,
    ).toHaveLength(2);
  });
  test("use_case_edit_quest_preferences", async () => {
    const { user, chat } = await signedInChat();
    const balance = await readGoldBalance(user.id);
    expect(
      (
        await runChatCommandAction({
          chatId: chat.id,
          text: "/prefer Short replies",
        })
      ).kind,
    ).toBe("shown");
    expect(
      (
        await runChatCommandAction({
          chatId: chat.id,
          text: "/preference 1 Concrete examples",
        })
      ).kind,
    ).toBe("shown");
    expect(
      (
        await runChatCommandAction({
          chatId: chat.id,
          text: "/prefer Keyboard",
        })
      ).kind,
    ).toBe("shown");
    expect(
      (
        await runChatCommandAction({
          chatId: chat.id,
          text: "/move-preference 2 1",
        })
      ).kind,
    ).toBe("shown");
    expect(
      (await runChatCommandAction({ chatId: chat.id, text: "/unprefer 1" }))
        .kind,
    ).toBe("shown");
    expect(
      (await runChatCommandAction({ chatId: chat.id, text: "/preferences" }))
        .kind,
    ).toBe("shown");
    expect(await readGoldBalance(user.id)).toBe(balance);
    const section = await readSection(user.id, chat.project.id, "preferences");
    expect(section?.content).toEqual({
      kind: "preferences",
      items: [{ number: 2, text: "Keyboard" }],
      nextNumber: 3,
    });
    const messages = await listMessages(user.id, chat.id);
    expect(messages.every((message) => !awaitsReply(message))).toBe(true);
    expect(
      await changeSectionAction({
        projectId: chat.project.id,
        kind: "preferences",
        undo: 5,
      }),
    ).toMatchObject({
      status: "changed",
      state: {
        content: {
          items: [
            { number: 2, text: "Keyboard" },
            { number: 1, text: "Concrete examples" },
          ],
        },
      },
    });
  });
  test("use_case_construct_changes_typed_journal", async () => {
    const { user, chat } = await signedInChat();
    const goalReply = await constructReply(
      chat.id,
      `/mock-tool ${SET_GOAL_TOOL} ${JSON.stringify({ text: "Make a teapot" })}`,
    );
    const [goalPart] = goalReply.parts.filter(
      ({ type }) => type === `tool-${SET_GOAL_TOOL}`,
    );
    expect(
      SECTION_OUTPUT.parse(
        goalPart !== undefined && "output" in goalPart && goalPart.output,
      ),
    ).toMatchObject({ status: "changed", version: 1 });
    const reply = await constructReply(
      chat.id,
      `/mock-tool ${CHANGE_PREFERENCES_TOOL} ${JSON.stringify({ operations: [{ op: "add", text: "Use shortcuts" }] })}`,
    );
    const [part] = reply.parts.filter(
      ({ type }) => type === `tool-${CHANGE_PREFERENCES_TOOL}`,
    );
    expect(
      SECTION_OUTPUT.parse(
        part !== undefined && "output" in part && part.output,
      ),
    ).toMatchObject({ status: "changed", version: 1 });
    const prompt = await constructPrompt(chat.id);
    expect(JSON.stringify(prompt)).toContain("Make a teapot");
    expect(JSON.stringify(prompt)).toContain("Use shortcuts");
    expect(
      (await readSection(user.id, chat.project.id, "goal"))?.history[0]?.author,
    ).toBe("construct");
  });
  test("another owner cannot read, change or undo either section", async () => {
    const [owner, stranger] = await Promise.all([testUser(), testUser()]);
    const quest = await testData(owner).project();
    await writeSection(owner.id, {
      projectId: quest.id,
      kind: "goal",
      author: "person",
      edit: { kind: "goal", text: "Private" },
    });
    expect(await readSection(stranger.id, quest.id, "goal")).toBeUndefined();
    expect(
      await writeSection(stranger.id, {
        projectId: quest.id,
        kind: "goal",
        author: "person",
        undo: 1,
      }),
    ).toMatchObject({ status: "not-changed", reason: "not-found" });
    expect(
      await writeSection(stranger.id, {
        projectId: quest.id,
        kind: "preferences",
        author: "person",
        edit: {
          kind: "preferences",
          operations: [{ op: "add", text: "Intrusion" }],
        },
      }),
    ).toMatchObject({ status: "not-changed", reason: "not-found" });
  });
  test("concurrent edits keep every version and undo refuses later edits", async () => {
    const owner = await testUser();
    const quest = await testData(owner).project();
    const changes = await Promise.all(
      ["First", "Second"].map((text) =>
        writeSection(owner.id, {
          projectId: quest.id,
          kind: "goal",
          author: "construct",
          edit: { kind: "goal", text },
        }),
      ),
    );
    expect(changes.every((result) => result.status === "changed")).toBe(true);
    expect(
      (await readSection(owner.id, quest.id, "goal"))?.history.map(
        ({ version }) => version,
      ),
    ).toEqual([2, 1]);
    expect(
      await writeSection(owner.id, {
        projectId: quest.id,
        kind: "goal",
        author: "person",
        undo: 1,
      }),
    ).toMatchObject({ status: "not-changed", reason: "outdated" });
  });
});
