// "use_case_read_formatted_reply" in use-cases/chats.md, in Chromium and
// WebKit: a saved chat with the mock tutor's reply to `/mock-markdown` (a
// heading, emphasis, lists, a table, a manual link and a Python block) and
// a message she typed with Markdown in it. A saved chat is what she sees
// when she reopens it; saving it is use_case_send_message's to check. The
// site's stylesheet comes from vitest.browser-setup.ts.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { commands, type Locator, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { chatIdFixture } from "@/id-fixtures.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import { chooseMode } from "@/themes/choose-theme.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { markdownReplyText } from "@/tutor/mock-markdown-test-kit.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("@/components/router-test-kit.ts"));

const HER_MESSAGE = "I typed **this** myself";
const RAW_MARKDOWN = /\*\*|^#|`/mu;
const BOLD = "600";
// The tutor's reply, once rendered.
const reply: Locator = page.getByRole("listitem").filter({
  has: page.getByRole("heading", { level: 2, name: "Beveling an edge" }),
});
// Opens a new tab; the test's stand-in records each call.
const open = vi.fn<Window["open"]>(() => null);
const MANUAL_URL = manualUrl(
  "manual/modeling/meshes/editing/edge/bevel.rst",
  "bevel",
);

// The text color of each piece of the code in the reply, in order.
function codeColorList(): string[] {
  return Array.from(
    reply.element().querySelectorAll("code span"),
    (span) => getComputedStyle(span).color,
  );
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  await commands.emulateColorScheme("light");
});

// Renders the saved chat: her message, then the reply to /mock-markdown.
async function renderSavedChat(): Promise<void> {
  await render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: HER_MESSAGE }],
        },
        {
          id: "r1",
          role: "assistant",
          parts: [{ type: "text", text: markdownReplyText() }],
        },
      ]}
      buddyName={getBuddy("mr-tee").name}
    />,
  );
}

beforeEach(async () => {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  vi.stubGlobal("open", open);
  chooseMode("dark");
  await renderSavedChat();
});

describe("use_case_read_formatted_reply", () => {
  test("headings, emphasis, lists, tables and code are formatted", async () => {
    await expect
      .element(reply.getByRole("heading", { level: 2 }))
      .toBeVisible();
    await expect
      .element(reply.getByRole("emphasis"))
      .toHaveTextContent("rounds");
    await expect
      .element(
        reply
          .getByRole("listitem")
          .filter({ hasText: "Press" })
          .getByText("Ctrl+B"),
      )
      .toHaveStyle({ fontWeight: BOLD });
    expect(reply.element().querySelectorAll("ol > li")).toHaveLength(2);
    expect(reply.element().querySelectorAll("ul > li")).toHaveLength(2);
    await expect
      .element(reply.getByRole("cell", { name: "Bevel" }))
      .toBeVisible();
    await expect
      .poll(() => new Set(codeColorList()).size, {
        message: "Python is colored by its syntax",
      })
      .toBeGreaterThan(1);
    expect(reply.element().querySelector("code")?.textContent).toContain(
      "import bpy",
    );
    expect(reply.element()).not.toHaveTextContent(RAW_MARKDOWN);
  });

  test("a manual link in the reply opens straight away", async () => {
    await reply.getByRole("button", { name: "the manual" }).click();

    await expect
      .poll(() => open.mock.calls)
      .toStrictEqual([[MANUAL_URL, "_blank", "noreferrer"]]);
  });

  test("her own message shows exactly as she typed it", async () => {
    await expect
      .element(page.getByText(HER_MESSAGE, { exact: true }))
      .toBeVisible();
  });

  test("code is colored for the mode she chose (Dark), not the system's", async () => {
    await expect.poll(() => new Set(codeColorList()).size).toBeGreaterThan(1);
    await commands.emulateColorScheme("light");
    const underLightSystem = codeColorList();
    await commands.emulateColorScheme("dark");

    expect(codeColorList()).toStrictEqual(underLightSystem);
  });
});
