import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { BATTERY_PURCHASES_COPY } from "@/ui/copy/battery-purchases.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);
afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_new_project", () => {
  test("sends only the selected construct and optional Why", async () => {
    actions.createProjectAction.mockResolvedValue({
      kind: "invalid",
      message: "Try again",
    });
    await render(<NewProjectForm />);
    await expect
      .element(page.getByRole("group", { name: NEW_CHAT_COPY.constructLabel }))
      .toHaveAccessibleDescription(PROJECTS_COPY.constructHint);
    expect(document.querySelectorAll("textarea")).toHaveLength(1);
    await page
      .getByRole("textbox", { name: PROJECTS_COPY.whyLabel })
      .fill("A gift for a friend");
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.nextConstruct })
      .click();
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
    await expect
      .element(page.getByText("Try again", { exact: true }))
      .toBeVisible();
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(sent?.get("motivation")).toBe("A gift for a friend");
    expect(sent?.get("constructId")).not.toBe("vellum");
    expect(sent?.has("name")).toBe(false);
    expect(sent?.has("activityId")).toBe(false);
    await expect
      .element(page.getByRole("textbox", { name: PROJECTS_COPY.whyLabel }))
      .toHaveValue("A gift for a friend");
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
    const [, retry] = actions.createProjectAction.mock.lastCall ?? [];
    expect(retry?.get("constructId")).toBe(sent?.get("constructId"));
  });
  test("Why remains optional", async () => {
    actions.createProjectAction.mockResolvedValue({
      kind: "invalid",
      message: "Try again",
    });
    await render(<NewProjectForm />);
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
    await expect
      .element(page.getByText("Try again", { exact: true }))
      .toBeVisible();
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(sent?.get("motivation")).toBe("");
  });
});

test("out-of-batteries refusal keeps Why and the construct and shows purchase availability", async () => {
  const message = userMessage("out-of-gold");
  const motivation = "A gift for a friend";
  actions.createProjectAction.mockResolvedValue({
    kind: "outOfGold",
    message,
    name: PROJECTS_COPY.defaultName,
    motivation,
  });
  await render(
    <NewProjectForm
      choices={{ preferredConstructId: "lumen", userConstructs: [] }}
    />,
  );
  const why = page.getByRole("textbox", { name: PROJECTS_COPY.whyLabel });
  await why.fill(motivation);
  await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
  await expect.element(page.getByText(message, { exact: true })).toBeVisible();
  await expect
    .element(
      page.getByText(BATTERY_PURCHASES_COPY.unavailable, { exact: true }),
    )
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: MARKETPLACE_COPY.earnGold }))
    .not.toBeInTheDocument();
  await expect.element(why).toHaveValue(motivation);
  await expect.element(page.getByText("Lumen", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
  const [, retry] = actions.createProjectAction.mock.lastCall ?? [];
  expect(retry?.get("constructId")).toBe("lumen");
  expect(retry?.get("motivation")).toBe(motivation);
});
