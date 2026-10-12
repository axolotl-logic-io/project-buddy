// Starting a chat through the site: the new chat opens with the tutor's
// opening, which the mock writes by quoting the project's memory.
import { expect, type Page } from "@playwright/test";
import { CHAT_COPY, CHAT_NAME_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { chatMessages, personaName, tutorEdits } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

const CHAT_PATH = /\/chats\/[\da-f-]{36}$/u;
// How the mock tutor's opening of a chat whose project has a memory starts.
const MOCK_OPENING_START = "The mock tutor sums up the project's memory";

// Holds the page's form submissions until the returned function is called,
// so a test can see the form while it is working.
async function holdFormSubmissions(page: Page): Promise<() => void> {
  const held = Promise.withResolvers<void>();
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      await held.promise;
    }
    await route.fallback();
  });
  return held.resolve;
}

test("use_case_new_chat", async ({ account, page, testData }) => {
  const project = await testData.project();
  const earlierChat = await testData.chat(project, "hippy");
  const goal = `A low-poly fox ${crypto.randomUUID()}`;
  await logIn(page, account);
  await page.goto(`/chats/${earlierChat.id}`);
  await tutorEdits(page, "", `## Goal\n\n- ${goal}`);
  await page.goto(`/projects/${project.id}`);

  await test.step("she starts a chat from the project's page", async () => {
    await page.getByRole("link", { name: PROJECT_COPY.startChat }).click();

    await expect(page.getByLabel(NEW_CHAT_COPY.projectLabel)).toHaveValue(
      project.id,
    );
    await expect(
      page.getByRole("radio", { name: personaName("hippy") }),
    ).toBeChecked();
  });

  await test.step("she picks Mr. Tee, and the site shows it is working", async () => {
    const release = await holdFormSubmissions(page);
    await page.getByRole("radio", { name: personaName("mr-tee") }).check();
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await expect(page.getByRole("status")).toHaveText(NEW_CHAT_COPY.starting);
    await expect(
      page.getByRole("button", { name: NEW_CHAT_COPY.start }),
    ).toBeDisabled();
    release();
  });

  await test.step("the chat opens with the tutor's synopsis of the memory", async () => {
    await expect(page).toHaveURL(CHAT_PATH);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: CHAT_COPY.heading(personaName("mr-tee")),
      }),
    ).toContainText(CHAT_NAME_COPY.fallback);
    await expect(page.getByRole("link", { name: project.name })).toBeVisible();
    await expect(chatMessages(page)).toHaveCount(1);
    await expect(chatMessages(page).first()).toContainText(
      `${personaName("mr-tee")} ${MOCK_OPENING_START}`,
      { useInnerText: true },
    );
    await expect(chatMessages(page).first()).toContainText(goal);
  });

  await test.step("the chat is first in the project's chats", async () => {
    const chatPath = new URL(page.url()).pathname;
    await page.getByRole("link", { name: project.name }).click();

    const firstChat = page.getByRole("list").getByRole("link").first();
    await expect(firstChat).toHaveText(personaName("mr-tee"));
    await expect(firstChat).toHaveAttribute("href", chatPath);
  });
});
