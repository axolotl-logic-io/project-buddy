// USE_CASES.md "When things go wrong", with the failure cases of "Access"
// and "Projects". Every failure shows its case's fixed message, never Next's
// own error page.
import {
  type BrowserContext,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { userMessage } from "@/errors/app-error.ts";
import { listProjects } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { storageDownUrl } from "./storage-down-server.ts";

const MS_PER_SECOND = 1000;
const MS_PER_DAY = 86_400_000;
const DAYS_SINCE_LAST_SIGN_IN = 31;
const SESSION_DAYS = 30;
// How far a session cookie's expiry may be from 30 days after sign-in.
const EXPIRY_TOLERANCE_MS = 60_000;

// Swaps the browser's session for one that lapsed long ago, as if she had
// signed in more than a month before.
async function expireSession(
  context: BrowserContext,
  page: Page,
): Promise<void> {
  const signedInAt = new Date(
    Date.now() - DAYS_SINCE_LAST_SIGN_IN * MS_PER_DAY,
  );
  const value = await createSessionToken(readSessionSecret(), signedInAt);
  await context.clearCookies();
  await context.addCookies([
    { name: SESSION_COOKIE_NAME, value, url: new URL(page.url()).origin },
  ]);
}

// The page's own alert. Next's route announcer is an alert too, outside the
// main landmark.
function alertIn(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

async function send(page: Page, text: string): Promise<void> {
  await page.getByRole("textbox", { name: COPY.chat.messageLabel }).fill(text);
  await page.getByRole("button", { name: COPY.chat.send }).click();
}

// Hands the page's form posts, which carry Server Actions, to the server
// whose database is down, as if the storage failed between loading the page
// and saving. That server runs the same build, so it knows the same actions.
// Playwright makes the request itself, since the browser won't send it to
// another port.
async function sendFormsToStorageDownServer(page: Page): Promise<void> {
  const storageDown = new URL(storageDownUrl("/"));
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.fallback();
      return;
    }
    const url = new URL(request.url());
    url.host = storageDown.host;
    const response = await route.fetch({
      url: url.href,
      headers: { ...request.headers(), origin: storageDown.origin },
    });
    await route.fulfill({ response });
  });
}

async function expectNotFound(page: Page, address: string): Promise<void> {
  await page.goto(address);

  await expect(
    page.getByRole("heading", { name: COPY.problems.notFoundHeading }),
  ).toBeVisible();
  await expect(page.getByText(userMessage("not-found"))).toBeVisible();
}

test("use_case_open_missing_page", async ({ page, testData }) => {
  const project = await testData.project();
  await logIn(page);

  await test.step("a project that doesn't exist can't be found", async () => {
    await expectNotFound(page, `/projects/${crypto.randomUUID()}`);
  });

  await test.step("a garbled chat link can't be found", async () => {
    await expectNotFound(page, "/chats/not-a-chat-id");
  });

  await test.step("an address the site doesn't have can't be found", async () => {
    await expectNotFound(page, "/no-such-page");
  });

  await test.step("the link leads back to her projects, unchanged", async () => {
    await page.getByRole("link", { name: COPY.problems.projectsLink }).click();

    await expect(page).toHaveURL("/projects");
    await expect(page.getByRole("link", { name: project.name })).toBeVisible();
  });
});

test("use_case_reply_fails", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project());
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);

  await test.step("an overloaded tutor shows its fixed message and no reply", async () => {
    await send(page, "/mock-error overloaded_error");

    await expect(alertIn(page)).toHaveText(userMessage("overloaded"));
    await expect(page.getByText("This is the mock tutor")).toHaveCount(0);
  });

  await test.step("her message is still there after a reload", async () => {
    await page.reload();

    await expect(page.getByText("/mock-error overloaded_error")).toBeVisible();
    await expect(alertIn(page)).toHaveCount(0);
  });

  await test.step("another kind of problem has its own message", async () => {
    await send(page, "/mock-error billing_error");

    await expect(alertIn(page)).toHaveText(userMessage("out-of-credits"));
  });
});

test("use_case_storage_unavailable", async ({ page }) => {
  // The session cookie needs no database, and cookies on localhost reach
  // every port, so signing in on the working server signs her in on both.
  await logIn(page);

  await test.step("her projects show the storage message instead", async () => {
    await page.goto(storageDownUrl("/projects"));

    await expect(
      page.getByRole("heading", { name: COPY.problems.errorHeading }),
    ).toBeVisible();
    await expect(alertIn(page)).toHaveText(userMessage("database-unreachable"));
  });

  await test.step("a chat shows it too", async () => {
    await page.goto(storageDownUrl(`/chats/${crypto.randomUUID()}`));

    await expect(alertIn(page)).toHaveText(userMessage("database-unreachable"));
  });

  await test.step("signing in shows it in the form", async () => {
    await page.goto(storageDownUrl("/login"));
    await page.getByLabel(COPY.login.passphrase).fill("any passphrase");
    await page.getByRole("button", { name: COPY.login.unlock }).click();

    await expect(alertIn(page)).toHaveText(userMessage("database-unreachable"));
  });

  await test.step("saving a project shows it, and saves nothing", async () => {
    const name = `Unsaved project ${crypto.randomUUID()}`;
    await page.goto("/projects");
    await sendFormsToStorageDownServer(page);
    await page
      .getByRole("textbox", { name: COPY.projects.nameLabel })
      .fill(name);
    await page.getByRole("button", { name: COPY.projects.create }).click();

    await expect(alertIn(page)).toHaveText(userMessage("database-unreachable"));
    const projects = await listProjects();
    expect(projects.map((project) => project.name)).not.toContain(name);
  });
});

test("use_case_session_expired", async ({ context, page }) => {
  await logIn(page);
  await expireSession(context, page);

  await test.step("every page asks for the passphrase", async () => {
    await page.goto("/projects");
    await expect(page).toHaveURL("/login");

    await page.goto(`/chats/${crypto.randomUUID()}`);
    await expect(page).toHaveURL("/login");
  });

  await test.step("signing in again lasts another 30 days", async () => {
    const signedInAt = Date.now();
    await logIn(page);

    const cookies = await context.cookies();
    const session = cookies.find(({ name }) => name === SESSION_COOKIE_NAME);
    const expiresAtMs = (session?.expires ?? 0) * MS_PER_SECOND;
    expect(
      Math.abs(expiresAtMs - (signedInAt + SESSION_DAYS * MS_PER_DAY)),
    ).toBeLessThan(EXPIRY_TOLERANCE_MS);
  });
});

test("use_case_session_expired_in_chat", async ({
  context,
  page,
  testData,
}) => {
  const chat = await testData.chat(await testData.project());
  const message = `Still there? ${crypto.randomUUID()}`;
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);
  await expireSession(context, page);

  await test.step("the chat says she was signed out, with a link", async () => {
    await send(page, message);

    await expect(alertIn(page)).toContainText(userMessage("signed-out"));
    await expect(page.getByText("This is the mock tutor")).toHaveCount(0);
  });

  await test.step("the link leads to the passphrase page", async () => {
    await page.getByRole("link", { name: COPY.problems.signInLink }).click();

    await expect(page).toHaveURL("/login");
  });

  await test.step("after signing in, the message isn't in the chat", async () => {
    await logIn(page);
    await page.goto(`/chats/${chat.id}`);

    await expect(
      page.getByRole("textbox", { name: COPY.chat.messageLabel }),
    ).toBeVisible();
    await expect(page.getByText(message)).toHaveCount(0);
  });
});

test("use_case_new_project_without_name", async ({ page }) => {
  await logIn(page);
  await page.goto("/projects");
  const name = page.getByRole("textbox", { name: COPY.projects.nameLabel });
  const create = page.getByRole("button", { name: COPY.projects.create });

  await test.step("an empty name stays on the form", async () => {
    await create.click();

    await expect(page).toHaveURL("/projects");
    await expect(name).toBeFocused();
  });

  await test.step("a name of spaces asks for a name", async () => {
    await name.fill("   ");
    await create.click();

    await expect(alertIn(page)).toHaveText(COPY.projects.needsName);
    await expect(page).toHaveURL("/projects");
    await expect(name).toBeVisible();
  });
});
