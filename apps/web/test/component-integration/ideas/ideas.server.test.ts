// A quest's Ideas against the test database, changed with the /idea
// commands that the Ideas tab's controls send to the quest's conversation.

import { describe, expect, test, vi } from "vitest";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { IDEA_TEXT_MAX_LENGTH } from "@/ideas/idea.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import { changeTasks, readTasks } from "@/tasks/tasks-store.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { commandNotes, runCommand } from "../commands/command-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const notes: typeof PANEL_COMMANDS_COPY.notes = PANEL_COMMANDS_COPY.notes;
const problems: typeof PANEL_COMMANDS_COPY.problems =
  PANEL_COMMANDS_COPY.problems;

// Places in a list of ideas.
const Third = 3;
const Fourth = 4;
const PastEnd = 5;

// A signed-in user's quest and its conversation.
async function signedInQuest(): Promise<{
  readonly user: Awaited<ReturnType<typeof testUser>>;
  readonly quest: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  readonly chat: Awaited<ReturnType<ReturnType<typeof testData>["chat"]>>;
}> {
  const user = await testUser();
  const data = testData(user);
  const quest = await data.quest();
  const chat = await data.chat(quest);
  await signIn(user);
  return { user, quest, chat };
}

async function ideaTexts(
  user: { readonly id: Parameters<typeof listIdeas>[0] },
  questId: Parameters<typeof listIdeas>[1],
): Promise<string[]> {
  return (await listIdeas(user.id, questId)).map((idea) => idea.text);
}

describe("use_case_quest_ideas", () => {
  test("ideas persist, can be edited and removed, and move into Tasks once, each noted in the conversation", async () => {
    const { user, quest, chat } = await signedInQuest();
    expect(
      await runCommand(chat.id, PANEL_COMMAND.idea("Try watercolours")),
    ).toMatchObject({ kind: "noted", note: notes.idea("Try watercolours") });
    expect(await ideaTexts(user, quest.id)).toEqual(["Try watercolours"]);
    expect(await readTasks(user.id, quest.id)).toMatchObject({ items: [] });
    expect(
      await runCommand(chat.id, PANEL_COMMAND.editIdea(1, "Try ink")),
    ).toMatchObject({ kind: "noted", note: notes.editIdea(1, "Try ink") });
    const outcomes = await Promise.all([
      runCommand(chat.id, PANEL_COMMAND.ideaToTasks(1)),
      runCommand(chat.id, PANEL_COMMAND.ideaToTasks(1)),
    ]);
    expect(outcomes.filter((outcome) => outcome.kind === "noted")).toEqual([
      expect.objectContaining({ note: notes.ideaToTasks("Try ink") }),
    ]);
    expect(await listIdeas(user.id, quest.id)).toEqual([]);
    expect((await readTasks(user.id, quest.id))?.items).toMatchObject([
      { text: "Try ink", done: false },
    ]);
    await runCommand(chat.id, PANEL_COMMAND.idea("Try charcoal"));
    expect(await runCommand(chat.id, PANEL_COMMAND.dropIdea(1))).toMatchObject({
      kind: "noted",
      note: notes.dropIdea("Try charcoal"),
    });
    expect(await listIdeas(user.id, quest.id)).toEqual([]);
    expect(await commandNotes(user.id, chat.id)).toEqual([
      {
        command: PANEL_COMMAND.idea("Try watercolours"),
        note: notes.idea("Try watercolours"),
      },
      {
        command: PANEL_COMMAND.editIdea(1, "Try ink"),
        note: notes.editIdea(1, "Try ink"),
      },
      {
        command: PANEL_COMMAND.ideaToTasks(1),
        note: notes.ideaToTasks("Try ink"),
      },
      {
        command: PANEL_COMMAND.idea("Try charcoal"),
        note: notes.idea("Try charcoal"),
      },
      {
        command: PANEL_COMMAND.dropIdea(1),
        note: notes.dropIdea("Try charcoal"),
      },
    ]);
  });

  test("another user's conversation is not found, and invalid commands say why and save nothing", async () => {
    const { user: owner, quest, chat } = await signedInQuest();
    await runCommand(chat.id, PANEL_COMMAND.idea("Private idea"));
    const ideas = await listIdeas(owner.id, quest.id);
    const stranger = await testUser();
    await signIn(stranger);
    expect(await listIdeas(stranger.id, quest.id)).toEqual([]);
    const denied = await Promise.all(
      [
        PANEL_COMMAND.idea("Other text"),
        PANEL_COMMAND.editIdea(1, "Other text"),
        PANEL_COMMAND.moveIdea(1, 1),
        PANEL_COMMAND.dropIdea(1),
        PANEL_COMMAND.ideaToTasks(1),
      ].map((text) => runCommand(chat.id, text)),
    );
    expect(denied).toEqual(denied.map(() => ({ kind: "not-found" })));
    expect(await listIdeas(owner.id, quest.id)).toEqual(ideas);

    await signIn(owner);
    expect(
      await Promise.all(
        [
          "/idea   ",
          PANEL_COMMAND.idea("x".repeat(IDEA_TEXT_MAX_LENGTH + 1)),
          PANEL_COMMAND.editIdea(1, " "),
          PANEL_COMMAND.editIdea(2, "Elsewhere"),
          PANEL_COMMAND.dropIdea(0),
          `${PANEL_COMMAND.dropIdea(1)} extra`,
          PANEL_COMMAND.moveIdea(1, 2),
        ].map((text) => runCommand(chat.id, text)),
      ),
    ).toEqual(
      [
        problems.noText("idea"),
        problems.ideaTooLong,
        problems.noText("edit-idea"),
        problems.noIdea(1),
        problems.noIdea(1),
        problems.noIdea(1),
        problems.noIdeaPlace(1),
      ].map((text) => ({ kind: "problem", text })),
    );
    expect(await listIdeas(owner.id, quest.id)).toEqual(ideas);
    expect(await commandNotes(owner.id, chat.id)).toHaveLength(1);
  });

  test("new ideas go first, and /move-idea's order persists", async () => {
    const { user, quest, chat } = await signedInQuest();
    await runCommand(chat.id, PANEL_COMMAND.idea("First"));
    await runCommand(chat.id, PANEL_COMMAND.idea("Second"));
    await runCommand(chat.id, PANEL_COMMAND.idea("Third"));
    expect(await ideaTexts(user, quest.id)).toEqual([
      "Third",
      "Second",
      "First",
    ]);
    expect(
      await runCommand(chat.id, PANEL_COMMAND.moveIdea(Third, 1)),
    ).toMatchObject({ kind: "noted", note: notes.moveIdea("First", 1) });
    expect(await ideaTexts(user, quest.id)).toEqual([
      "First",
      "Third",
      "Second",
    ]);
    await runCommand(chat.id, PANEL_COMMAND.idea("Fourth"));
    expect(await ideaTexts(user, quest.id)).toEqual([
      "Fourth",
      "First",
      "Third",
      "Second",
    ]);
    expect(
      await runCommand(chat.id, PANEL_COMMAND.moveIdea(Third, Fourth)),
    ).toMatchObject({ kind: "noted", note: notes.moveIdea("Third", Fourth) });
    const moved = await listIdeas(user.id, quest.id);
    expect(moved.map((idea) => idea.text)).toEqual([
      "Fourth",
      "First",
      "Second",
      "Third",
    ]);
    expect(
      await runCommand(chat.id, PANEL_COMMAND.moveIdea(1, PastEnd)),
    ).toEqual({
      kind: "problem",
      text: problems.noIdeaPlace(Fourth),
    });
    expect(await listIdeas(user.id, quest.id)).toEqual(moved);
  });

  test("an idea can move into a Tasks beyond the former task limit", async () => {
    const ManyTasks = 40;
    const { user, quest, chat } = await signedInQuest();
    await changeTasks(
      user.id,
      { questId: quest.id, author: "person" },
      Array.from({ length: ManyTasks }, (_, index) => ({
        op: "add",
        text: `Task ${index}`,
      })),
    );
    await runCommand(chat.id, PANEL_COMMAND.idea("Later"));
    expect(
      await runCommand(chat.id, PANEL_COMMAND.ideaToTasks(1)),
    ).toMatchObject({ kind: "noted" });
    expect(await listIdeas(user.id, quest.id)).toEqual([]);
    expect((await readTasks(user.id, quest.id))?.items).toHaveLength(
      ManyTasks + 1,
    );
  });
});
