// "use_case_hide_extras" in use-cases/appearance.md, for every flag in
// src/flags/flags.ts, in Chromium and WebKit: with <html>'s data-hide naming
// one extra, that extra shows less of itself, every other extra shows as
// much as before, and a chat still shows what is never an extra, its
// citation of the manual and its composer. The extras render together, each
// in the component that tags it, with the site's stylesheet (globals.css,
// which imports extras.css) from vitest.browser-setup.ts. EXTRA_SCENES has
// one entry per flag, so tsc fails until a new flag has one. Switching an
// extra on Settings is flag-switches.browser.test.tsx's to check; saving the
// choice to her account and the browser's cookie, for her alone, is
// hide-extras.server.test.ts's. Here the saved cookie hides the extra again
// after a reload.
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { UsageMeter } from "@/app/(workspace)/account/usage-meter.tsx";
import { PartFields } from "@/app/(workspace)/buddies/[buddyId]/part-fields.tsx";
import { getBuddy } from "@/buddies/index.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { ChatView } from "@/components/chat-view.tsx";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import {
  DEFAULT_FLAG_ATTRIBUTES,
  FLAGS_PRE_PAINT_SCRIPT,
  HIDE_ATTRIBUTE,
  hiddenFlagsCookie,
} from "@/flags/flag-choice.ts";
import {
  DEFAULT_HIDDEN_FLAGS,
  extraTag,
  FLAGS,
  type FlagId,
} from "@/flags/flags.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { UPDATE_MEMORY_TOOL } from "@/replies/tools/update-memory-contract.ts";
import { CITE_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/cite-tool-contract.ts";
import { SEARCH_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/search-tool-contract.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { CHAT_COPY, CHAT_NAME_COPY, CITATIONS_COPY } from "@/ui/copy/chat.ts";
import { chatNameFixture } from "../chats/chat-name-fixtures.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));
// The forms' Server Actions, which this test never submits.
vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  createProjectAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  resetBuddyPartAction: vi.fn(),
}));

const TOPIC = "quillwhorl";
const CHAT_NAME = "Bevel the den's roof";
const MR_TEE = getBuddy("mr-tee");
const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";

// The buddy's saved reply: a working note before its search of the manual,
// a search that failed, a change to the project's memory, its answer and
// its citation of the manual.
const REPLY_PARTS: UIMessage["parts"] = [
  { type: "text", text: `Let me look up ${TOPIC}.` },
  {
    type: `tool-${SEARCH_BLENDER_MANUAL_TOOL}`,
    toolCallId: "call-search",
    state: "output-available",
    input: { query: TOPIC },
    output: {
      sections: [{ label: "Bevel › Usage", url: BEVEL_URL, excerpt: "Bevel" }],
    },
  },
  {
    type: `tool-${SEARCH_BLENDER_MANUAL_TOOL}`,
    toolCallId: "call-search-again",
    state: "output-error",
    input: { query: TOPIC },
    errorText: "The search is down",
  },
  {
    type: `tool-${UPDATE_MEMORY_TOOL}`,
    toolCallId: "call-memory",
    state: "output-available",
    input: { oldText: "", newText: "- Rig it" },
    output: { status: "updated", version: 2, oldText: "", newText: "- Rig it" },
  },
  { type: "text", text: "Select the edges and press Ctrl+B." },
  {
    type: `tool-${CITE_BLENDER_MANUAL_TOOL}`,
    toolCallId: "call-cite",
    state: "output-available",
    input: { urls: [BEVEL_URL] },
    output: { citations: [{ label: "Bevel › Usage", url: BEVEL_URL }] },
  },
];

const citations = page.getByRole("region", { name: CITATIONS_COPY.heading });
const composer = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
const chatLink = page.getByRole("link", {
  name: CHAT_NAME_COPY.listTitle(CHAT_NAME, MR_TEE.name),
});
const stillShown = page.getByText(CITATIONS_COPY.searched(TOPIC));

// Renders every extra on one page, each in the component that tags it.
async function renderEveryExtra(): Promise<void> {
  await render(
    <>
      {/* The chat pages' header, whose tag sits in the server component
          both chat pages render (src/components/chat-screen.tsx);
          flags.test.ts checks the tag is there. */}
      <header className="chat-header" {...extraTag("pinned-chat-header")}>
        <h1>{CHAT_NAME}</h1>
      </header>
      <ChatView
        chatId={chatIdFixture()}
        initialMessages={[
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: `What is ${TOPIC}?` }],
          },
          { id: "r1", role: "assistant", parts: REPLY_PARTS },
        ]}
        buddyName={MR_TEE.name}
      />
      <ChatList
        chats={[
          {
            id: chatIdFixture(),
            projectId: projectIdFixture(),
            buddy: MR_TEE,
            name: chatNameFixture(CHAT_NAME),
            renamedByHand: true,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
        ]}
      />
      <UsageMeter
        usage={{
          spentMicroUsd: 1_250_000,
          limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
          resetsOn: new Date("2026-11-01T00:00:00Z"),
        }}
      />
      <PartFields editable={false} parts={MR_TEE.parts} />
      <NewProjectForm userBuddies={Promise.resolve([])} />
    </>,
  );
}

// How many of the elements tagged as the extra id are laid out and shown.
function taggedShown(id: FlagId): number {
  const selector = Object.entries(extraTag(id))
    .map(([name, value]) => `[${name}="${value}"]`)
    .join("");
  return Array.from(document.querySelectorAll(selector)).filter((element) =>
    element.checkVisibility(),
  ).length;
}

// How an extra shows on the page that renderEveryExtra renders.
interface ExtraScene {
  // How many of the extra's parts are on show.
  readonly shown: () => number;
}

// An extra whose parts are the elements tagged with its id.
function tagged(id: FlagId): ExtraScene {
  return { shown: (): number => taggedShown(id) };
}

const EXTRA_SCENES: Record<FlagId, ExtraScene> = {
  brainstorming: tagged("brainstorming"),
  "project-breakdown": tagged("project-breakdown"),
  "working-notes": tagged("working-notes"),
  "memory-change-cards": tagged("memory-change-cards"),
  // The search line and the failed search's line.
  "tool-lines": tagged("tool-lines"),
  // Hiding it unpins the header rather than removing it (extras.css).
  "pinned-chat-header": {
    shown: (): number => {
      const header = document.querySelector(".chat-header");
      return Number(
        header !== null && getComputedStyle(header).position === "sticky",
      );
    },
  },
  "chat-names": tagged("chat-names"),
  // The page decoration has no tag: <body>'s background draws it, not an
  // element of its own (contract.css), so it shows while that background
  // has an image.
  "page-decorations": {
    shown: (): number =>
      Number(getComputedStyle(document.body).backgroundImage !== "none"),
  },
  "usage-meter": tagged("usage-meter"),
  "persona-mechanics": tagged("persona-mechanics"),
  "interview-persona": tagged("interview-persona"),
};

// How many parts of each extra are on show, by flag id, leaving out the
// flag left.
function partsShown(left?: FlagId): Map<FlagId, number> {
  return new Map(
    FLAGS.filter(({ id }) => id !== left).map(({ id }) => [
      id,
      EXTRA_SCENES[id].shown(),
    ]),
  );
}

// Loads the page again as far as the flags go: <html> starts with the
// default flag attributes, and the pre-paint script in <head> applies the
// choice in the browser's cookies.
function reloadFlags(cookies: string): void {
  vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(cookies);
  for (const [name, value] of Object.entries(DEFAULT_FLAG_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  const script = document.createElement("script");
  script.textContent = FLAGS_PRE_PAINT_SCRIPT;
  document.head.append(script);
  script.remove();
}

beforeEach(async () => {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  await renderEveryExtra();
  // The chat and the list have rendered.
  await vi.waitFor(() => {
    stillShown.element();
    chatLink.element();
  });
});

afterEach(() => {
  document.documentElement.removeAttribute(HIDE_ATTRIBUTE);
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("use_case_hide_extras", () => {
  test.each(FLAGS.map(({ id }) => id))(
    "hiding %s shows less of it, as much of the rest, and keeps the citation and composer",
    async (id) => {
      const scene = EXTRA_SCENES[id];
      const shown = scene.shown();
      const othersShown = partsShown(id);
      expect(shown, "parts on show while it is on").toBeGreaterThan(0);

      document.documentElement.setAttribute(HIDE_ATTRIBUTE, id);

      expect(scene.shown(), "parts on show once it is off").toBeLessThan(shown);
      expect(partsShown(id), "every other extra").toStrictEqual(othersShown);
      await expect.element(citations).toBeVisible();
      await expect.element(composer).toBeVisible();
    },
  );

  test("a chat whose name is hidden reads as an unnamed chat", async () => {
    document.documentElement.setAttribute(HIDE_ATTRIBUTE, "chat-names");

    await expect
      .element(page.getByRole("link", { name: MR_TEE.name, exact: true }))
      .toBeVisible();
  });

  test("working notes switched off stay hidden after a reload, and the rest as before", () => {
    reloadFlags("");
    const notesShown = EXTRA_SCENES["working-notes"].shown();
    const othersShown = partsShown("working-notes");
    const { name, value } = hiddenFlagsCookie([
      "working-notes",
      ...DEFAULT_HIDDEN_FLAGS,
    ]);

    reloadFlags(`session=abc; ${name}=${value}`);

    expect(notesShown, "notes on show before").toBeGreaterThan(0);
    expect(EXTRA_SCENES["working-notes"].shown(), "notes after").toBe(0);
    expect(partsShown("working-notes"), "every other extra").toStrictEqual(
      othersShown,
    );
  });
});
