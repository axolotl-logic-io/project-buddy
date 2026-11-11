import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestTitle } from "@/components/quest-title.tsx";
import { SiteHeader, TrailBand } from "@/components/site-header.tsx";
import { renameProjectAction } from "@/projects/rename-project-action.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { FOX_PROJECT } from "../app/(workspace)/page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

beforeEach(() => vi.clearAllMocks());

// The quest's title is the trail band's heading, which the saved title
// reaches through the action's page refresh. Rename's editor starts from the
// latest title.
function rename(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: PROJECT_COPY.rename });
}
function field(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: PROJECT_COPY.titleLabel });
}

describe("use_case_rename_quest", () => {
  test("saves with Enter and returns focus to Rename", async () => {
    vi.mocked(renameProjectAction).mockResolvedValue({
      kind: "saved",
      name: "Fox den",
    });
    await render(<QuestTitle project={FOX_PROJECT} />);
    await rename().click();
    await expect.element(field()).toHaveFocus();
    await expect.element(field()).toHaveValue(FOX_PROJECT.name);
    await field().fill("Fox den");
    await userEvent.keyboard("{Enter}");
    await expect.element(rename()).toHaveFocus();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(PROJECT_COPY.titleSaved);
    const [, sent] = vi.mocked(renameProjectAction).mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
    expect(sent?.get("name")).toBe("Fox den");
  });
  test.each(["Escape", "Cancel"])("%s discards the draft", async (method) => {
    await render(<QuestTitle project={FOX_PROJECT} />);
    await rename().click();
    await field().fill("Discard me");
    if (method === "Escape") {
      await userEvent.keyboard("{Escape}");
    } else {
      await page
        .getByRole("button", { name: PROJECT_COPY.cancelTitle })
        .click();
    }
    await expect.element(rename()).toHaveFocus();
    expect(renameProjectAction).not.toHaveBeenCalled();
    await rename().click();
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
      await rename().click();
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
        .element(page.getByRole("status"))
        .toHaveTextContent(PROJECT_COPY.titleSaved);
      await expect.element(field()).not.toBeInTheDocument();
    },
  );
  test("pending saves prevent cancellation and duplicate saves", async () => {
    const save =
      Promise.withResolvers<Awaited<ReturnType<typeof renameProjectAction>>>();
    vi.mocked(renameProjectAction).mockReturnValue(save.promise);
    await render(<QuestTitle project={FOX_PROJECT} />);
    await rename().click();
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
    await expect.element(rename()).toHaveFocus();
  });
});

test("the title band offers an accessible pencil and keeps the name visible while editing", async () => {
  await render(
    <SiteHeader
      links={
        <TrailBand
          items={[
            {
              label: FOX_PROJECT.name,
              action: <QuestTitle project={FOX_PROJECT} />,
            },
          ]}
        />
      }
    />,
  );
  const heading = page.getByRole("heading", {
    level: 1,
    name: FOX_PROJECT.name,
  });
  await expect.element(heading).toBeVisible();
  await expect.element(rename()).toBeVisible();
  expect(rename().element().textContent).toBe("");
  await rename().click();
  await expect.element(page.getByRole("dialog")).toBeVisible();
  await expect.element(field()).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(rename()).toHaveFocus();
});
