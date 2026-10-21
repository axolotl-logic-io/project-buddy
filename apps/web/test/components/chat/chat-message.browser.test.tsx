// "use_case_read_formatted_reply" in use-cases/chats.md, in Chromium and
// WebKit: a saved chat with the mock tutor's reply to `/mock-markdown` (a
// heading, emphasis, lists, a table, a manual link and a Python block) and
// a message she typed with Markdown in it. A saved chat is what she sees
// when she reopens it; saving it is use_case_send_message's to check. The
// site's stylesheet comes from vitest.browser-setup.ts.
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { commands, type Locator, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { chooseMode } from "@/themes/choose-theme.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { chatIdFixture } from "../../id-fixtures.ts";
import { markdownReplyText } from "../../tutor/mock-markdown-test-kit.ts";
import { loadCodeHighlighting } from "../code-highlighting-test-kit.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const HER_MESSAGE = "I typed **this** myself";
const RAW_MARKDOWN = /\*\*|^#|`/mu;
const BOLD = "600";
// How long the reply's code takes to show its colours once Python's
// highlighter is ready, which beforeAll awaits with no clock: Streamdown's
// lazy code-block chunk, one tokenising pass and one React commit, none of
// which the app marks with an event. The worst measured was 1192 ms, on a
// first run with Vite's cache cleared, under 1-minute load averages of 44-76
// (12 busy loops on 10 cores, beside the machine's other jobs). This is over
// 3 times that, and under the browser test timeout (#355).
const HIGHLIGHTED_RENDER_TIMEOUT_MS = 4000;
// Waiting for the code to be colored by its syntax.
const CODE_COLORED: Parameters<typeof expect.poll>[1] = {
  message: "Python is colored by its syntax",
  timeout: HIGHLIGHTED_RENDER_TIMEOUT_MS,
};
// The tutor's reply, once rendered.
const reply: Locator = page.getByRole("listitem").filter({
  has: page.getByRole("heading", { level: 2, name: "Beveling an edge" }),
});
// Opens a new tab; the test's stand-in records each call.
const open = vi.fn<Window["open"]>(() => null);

// The text color of each piece of the code in the reply, in order.
function codeColorList(): string[] {
  return Array.from(
    reply.element().querySelectorAll("code span"),
    (span) => getComputedStyle(span).color,
  );
}

// How many colors the code in the reply shows.
function codeColorCount(): number {
  return new Set(codeColorList()).size;
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

beforeAll(() => loadCodeHighlighting("python"));

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
    await expect.poll(codeColorCount, CODE_COLORED).toBeGreaterThan(1);
    expect(reply.element().querySelector("code")?.textContent).toContain(
      "import bpy",
    );
    expect(reply.element()).not.toHaveTextContent(RAW_MARKDOWN);
  });

  test("code is colored for the mode she chose (Dark), not the system's", async () => {
    await expect.poll(codeColorCount, CODE_COLORED).toBeGreaterThan(1);
    await commands.emulateColorScheme("light");
    const underLightSystem = codeColorList();
    await commands.emulateColorScheme("dark");

    expect(codeColorList()).toStrictEqual(underLightSystem);
  });
});

for (const mode of ["light", "dark"] as const) {
  test(`code keywords use the contract colour in ${mode}`, async () => {
    chooseMode(mode);
    const probe = document.createElement("span");
    probe.style.color = "var(--code-keyword)";
    document.body.append(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();
    await expect
      .poll(() => {
        const keyword = [...reply.element().querySelectorAll("code span")].find(
          (span) => span.textContent === "import",
        );
        if (keyword === undefined) {
          return "";
        }
        return getComputedStyle(keyword).color;
      }, CODE_COLORED)
      .toBe(expected);
  });
}
