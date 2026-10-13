// "use_case_start_without_claude" in use-cases/: starting a project or a chat
// while Claude can't write its opening. The mock tutor fails an opening whose
// prompt holds `/mock-error <type>`, which a project's name puts there.
import { expect, type Locator, type Page } from "@playwright/test";
import { NEW_CHAT_COPY, OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { personaName } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { holdFormSubmissions } from "./hold-form-submissions.ts";
import { logIn } from "./log-in.ts";
import { alertIn, fillWhenReady } from "./page-helpers.ts";

const NEW_CHAT_PATH = /\/chats\/new/u;

// Clicks the form's button with its POST held, and expects the form to show
// it is working: the status says so and the button is disabled. Filtered by
// text, since the projects list has its own loading status.
async function submitShowsWorking(
  page: Page,
  button: Locator,
  working: string,
): Promise<void> {
  const release = await holdFormSubmissions(page);
  await button.click();

  await expect(
    page.getByRole("status").filter({ hasText: working }),
  ).toBeVisible();
  await expect(button).toBeDisabled();
  release();
}

test("use_case_start_without_claude", async ({ account, page, testData }) => {
  await logIn(page, account);

  await test.step("a new project shows it is working, says Claude is unavailable, keeps her name and saves nothing", async () => {
    const name = `Fox ${crypto.randomUUID()} /mock-error overloaded_error`;
    const nameField = page.getByRole("textbox", {
      name: PROJECTS_COPY.nameLabel,
    });
    await page.goto("/projects");
    await fillWhenReady(nameField, name);
    await submitShowsWorking(
      page,
      page.getByRole("button", { name: PROJECTS_COPY.create }),
      PROJECTS_COPY.creating,
    );

    await expect(alertIn(page)).toHaveText(OPENING_COPY.claudeUnavailable);
    await expect(page).toHaveURL("/projects");
    await expect(nameField).toHaveValue(name);

    // The account is new to this test, so her list is empty.
    await page.goto("/projects");
    await expect(page.getByText(PROJECTS_COPY.none)).toBeVisible();
    await expect(page.getByRole("main").getByText(name)).toHaveCount(0);
  });

  await test.step("a new chat shows it is working, says Claude is unavailable, keeps her choices and saves nothing", async () => {
    const project = await testData.project(
      `Fox ${crypto.randomUUID()} /mock-error billing_error`,
    );
    const mrTee = page.getByRole("radio", { name: personaName("mr-tee") });
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: PROJECT_COPY.startChat }).click();
    await mrTee.check();
    await submitShowsWorking(
      page,
      page.getByRole("button", { name: NEW_CHAT_COPY.start }),
      NEW_CHAT_COPY.starting,
    );

    await expect(alertIn(page)).toHaveText(OPENING_COPY.claudeUnavailable);
    await expect(page).toHaveURL(NEW_CHAT_PATH);
    await expect(page.getByLabel(NEW_CHAT_COPY.projectLabel)).toHaveValue(
      project.id,
    );
    await expect(mrTee).toBeChecked();

    await page.goto(`/projects/${project.id}`);
    await expect(page.getByText(PROJECT_COPY.noChats)).toBeVisible();
  });
});
