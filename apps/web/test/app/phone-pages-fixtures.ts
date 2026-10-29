// Stored data for the phone checks (phone-pages-test-kit.tsx), shaped as the
// stores return it: what each page shows beyond page-fixtures.ts's projects
// and chats.
import type { UIMessage } from "ai";
import type { LoginLinkUser } from "@/accounts/login-links.ts";
import type { UserBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { MEMORY_VERSION_NUMBER, type MemoryVersion } from "@/memory/memory.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import type { MonthlyUsage } from "@/quota/spend-store.ts";
import { defaultMockScript } from "@/replies/mock-script.ts";
import { CITE_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/cite-tool-contract.ts";
import { manualUrl } from "@/skills/blender-manual/manual-source.ts";
import { SEARCH_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/search-tool-contract.ts";
import { userBuddyIdFixture, userIdFixture } from "../id-fixtures.ts";

// A memory with a task list and a long item, as she wrote it.
const MEMORY_TEXT = [
  "## Goals",
  "",
  "- Learn to bevel and to use the Mirror modifier on a low-poly fox den.",
  "",
  "## Milestones",
  "",
  "- [x] Block out the den's shape",
  "- [ ] Bevel the roof's edges",
].join("\n");

// The memory's history, newest first: hers, then the buddy's, which ticks a
// milestone, so the page shows two versions, the older one to restore.
const MEMORY_HISTORY: readonly MemoryVersion[] = [
  {
    version: MEMORY_VERSION_NUMBER.parse(2),
    text: MEMORY_TEXT.replace("- [ ] Bevel", "- [x] Bevel"),
    author: "buddy",
    createdAt: new Date("2026-10-11T10:00:00Z"),
  },
  {
    version: MEMORY_VERSION_NUMBER.parse(1),
    text: MEMORY_TEXT,
    author: "user",
    createdAt: new Date("2026-10-11T09:00:00Z"),
  },
];

// Her clone of Hippy.
const HIPPY_CLONE: UserBuddy = {
  id: userBuddyIdFixture("2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
  name: `${getBuddy("hippy").name} (clone)`,
  parts: getBuddy("hippy").parts,
  clonedFrom: "hippy",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

// The user a sign-in link that works signs in.
const LINK_USER: LoginLinkUser = {
  user: {
    id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
    sessionEpoch: 0,
  },
  hiddenExtras: [],
};

// Her spend this month: $2 of her quota.
const MONTHLY_USAGE: MonthlyUsage = {
  spentMicroUsd: 2_000_000,
  limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
  resetsOn: new Date("2026-11-01T00:00:00Z"),
};

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
): UIMessage[] {
  return [
    { id: `m${index}`, role: "user", parts: [{ type: "text", text }] },
    { id: `r${index}`, role: "assistant", parts: reply },
  ];
}

// The mock buddy's reply to a message of hers: Markdown with a list and a
// Python block, or for /mock-markdown every kind of Markdown replies use.
function mockReplyText(text: string): string {
  const [step] = defaultMockScript(text, {
    systemTexts: [],
    earlierTexts: [],
    toolResults: [],
    answerNow: false,
  });
  return step?.text ?? "";
}

// A chat in which she searched the manual for TOPIC, with the reply citing
// the section found, then asked for the mock buddy's Markdown reply.
function searchAndMarkdownChat(): UIMessage[] {
  const query = `/mock-search ${TOPIC}`;
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
    ...exchange(1, "/mock-markdown", [
      { type: "text", text: mockReplyText("/mock-markdown") },
    ]),
  ];
}

// Her question in the central chat and the mock buddy's reply.
function centralChatExchange(): UIMessage[] {
  const question = "How do I bevel an edge?";
  return exchange(0, question, [
    { type: "text", text: mockReplyText(question) },
  ]);
}

export {
  centralChatExchange,
  HIPPY_CLONE,
  LINK_USER,
  MEMORY_HISTORY,
  MONTHLY_USAGE,
  searchAndMarkdownChat,
};
