import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestTitle } from "@/components/quest-title.tsx";
import { renameProjectAction } from "@/projects/rename-project-action.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { FOX_PROJECT } from "../app/(workspace)/page-fixtures.ts";

beforeEach(() => vi.clearAllMocks());

function pencil(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: PROJECT_COPY.rename });
}
function field(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: PROJECT_COPY.titleLabel });
}

describe("use_case_rename_quest", () => {
  test("saves with Enter and returns focus to the pencil", async () => {
    vi.mocked(renameProjectAction).mockResolvedValue({
      kind: "saved",
      name: "Fox den",
    });
    await render(<QuestTitle project={FOX_PROJECT} />);
    await pencil().click();
    await expect.element(field()).toHaveFocus();
    await expect.element(field()).toHaveValue(FOX_PROJECT.name);
    await field().fill("Fox den");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("heading", { name: "Fox den" }))
      .toBeVisible();
    await expect.element(pencil()).toHaveFocus();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(PROJECT_COPY.titleSaved);
    const [, sent] = vi.mocked(renameProjectAction).mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
    expect(sent?.get("name")).toBe("Fox den");
  });
  test.each(["Escape", "Cancel"])("%s discards the draft", async (method) => {
    await render(<QuestTitle project={FOX_PROJECT} />);
    await pencil().click();
    await field().fill("Discard me");
    if (method === "Escape") {
      await userEvent.keyboard("{Escape}");
    } else {
      await page
        .getByRole("button", { name: PROJECT_COPY.cancelTitle })
        .click();
    }
    await expect.element(pencil()).toHaveFocus();
    expect(renameProjectAction).not.toHaveBeenCalled();
    await pencil().click();
    await expect.element(field()).toHaveValue(FOX_PROJECT.name);
  });
  test.each(["A quest needs a name.", "Storage is unavailable."])(
    "keeps the draft after %s and allows retry",
    async (message) => {
      vi.mocked(renameProjectAction).mockResolvedValue({
        kind: "invalid",
        message,
      });
      await render(<QuestTitle project={FOX_PROJECT} />);
      await pencil().click();
      await field().fill("My draft");
      await page.getByRole("button", { name: PROJECT_COPY.saveTitle }).click();
      await expect.element(page.getByRole("alert")).toHaveTextContent(message);
      await expect.element(field()).toHaveValue("My draft");
      await expect.element(field()).toHaveAttribute("aria-invalid", "true");
      vi.mocked(renameProjectAction).mockResolvedValue({
        kind: "saved",
        name: "My draft",
      });
      await page.getByRole("button", { name: PROJECT_COPY.saveTitle }).click();
      await expect
        .element(page.getByRole("heading", { name: "My draft" }))
        .toBeVisible();
    },
  );
  test("pending saves prevent cancellation and duplicate saves", async () => {
    const save =
      Promise.withResolvers<Awaited<ReturnType<typeof renameProjectAction>>>();
    vi.mocked(renameProjectAction).mockReturnValue(save.promise);
    await render(<QuestTitle project={FOX_PROJECT} />);
    await pencil().click();
    await page.getByRole("button", { name: PROJECT_COPY.saveTitle }).click();
    await expect
      .element(page.getByRole("button", { name: PROJECT_COPY.saveTitle }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: PROJECT_COPY.cancelTitle }))
      .toBeDisabled();
    field().element().focus();
    await userEvent.keyboard("{Escape}");
    await expect.element(field()).toBeVisible();
    expect(renameProjectAction).toHaveBeenCalledTimes(1);
    save.resolve({ kind: "saved", name: FOX_PROJECT.name });
    await expect.element(pencil()).toHaveFocus();
  });
  test("members have no edit control", async () => {
    await render(<QuestTitle project={{ ...FOX_PROJECT, role: "member" }} />);
    await expect
      .element(page.getByRole("heading", { name: FOX_PROJECT.name }))
      .toBeVisible();
    await expect.element(pencil()).not.toBeInTheDocument();
  });
});
