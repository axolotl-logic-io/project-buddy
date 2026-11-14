import { describe, expect, test, vi } from "vitest";
import { IDEA_TEXT_MAX_LENGTH } from "@/ideas/idea.ts";
import { changeIdeaAction } from "@/ideas/idea-actions.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import { changePlan, readPlan } from "@/plan/plan-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

describe("use_case_quest_ideas", () => {
  test("ideas persist, can be edited and removed, and move into Plan once", async () => {
    const user = await testUser();
    const quest = await testData(user).quest();
    await signIn(user);
    expect(
      await changeIdeaAction({
        op: "add",
        questId: quest.id,
        text: "Try watercolours",
      }),
    ).toEqual({ kind: "saved" });
    const [idea] = await listIdeas(user.id, quest.id);
    expect(idea?.text).toBe("Try watercolours");
    expect(await readPlan(user.id, quest.id)).toMatchObject({ steps: [] });
    expect(
      await changeIdeaAction({
        op: "edit",
        questId: quest.id,
        id: idea?.id,
        text: "Try ink",
      }),
    ).toEqual({ kind: "saved" });
    const outcomes = await Promise.all([
      changeIdeaAction({ op: "move", questId: quest.id, id: idea?.id }),
      changeIdeaAction({ op: "move", questId: quest.id, id: idea?.id }),
    ]);
    expect(outcomes.filter((outcome) => outcome.kind === "saved")).toHaveLength(
      1,
    );
    expect(await listIdeas(user.id, quest.id)).toEqual([]);
    expect((await readPlan(user.id, quest.id))?.steps).toMatchObject([
      { text: "Try ink", done: false },
    ]);
    await changeIdeaAction({
      op: "add",
      questId: quest.id,
      text: "Try charcoal",
    });
    const [second] = await listIdeas(user.id, quest.id);
    expect(
      await changeIdeaAction({
        op: "remove",
        questId: quest.id,
        id: second?.id,
      }),
    ).toEqual({ kind: "saved" });
    expect(await listIdeas(user.id, quest.id)).toEqual([]);
  });

  test("another user cannot read or change ideas, and invalid input saves nothing", async () => {
    const owner = await testUser();
    const quest = await testData(owner).quest();
    await signIn(owner);
    await changeIdeaAction({
      op: "add",
      questId: quest.id,
      text: "Private idea",
    });
    const [idea] = await listIdeas(owner.id, quest.id);
    const stranger = await testUser();
    await signIn(stranger);
    expect(await listIdeas(stranger.id, quest.id)).toEqual([]);
    const denied = await Promise.all(
      ["add", "edit", "remove", "move"].map((op) =>
        changeIdeaAction({
          op,
          questId: quest.id,
          id: idea?.id,
          text: "Other text",
        }),
      ),
    );
    expect(denied.every((result) => result.kind === "problem")).toBe(true);
    expect(await listIdeas(owner.id, quest.id)).toEqual([idea]);
    await signIn(owner);
    const invalid = await Promise.all(
      ["   ", "x".repeat(IDEA_TEXT_MAX_LENGTH + 1)].map((text) =>
        changeIdeaAction({ op: "add", questId: quest.id, text }),
      ),
    );
    expect(invalid.every((result) => result.kind === "problem")).toBe(true);
    expect(
      await changeIdeaAction({ op: "move", questId: "bad", id: "bad" }),
    ).toMatchObject({ kind: "problem" });
    expect(await listIdeas(owner.id, quest.id)).toEqual([idea]);
  });

  test("new ideas go first, saved order persists and reordering stays owner-scoped", async () => {
    const owner = await testUser();
    const quest = await testData(owner).quest();
    await signIn(owner);
    await changeIdeaAction({ op: "add", questId: quest.id, text: "First" });
    await changeIdeaAction({ op: "add", questId: quest.id, text: "Second" });
    await changeIdeaAction({ op: "add", questId: quest.id, text: "Third" });
    const initial = await listIdeas(owner.id, quest.id);
    expect(initial.map((idea) => idea.text)).toEqual([
      "Third",
      "Second",
      "First",
    ]);
    const [third, second, first] = initial;
    expect(
      await changeIdeaAction({
        op: "reorder",
        questId: quest.id,
        id: first?.id,
        before: third?.id,
      }),
    ).toEqual({ kind: "saved" });
    expect(await listIdeas(owner.id, quest.id)).toEqual([first, third, second]);
    await changeIdeaAction({ op: "add", questId: quest.id, text: "Fourth" });
    const after = await listIdeas(owner.id, quest.id);
    expect(after.map((idea) => idea.text)).toEqual([
      "Fourth",
      "First",
      "Third",
      "Second",
    ]);
    expect(
      await changeIdeaAction({
        op: "reorder",
        questId: quest.id,
        id: third?.id,
      }),
    ).toEqual({ kind: "saved" });
    const moved = await listIdeas(owner.id, quest.id);
    expect(moved.map((idea) => idea.text)).toEqual([
      "Fourth",
      "First",
      "Second",
      "Third",
    ]);
    const stranger = await testUser();
    await signIn(stranger);
    expect(
      await changeIdeaAction({
        op: "reorder",
        questId: quest.id,
        id: first?.id,
        before: second?.id,
      }),
    ).toMatchObject({ kind: "problem" });
    expect(await listIdeas(owner.id, quest.id)).toEqual(moved);
    const otherQuest = await testData(stranger).quest();
    await changeIdeaAction({
      op: "add",
      questId: otherQuest.id,
      text: "Foreign",
    });
    const [foreign] = await listIdeas(stranger.id, otherQuest.id);
    await signIn(owner);
    expect(
      await changeIdeaAction({
        op: "reorder",
        questId: quest.id,
        id: first?.id,
        before: foreign?.id,
      }),
    ).toMatchObject({ kind: "problem" });
    expect(await listIdeas(owner.id, quest.id)).toEqual(moved);
  });

  test("an idea can move into a Plan beyond the former step limit", async () => {
    const ManySteps = 40;
    const user = await testUser();
    const quest = await testData(user).quest();
    await signIn(user);
    await changePlan(
      user.id,
      { questId: quest.id, author: "person" },
      Array.from({ length: ManySteps }, (_, index) => ({
        op: "add",
        text: `Step ${index}`,
      })),
    );
    await changeIdeaAction({ op: "add", questId: quest.id, text: "Later" });
    const [idea] = await listIdeas(user.id, quest.id);
    expect(
      await changeIdeaAction({ op: "move", questId: quest.id, id: idea?.id }),
    ).toMatchObject({ kind: "saved" });
    expect(await listIdeas(user.id, quest.id)).toEqual([]);
    expect((await readPlan(user.id, quest.id))?.steps).toHaveLength(
      ManySteps + 1,
    );
  });
});
