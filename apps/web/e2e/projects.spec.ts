import { expect } from "@playwright/test";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { HOME_COPY } from "@/ui/copy/site.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// The words before the date in a chat's "started …" line.
const STARTED = PROJECT_COPY.chatStarted("");

// Her own account starts with no projects, whatever other tests make.
// Stays e2e: the list's order and the home link need the DB and navigation.
test("use_case_view_projects", async ({ account, page, testData }) => {
  await logIn(page, account);

  await test.step("with no projects, the page invites her to create one", async () => {
    await page.getByRole("link", { name: HOME_COPY.projectsLink }).click();

    await expect(page).toHaveURL("/projects");
    await expect(page.getByText(PROJECTS_COPY.none)).toBeVisible();
    await expect(page.getByLabel(PROJECTS_COPY.nameLabel)).toBeVisible();
    await expect(
      page.getByRole("button", { name: PROJECTS_COPY.create }),
    ).toBeVisible();
  });

  await test.step("her projects are listed newest first", async () => {
    const older = await testData.project();
    const newer = await testData.project();
    await page.reload();

    const links = page.getByRole("list").getByRole("link");
    await expect(links).toHaveText([newer.name, older.name]);
    await expect(links.first()).toHaveAttribute(
      "href",
      `/projects/${newer.id}`,
    );
    await expect(links.last()).toHaveAttribute("href", `/projects/${older.id}`);
  });
});

// Stays e2e: chats listed from the DB, by navigation.
test("use_case_open_project", async ({ account, page, testData }) => {
  const project = await testData.project();
  const olderChat = await testData.chat(project, "hippy");
  const newerChat = await testData.chat(project, "mr-tee");
  await testData.chat(await testData.project(), "argon-sprangler");
  const emptyProject = await testData.project();
  await logIn(page, account);

  await test.step("she picks the project from her projects", async () => {
    await page.goto("/projects");
    await page.getByRole("link", { exact: true, name: project.name }).click();

    await expect(page).toHaveURL(`/projects/${project.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: project.name }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: PROJECT_COPY.startChat }),
    ).toHaveAttribute("href", `/chats/new?projectId=${project.id}`);
  });

  await test.step("its chats are listed newest first, and only its own", async () => {
    const chats = page.getByRole("list").getByRole("listitem");
    await expect(chats).toHaveCount(2);
    await expect(chats).toContainText([
      `${newerChat.buddy.name} ${STARTED}`,
      `${olderChat.buddy.name} ${STARTED}`,
    ]);
    await expect(chats.first().getByRole("link")).toHaveAttribute(
      "href",
      `/chats/${newerChat.id}`,
    );
    await expect(chats.last().getByRole("link")).toHaveAttribute(
      "href",
      `/chats/${olderChat.id}`,
    );
  });

  await test.step("a project with no chats says there are none", async () => {
    await page.goto(`/projects/${emptyProject.id}`);

    await expect(page.getByText(PROJECT_COPY.noChats)).toBeVisible();
  });
});
