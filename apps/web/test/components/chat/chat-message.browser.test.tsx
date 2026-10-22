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
// The same bounded render wait also checks the complete Python colouring,
// not just the presence of two colours: an incorrectly keyword-coloured
// plain name can satisfy that weaker condition (#514).
// Waiting for the code to be colored by its syntax.
const CODE_COLORED: Parameters<typeof expect.poll>[1] = {
  message: "Python is colored by its syntax",
  timeout: HIGHLIGHTED_RENDER_TIMEOUT_MS,
};
const SYSTEM_OBSERVED: Parameters<typeof expect.poll>[1] = {
  message: "System scheme has reached the test iframe",
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

interface ColoredCharacter {
  readonly character: string;
  readonly color: string;
}

// Read text colours independently of how the highlighter splits its spans.
// Line wrappers carry no text of their own; the original full-span snapshot
// below still includes them.
function codeCharacterColors(): ColoredCharacter[] {
  const code = reply.element().querySelector("code");
  if (code === null) {
    return [];
  }
  const text = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  const colors: ColoredCharacter[] = [];
  for (let node = text.nextNode(); node !== null; node = text.nextNode()) {
    const parent = node.parentElement;
    if (parent !== null) {
      const { color } = getComputedStyle(parent);
      for (const character of node.textContent ?? "") {
        colors.push({ character, color });
      }
    }
  }
  return colors;
}

function contractColor(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(--${token})`;
  document.body.append(probe);
  const { color } = getComputedStyle(probe);
  probe.remove();
  return color;
}

// The Python in /mock-markdown: plain names and punctuation use foreground,
// not the neighbouring keyword's colour (the failed #511 baseline did).
// Streamdown separates the two lines with block elements, not text newlines.
function expectedPythonColors(): ColoredCharacter[] {
  return [
    { text: "import", token: "code-keyword" },
    { text: " bpy", token: "foreground" },
    { text: "bpy.ops.mesh.", token: "foreground" },
    { text: "bevel", token: "code-function" },
    { text: "(", token: "foreground" },
    { text: "offset", token: "code-constant" },
    { text: "=", token: "code-keyword" },
    { text: "0.1", token: "code-constant" },
    { text: ")", token: "foreground" },
  ].flatMap(({ text, token }) => {
    const color = contractColor(token);
    return Array.from(text, (character) => ({ character, color }));
  });
}

// Read the test iframe, not the host-side emulation command's completion.
function systemIsDark(): boolean {
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
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
    await expect.poll(systemIsDark, SYSTEM_OBSERVED).toBe(false);
    await expect
      .poll(codeCharacterColors, CODE_COLORED)
      .toStrictEqual(expectedPythonColors());
    const underLightSystem = codeColorList();
    await commands.emulateColorScheme("dark");
    await expect.poll(systemIsDark, SYSTEM_OBSERVED).toBe(true);

    expect(codeColorList()).toStrictEqual(underLightSystem);
    expect(codeCharacterColors()).toStrictEqual(expectedPythonColors());

    await commands.emulateColorScheme("light");
    await expect.poll(systemIsDark, SYSTEM_OBSERVED).toBe(false);
    expect(codeColorList()).toStrictEqual(underLightSystem);
    expect(codeCharacterColors()).toStrictEqual(expectedPythonColors());
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
    await expect
      .poll(codeCharacterColors, CODE_COLORED)
      .toStrictEqual(expectedPythonColors());
  });
}
