// "use_case_read_formatted_reply" in use-cases/chats.md: the mock tutor's
// `/mock-markdown` replies with a heading, emphasis, lists, a table, a
// manual link and a Python block.
import { expect, type Locator, type Page } from "@playwright/test";
import { manualUrl } from "@/manual/manual-source.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { openChat, sendMessage, stubManualSite } from "./chat-page.ts";
import { test } from "./fixtures.ts";

const RAW_MARKDOWN = /\*\*|^#|`/mu;
const BOLD = "600";

// The text color of each piece of the code in reply, in order.
function codeColorList(reply: Locator): Promise<string[]> {
  return reply
    .locator("code span")
    .evaluateAll((spans) => spans.map((span) => getComputedStyle(span).color));
}

// Picks a mode in the site's appearance menu, and waits for the menu to
// close, as the page is hidden from assistive technology while it is open.
async function chooseMode(page: Page, mode: string): Promise<void> {
  await page.getByRole("button", { name: THEME_COPY.picker }).click();
  await page
    .getByRole("group", { name: THEME_COPY.modeLabel })
    .getByRole("menuitemradio", { name: mode })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
}

// Checks that reply, the mock tutor's answer to /mock-markdown, shows its
// Markdown formatted and no raw formatting marks.
async function expectFormatted(reply: Locator): Promise<void> {
  await expect(reply.getByRole("heading", { level: 2 })).toHaveText(
    "Beveling an edge",
  );
  await expect(reply.locator("em")).toHaveText("rounds");
  await expect(
    reply
      .getByRole("listitem")
      .filter({ hasText: "Press" })
      .getByText("Ctrl+B"),
  ).toHaveCSS("font-weight", BOLD);
  await expect(reply.locator("ol > li")).toHaveCount(2);
  await expect(reply.locator("ul > li")).toHaveCount(2);
  await expect(reply.getByRole("cell", { name: "Bevel" })).toBeVisible();
  await expect(reply.locator("code")).toContainText("import bpy");
  await expect
    .poll(async () => new Set(await codeColorList(reply)).size, {
      message: "Python is colored by its syntax",
    })
    .toBeGreaterThan(1);
  await expect(reply).not.toContainText(RAW_MARKDOWN);
}

test("use_case_read_formatted_reply", async ({ account, page, testData }) => {
  await stubManualSite(page);
  const chat = await testData.chat(await testData.project());
  await openChat(page, account, chat);
  await sendMessage(page, "/mock-markdown");
  const reply = page.getByRole("listitem").filter({
    has: page.getByRole("heading", { name: "Beveling an edge" }),
  });

  await test.step("headings, emphasis, lists, tables and code are formatted", async () => {
    await expectFormatted(reply);
  });

  await test.step("a manual link in the reply opens straight away", async () => {
    const manualTab = page.waitForEvent("popup");
    await reply.getByRole("button", { name: "the manual" }).click();

    expect((await manualTab).url()).toBe(
      manualUrl("manual/modeling/meshes/editing/edge/bevel.rst", "bevel"),
    );
  });

  await test.step("her own message shows exactly as she typed it", async () => {
    await sendMessage(page, "I typed **this** myself");

    await expect(
      page.getByText("I typed **this** myself", { exact: true }),
    ).toBeVisible();
    // The reply quotes her message, so it is saved before the chat reopens.
    await expect(
      page.getByText('You said: "I typed this myself"', { exact: false }),
    ).toBeVisible();
  });

  await test.step("the reply looks the same after she reopens the chat", async () => {
    await page.reload();

    await expectFormatted(reply);
    await expect(
      page.getByText("I typed **this** myself", { exact: true }),
    ).toBeVisible();
  });

  await test.step("code is colored for the mode she chose, not the system's", async () => {
    await chooseMode(page, THEME_COPY.modes.dark);
    await page.emulateMedia({ colorScheme: "light" });
    const underLightSystem = await codeColorList(reply);
    expect(new Set(underLightSystem).size).toBeGreaterThan(1);
    await page.emulateMedia({ colorScheme: "dark" });

    expect(await codeColorList(reply)).toEqual(underLightSystem);
  });
});
