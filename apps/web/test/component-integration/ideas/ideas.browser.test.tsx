import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { IDEA, type IdeaAction } from "@/ideas/idea.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";

const ACTIONS_NAME = /Actions for/u;
const IDEA_FIXTURE = IDEA.parse({
  id: "11111111-1111-4111-8111-111111111111",
  text: "Try watercolours",
});

test("an idea can be edited and moved, with feedback and retained focus", async () => {
  const action = vi.fn<IdeaAction>().mockResolvedValue({ kind: "saved" });
  await render(
    <QuestIdeas
      questId={FOX_QUEST.id}
      ideas={[IDEA_FIXTURE]}
      action={action}
    />,
  );
  await page.getByRole("button", { name: "Edit idea" }).click();
  await page
    .getByRole("textbox", { name: "Idea", exact: true })
    .first()
    .fill("Try ink");
  await page.getByRole("button", { name: "Save idea" }).click();
  expect(action).toHaveBeenLastCalledWith({
    op: "edit",
    questId: FOX_QUEST.id,
    id: IDEA_FIXTURE.id,
    text: "Try ink",
  });
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Idea saved.");
  await page.getByRole("button", { name: ACTIONS_NAME }).click();
  await page.getByRole("menuitem", { name: "Move to Plan" }).click();
  expect(action).toHaveBeenLastCalledWith({
    op: "move",
    questId: FOX_QUEST.id,
    id: IDEA_FIXTURE.id,
  });
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Idea moved to Plan.");
  await expect
    .element(page.getByRole("heading", { name: "Ideas" }))
    .toHaveFocus();
  await expect
    .element(page.getByText("No ideas yet.", { exact: false }))
    .toBeVisible();
});

test("a failed add keeps the draft and a failed move keeps the idea", async () => {
  const action = vi
    .fn<IdeaAction>()
    .mockResolvedValue({ kind: "problem", text: "Please try again." });
  await render(
    <QuestIdeas
      questId={FOX_QUEST.id}
      ideas={[IDEA_FIXTURE]}
      action={action}
    />,
  );
  await page.getByRole("button", { name: "Add idea", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Idea", exact: true }).last();
  await input.fill("Try charcoal");
  await page.getByRole("button", { name: "Add idea" }).click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Please try again.");
  await expect.element(input).toHaveValue("Try charcoal");
  await page.getByRole("button", { name: ACTIONS_NAME }).click();
  await page.getByRole("menuitem", { name: "Move to Plan" }).click();
  await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
});

test("an all-space idea shows validation feedback without saving", async () => {
  const action = vi.fn<IdeaAction>();
  await render(
    <QuestIdeas questId={FOX_QUEST.id} ideas={[]} action={action} />,
  );
  await page.getByRole("button", { name: "Add idea", exact: true }).click();
  await page.getByRole("textbox", { name: "Idea", exact: true }).fill("   ");
  await page.getByRole("button", { name: "Add idea" }).click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Enter an idea of 1 to 200 characters.");
  expect(action).not.toHaveBeenCalled();
});

test("saved ideas stay readable until edited and cancelling keeps their text", async () => {
  const action = vi.fn<IdeaAction>();
  await render(
    <QuestIdeas
      embedded={true}
      questId={FOX_QUEST.id}
      ideas={[IDEA_FIXTURE]}
      action={action}
    />,
  );
  await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
  expect(page.getByRole("textbox").all()).toHaveLength(0);
  await page.getByRole("button", { name: "Edit idea" }).click();
  const edit = page.getByRole("textbox", { name: "Idea", exact: true }).first();
  await expect.element(edit).toHaveFocus();
  await edit.fill("Discard this edit");
  await page.getByRole("button", { name: "Cancel idea edit" }).click();
  await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Edit idea" }))
    .toHaveFocus();
  expect(action).not.toHaveBeenCalled();
});

test.each(["pointer", "keyboard"])(
  "reorders ideas with the shared %s handle",
  async (method) => {
    const second = IDEA.parse({
      id: "22222222-2222-4222-8222-222222222222",
      text: "Try charcoal",
    });
    const action = vi.fn<IdeaAction>().mockResolvedValue({ kind: "saved" });
    await render(
      <QuestIdeas
        questId={FOX_QUEST.id}
        ideas={[IDEA_FIXTURE, second]}
        action={action}
      />,
    );
    const handle = page.getByRole("button", {
      name: `Reorder “${second.text}”`,
    });
    if (method === "pointer") {
      await userEvent.dragAndDrop(
        handle,
        page.getByRole("button", { name: "Edit idea", exact: true }).first(),
        { targetPosition: { x: 1, y: 1 } },
      );
    } else {
      handle.element().focus();
      await userEvent.keyboard("{ArrowUp}");
    }
    expect(action).toHaveBeenCalledWith({
      op: "reorder",
      questId: FOX_QUEST.id,
      id: second.id,
      before: IDEA_FIXTURE.id,
    });
    await expect
      .element(
        page.getByRole("list", { name: "Ideas" }).getByRole("listitem").first(),
      )
      .toMatchTextContent(second.text);
    await expect.element(handle).toHaveFocus();
  },
);
