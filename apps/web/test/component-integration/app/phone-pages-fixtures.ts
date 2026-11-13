// Stored data for the phone checks (phone-pages-test-kit.tsx), shaped as the
// stores return it: what each page shows beyond page-fixtures.ts's quests
// and chats.

import type { UIMessage } from "ai";
import type { SessionUser } from "@/auth/session-token.ts";
import { CITE_BLENDER_MANUAL_TOOL } from "@/blender-manual/cite-tool-contract.ts";
import { manualUrl } from "@/blender-manual/manual-source.ts";
import { SEARCH_BLENDER_MANUAL_TOOL } from "@/blender-manual/search-tool-contract.ts";
import type { ChatMessage } from "@/chats/message-author.ts";
import type { OwnConstruct } from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { LOCAL_CONSTRUCT_COPY } from "@/ui/copy/local-construct.ts";
import {
  userConstructIdFixture,
  userIdFixture,
} from "../../support/id-fixtures.ts";
import { markdownReplyText } from "../replies/rich-message-test-kit.ts";

// Her clone of Vellum.
const VELLUM_CLONE: OwnConstruct = {
  id: userConstructIdFixture("2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
  name: `${getConstruct("vellum").name} (clone)`,
  definition: getConstruct("vellum").definition,
  clonedFrom: "vellum",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

// The user a sign-in link that works signs in.
const LINK_USER: SessionUser = {
  id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
  sessionEpoch: 0,
};

// Her gold, in micro-USD: 87 gold.
const GOLD_BALANCE = 870_000;

// A word in no manual section but this one, which the search finds.
const TOPIC = "glimmerwhisk";
const GLIMMERWHISK_SECTION = {
  label: "Glimmerwhisk Edges",
  url: manualUrl(
    "manual/modeling/meshes/editing/edge/glimmerwhisk.rst",
    "glimmerwhisk-edges",
  ),
  excerpt: "Press Ctrl-Shift-G to glimmerwhisk the selected edges.",
};

// Her message and its reply, whose parts are given.
function exchange(
  index: number,
  text: string,
  reply: UIMessage["parts"],
): ChatMessage[] {
  return [
    { id: `m${index}`, role: "user", parts: [{ type: "text", text }] },
    { id: `r${index}`, role: "assistant", parts: reply },
  ];
}

// The mock construct's reply to a message of hers: Markdown with a list and a
// Python block, or for /mock-markdown every kind of Markdown replies use.
// A chat in which she searched the manual for TOPIC, with the reply citing
// the section found, then asked for the mock construct's Markdown reply.
function searchAndMarkdownChat(): ChatMessage[] {
  const query = `search ${TOPIC}`;
  return [
    ...exchange(0, query, [
      {
        type: `tool-${SEARCH_BLENDER_MANUAL_TOOL}`,
        toolCallId: "call-search",
        state: "output-available",
        input: { query: TOPIC },
        output: { sections: [GLIMMERWHISK_SECTION] },
      },
      {
        type: `tool-${CITE_BLENDER_MANUAL_TOOL}`,
        toolCallId: "call-cite",
        state: "output-available",
        input: { urls: [GLIMMERWHISK_SECTION.url] },
        output: { citations: [GLIMMERWHISK_SECTION] },
      },
      {
        type: "text",
        text: `The manual covers "${TOPIC}":\n\n1. **${GLIMMERWHISK_SECTION.label}**: ${GLIMMERWHISK_SECTION.excerpt}`,
      },
    ]),
    ...exchange(1, "Show the earlier Markdown", [
      { type: "text", text: markdownReplyText() },
    ]),
  ];
}

// Her question in the standalone chat and the mock construct's reply.
function standaloneChatExchange(): ChatMessage[] {
  const question = "How do I bevel an edge?";
  return exchange(0, question, [
    { type: "text", text: LOCAL_CONSTRUCT_COPY.unknownCommand },
  ]);
}

export {
  GOLD_BALANCE,
  LINK_USER,
  searchAndMarkdownChat,
  standaloneChatExchange,
  VELLUM_CLONE,
};
