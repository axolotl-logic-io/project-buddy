// "use_case_start_without_claude" in use-cases/: starting a project or a chat
// while Claude can't write its opening. The mock tutor fails an opening whose
// prompt holds `/mock-error <type>`, which a project's name puts there.
import { expect, type Locator, type Page } from "@playwright/test";
import { listChats } from "@/chats/store.ts";
import { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY, OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { personaName } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

const NEW_CHAT_PATH = /\/chats\/new/u;

// The page's own alert. Next's route announcer is an alert too, outside the
// main landmark.
function alertIn(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

test("use_case_start_without_claude", async ({ account, page, testData }) => {
  await logIn(page, account);

  await test.step("a new project says Claude is unavailable, keeps her name and saves nothing", async () => {
    const name = `Fox ${crypto.randomUUID()} /mock-error overloaded_error`;
    const nameField = page.getByRole("textbox", {
      name: PROJECTS_COPY.nameLabel,
    });
    await page.goto("/projects");
    await nameField.fill(name);
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();

    await expect(alertIn(page)).toHaveText(OPENING_COPY.claudeUnavailable);
    await expect(page).toHaveURL("/projects");
    await expect(nameField).toHaveValue(name);
    const projects = await listProjects(account.id);
    expect(projects.map((project) => project.name)).not.toContain(name);
  });

  await test.step("a new chat says Claude is unavailable, keeps her choices and saves nothing", async () => {
    const project = await testData.project(
      `Fox ${crypto.randomUUID()} /mock-error billing_error`,
    );
    const mrTee = page.getByRole("radio", { name: personaName("mr-tee") });
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: PROJECT_COPY.startChat }).click();
    await mrTee.check();
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await expect(alertIn(page)).toHaveText(OPENING_COPY.claudeUnavailable);
    await expect(page).toHaveURL(NEW_CHAT_PATH);
    await expect(page.getByLabel(NEW_CHAT_COPY.projectLabel)).toHaveValue(
      project.id,
    );
    await expect(mrTee).toBeChecked();
    expect(await listChats(account.id, project.id)).toEqual([]);
  });
});
