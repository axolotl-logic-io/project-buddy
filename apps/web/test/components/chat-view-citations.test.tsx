// "use_case_ask_blender_question" in use-cases/chats.md, where the links sit
// and what they are called: the tutor may cite before it writes, as the mock
// tutor's `/mock-search` does, and the links still show under the prose, live
// and saved. Each link is labelled "Page › Heading", so two pages' "Options"
// differ; the server makes those labels (search-manual.test.ts and
// cite-manual.test.ts), and this checks the chat shows them.
import { screen, within } from "@testing-library/react";
import type { UIMessage, UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";
import { answerChat, replyResponse } from "./chat-stream-test-kit.ts";
import { renderChat, sendMessage } from "./chat-view-test-kit.tsx";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const MANUAL = "https://docs.blender.org/manual/en/latest";
const CITATIONS = [
  {
    label: "Blorp Edges › Options",
    url: `${MANUAL}/modeling/meshes/editing/edge/blorp.html#options`,
  },
  {
    label: "Blorp Modifier › Options",
    url: `${MANUAL}/modeling/modifiers/generate/blorp.html#options`,
  },
];
const ANSWER = "Set the blorpify amount in the tool's panel.";
const CITE_INPUT: { urls: string[] } = {
  urls: CITATIONS.map(({ url }) => url),
};
const CITE_OUTPUT: { citations: typeof CITATIONS } = { citations: CITATIONS };

// The reply's parts as saved: the citations first, then the answer.
const SAVED_REPLY: UIMessage = {
  id: "r1",
  role: "assistant",
  parts: [
    {
      type: `tool-${CITE_MANUAL_TOOL}`,
      toolCallId: "call-cite",
      state: "output-available",
      input: CITE_INPUT,
      output: CITE_OUTPUT,
    },
    { type: "text", text: ANSWER },
  ],
};

// The same reply as it streams.
const STREAMED_REPLY: UIMessageChunk[] = [
  { type: "start", messageId: "r1" },
  {
    type: "tool-input-available",
    toolCallId: "call-cite",
    toolName: CITE_MANUAL_TOOL,
    input: CITE_INPUT,
  },
  {
    type: "tool-output-available",
    toolCallId: "call-cite",
    output: CITE_OUTPUT,
  },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: ANSWER },
  { type: "text-end", id: "t1" },
  { type: "finish" },
];

// How long the chat takes to show the streamed reply once it has read the
// reply's body to the end: React's render of what it read, which the app
// marks with no event. The worst measured was 226 ms, under 1-minute load
// averages of 44-76 (12 busy loops on 10 cores, beside the machine's other
// jobs). This is over 3 times that (#355).
const STREAMED_RENDER_TIMEOUT_MS = 1000;

// Where a reply's citations sit, and what their links are.
interface CitationsShape {
  readonly followAnswer: boolean;
  readonly urls: readonly string[];
  readonly labelled: boolean;
}

// The citations under the answer, a link to each cited page, each named for
// its page and heading.
const LINKS_UNDER_ANSWER: CitationsShape = {
  followAnswer: true,
  urls: CITATIONS.map(({ url }) => url),
  labelled: true,
};

// Reads the citations the page shows.
function readCitations(region: HTMLElement): CitationsShape {
  return {
    followAnswer:
      screen.getByText(ANSWER).compareDocumentPosition(region) ===
      Node.DOCUMENT_POSITION_FOLLOWING,
    urls: within(region)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href") ?? ""),
    labelled: CITATIONS.every(
      ({ label }) =>
        within(region).queryByRole("link", { name: label }) !== null,
    ),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("use_case_ask_blender_question", () => {
  test("the links show under the streamed answer, though it cited first", async () => {
    answerChat(replyResponse(STREAMED_REPLY));
    renderChat([]);
    sendMessage("/mock-search blorpify");

    expect(
      await screen.findByText(
        ANSWER,
        {},
        { timeout: STREAMED_RENDER_TIMEOUT_MS },
      ),
    ).toBeVisible();
    const region = screen.getByRole("region", {
      name: CITATIONS_COPY.heading,
    });
    expect(readCitations(region)).toEqual(LINKS_UNDER_ANSWER);
  });

  test("the links show under the saved answer, each naming its page and heading", () => {
    renderChat([SAVED_REPLY]);

    const region = screen.getByRole("region", { name: CITATIONS_COPY.heading });
    expect(readCitations(region)).toEqual(LINKS_UNDER_ANSWER);
  });
});

describe("use_case_follow_citation", () => {
  test("each saved link opens its section of the latest manual in a new tab", () => {
    renderChat([SAVED_REPLY]);

    const region = screen.getByRole("region", { name: CITATIONS_COPY.heading });
    const links = within(region)
      .getAllByRole("link")
      .map((link) => ({
        href: link.getAttribute("href"),
        target: link.getAttribute("target"),
        rel: link.getAttribute("rel"),
      }));
    expect(links).toEqual(
      CITATIONS.map(({ url }) => ({
        href: url,
        target: "_blank",
        rel: "noreferrer",
      })),
    );
  });
});
