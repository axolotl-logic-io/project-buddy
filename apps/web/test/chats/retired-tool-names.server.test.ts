// "use_case_reopen_chat" in use-cases/chats.md, for a reply saved before
// #549 renamed the Blender manual lookup's tools: its search and citations
// read under the tools' current names, so the chat still shows them, and
// the model sees the calls as the tools it has now.
import { expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { messages } from "@/db/tables/projects-and-chats.ts";
import { CITE_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/cite-tool-contract.ts";
import { SEARCH_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/search-tool-contract.ts";
import { userWithChat } from "../test-database/chat-test-kit.ts";

const URL =
  "https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/bevel.html";

// A reply as a build before #549 saved it, under the tools' old names.
const OLD_REPLY_PARTS: unknown[] = [
  { type: "step-start" },
  {
    type: "tool-search_manual",
    toolCallId: "call-search",
    state: "output-available",
    input: { query: "bevel" },
    output: { sections: [{ label: "Bevel", url: URL, excerpt: "Bevels." }] },
  },
  {
    type: "tool-cite_manual",
    toolCallId: "call-cite",
    state: "output-available",
    input: { urls: [URL] },
    output: { citations: [{ label: "Bevel", url: URL }] },
  },
  { type: "text", text: "Select the edges, then press Ctrl-B." },
];

test("use_case_reopen_chat: a reply saved under the manual tools' old names reads under their new ones", async () => {
  const { user, chat } = await userWithChat();
  await getDb().insert(messages).values({
    id: "old-reply",
    chatId: chat.id,
    role: "assistant",
    parts: OLD_REPLY_PARTS,
  });

  const [reply] = await listMessages(user.id, chat.id);

  expect(reply?.parts.map(({ type }) => type)).toEqual([
    "step-start",
    `tool-${SEARCH_BLENDER_MANUAL_TOOL}`,
    `tool-${CITE_BLENDER_MANUAL_TOOL}`,
    "text",
  ]);
});
