// A project's page: a 36-character name, its interview link, and two chats,
// one named by hand, its interview chat, and one not named yet.
import {
  expect,
  type Locator,
  type Page,
  type PageScreenshotOptions,
} from "@playwright/test";
import { renameChat } from "@/chats/store.ts";
import { themeChoiceCookie } from "@/themes/theme-choice.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { chatNameFixture } from "../../test/chats/chat-name-fixtures.ts";
import { type TestData, test } from "../fixtures.ts";
import { testSessionCookie } from "../log-in.ts";
import { fitScreenToPage } from "./fit-screen.ts";
import {
  ANY_VALUE,
  copyPattern,
  describeVisualPage,
  waitUntilSettled,
} from "./visual-page.ts";

// A 36-character name, to show how a long name sits beside the interview and
// memory links.
const PROJECT_NAME = "Low-poly fox den under autumn leaves";
const CHAT_NAME = "Bevel the den's roof";

const STARTED_LINE = copyPattern(PROJECT_COPY.chatStarted(ANY_VALUE));

// Each chat card's "started <date and time>" line, which fills the card's
// width.
function startedTimes(page: Page): readonly Locator[] {
  return [page.getByRole("main").getByText(STARTED_LINE)];
}

async function openProject(page: Page, testData: TestData): Promise<void> {
  const project = await testData.project(PROJECT_NAME);
  // One after another, so the list's order, newest first, is fixed.
  const named = await testData.chat(project, "hippy");
  await renameChat(testData.account.id, named.id, chatNameFixture(CHAT_NAME));
  await testData.interviewChat(named);
  await testData.chat(project, "mr-tee");
  await page.goto(`/projects/${project.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: PROJECT_NAME }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("listitem").getByRole("link"),
  ).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: PROJECT_COPY.interviewLink }),
  ).toBeVisible();
}

describeVisualPage({
  name: "project",
  signedIn: true,
  open: openProject,
  changing: startedTimes,
});

// Repainting masked text must not change the unmasked card borders. On
// macOS, Chromium's partial rasterization changed rounded corners by 1–2
// colour levels after a repaint, despite unchanged geometry (#506). Compare
// whole PNGs, with no noise allowance, additional mask or approved baseline.
test("project rounded borders stay identical after masked time repaints", async ({
  account,
  page,
  testData,
  baseURL,
}, testInfo): Promise<void> => {
  if (baseURL === undefined) {
    throw new Error("The visual tests need the config's baseURL");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    await testSessionCookie(account, baseURL),
    {
      ...themeChoiceCookie({ theme: "ay-liens", mode: "dark" }),
      url: baseURL,
    },
  ]);
  await openProject(page, testData);
  await waitUntilSettled(page);
  await fitScreenToPage(page);
  const options: PageScreenshotOptions = {
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    mask: [...startedTimes(page)],
  };
  const times = page.getByRole("main").locator("time");
  await expect(times).toHaveCount(2);
  const before = await page.screenshot({
    ...options,
    path: testInfo.outputPath("before-repaint.png"),
  });
  // A shorter timestamp changes the text's paint bounds, not the masked
  // line's box. This exercises a fresh rasterization of the same corners.
  await times.evaluateAll((elements): void => {
    for (const element of elements) {
      element.textContent = "2026-10-22 12:00";
    }
  });
  const after = await page.screenshot({
    ...options,
    path: testInfo.outputPath("after-repaint.png"),
  });
  if (!after.equals(before)) {
    await testInfo.attach("before-repaint", {
      body: before,
      contentType: "image/png",
    });
    await testInfo.attach("after-repaint", {
      body: after,
      contentType: "image/png",
    });
  }
  expect(after.equals(before), "unmasked pixels after repaint").toBe(true);
});
