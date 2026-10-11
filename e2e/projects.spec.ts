import { expect } from "@playwright/test";
import { COPY } from "@/ui/copy.ts";
import { personaName } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { WHOLE_DATABASE_TAG } from "./whole-database.ts";

// The words before the date in a chat's "started …" line.
const STARTED = COPY.project.chatStarted("");

// Needs the database to itself, to see the list with no projects at all.
test("use_case_view_projects", { tag: WHOLE_DATABASE_TAG }, async ({
  page,
  testData,
}) => {
  await testData.deleteAllProjects();
  await logIn(page);

  await test.step("with no projects, the page invites her to create one", async () => {
    await page.getByRole("link", { name: COPY.home.projectsLink }).click();

    await expect(page).toHaveURL("/projects");
    await expect(page.getByText(COPY.projects.none)).toBeVisible();
    await expect(page.getByLabel(COPY.projects.nameLabel)).toBeVisible();
    await expect(
      page.getByRole("button", { name: COPY.projects.create }),
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

test("use_case_open_project", async ({ page, testData }) => {
  const project = await testData.project();
  const olderChat = await testData.chat(project, "hippy");
  const newerChat = await testData.chat(project, "mr-t");
  await testData.chat(await testData.project(), "egon-spengler");
  const emptyProject = await testData.project();
  await logIn(page);

  await test.step("she picks the project from her projects", async () => {
    await page.goto("/projects");
    await page.getByRole("link", { exact: true, name: project.name }).click();

    await expect(page).toHaveURL(`/projects/${project.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: project.name }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: COPY.project.startChat }),
    ).toHaveAttribute("href", `/chats/new?projectId=${project.id}`);
  });

  await test.step("its chats are listed newest first, and only its own", async () => {
    const chats = page.getByRole("list").getByRole("listitem");
    await expect(chats).toHaveCount(2);
    await expect(chats).toContainText([
      `${personaName(newerChat.personaId)} ${STARTED}`,
      `${personaName(olderChat.personaId)} ${STARTED}`,
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

    await expect(page.getByText(COPY.project.noChats)).toBeVisible();
  });
});
