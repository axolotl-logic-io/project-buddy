// The manual's cases in use-cases/chats.md, through POST /api/chat with the
// mock buddy: `/mock-search <query>` searches the sections a test adds,
// cites them, then replies with each one found; `/mock-empty-after-search
// <query>` searches and cites, then ends without text, and answers when the
// app asks again; `/mock-cast blender-manual-lookup` casts the lookup's
// spell. What a reload shows is what the chat saved, so each test
// reads the saved reply. Manual sections are shared by every test file, so
// each test's sections use words no other test uses. How the saved links
// show is chat-view-citations.test.tsx's.

import { getToolName, isToolUIPart } from "ai";
import { expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { manualUrl } from "@/blender-manual/manual-source.ts";
import { BLENDER_MANUAL_LOOKUP_SPELL } from "@/blender-manual/search-tool-contract.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { mockEmptyAfterSearchAnswer } from "@/replies/mock-empty-after-search.ts";
import {
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
  type CastSpellOutput,
} from "@/spells/cast-spell-contract.ts";
import { getSpell } from "@/spells/index.ts";
import {
  manualSection,
  testData,
} from "../../../../support/test-database/data-test-kit.ts";
import {
  buddyPrompt,
  buddyReply,
  type Citation,
  citedSections,
  messageText,
  signedInChat,
} from "../../../test-database/chat-test-kit.ts";

const FLOOBLE = manualSection(
  "modeling/meshes/editing/edge/flooble",
  "flooble-edges",
  "Flooble Edges",
  "Press Ctrl-Shift-F to flooble the selected edges.",
);
const FLOOBLE_WIDTH = manualSection(
  "modeling/meshes/editing/edge/flooble",
  "flooble-width",
  "Flooble Width",
  "Drag the mouse to set the flooble width.",
);
const FLOOBLE_CITATIONS: readonly Citation[] = [
  { label: FLOOBLE.title, url: FLOOBLE.url },
  {
    label: `${FLOOBLE.title} › ${FLOOBLE_WIDTH.title}`,
    url: FLOOBLE_WIDTH.url,
  },
];
const SPLONK = manualSection(
  "modeling/modifiers/generate/splonk",
  "splonk-modifier",
  "Splonk Modifier",
  "Add the Splonk modifier from the Generate menu.",
);
const GRONK = manualSection(
  "modeling/meshes/editing/vertex/gronk",
  "gronk-vertices",
  "Gronk Vertices",
  "Open Vertex > Gronk, then press G to gronk.",
);

// The built-in spell that holds the lookup's instructions.
const LOOKUP_SPELL = getSpell(BLENDER_MANUAL_LOOKUP_SPELL);

// Her two questions and one reply to each: no second answer.
const MESSAGES_AFTER_TWO_QUESTIONS = 4;

// What the chat saved in reply to one message: its text and its citations.
interface SavedReply {
  readonly text: string;
  readonly citations: readonly Citation[];
}
async function replyTo(
  _user: User,
  chat: Chat,
  text: string,
): Promise<SavedReply> {
  const reply = await buddyReply(chat.id, text);
  return { text: messageText(reply), citations: citedSections(reply) };
}

// How many times part occurs in text.
function occurrences(text: string, part: string): number {
  return text.split(part).length - 1;
}

test("use_case_ask_blender_question", async () => {
  const { user, chat } = await signedInChat();
  await testData(user).manualSections([FLOOBLE, FLOOBLE_WIDTH]);

  const reply = await replyTo(user, chat, "/mock-search flooble");

  expect(reply.text).toContain(FLOOBLE.text);
  expect(reply.text).toContain(FLOOBLE_WIDTH.text);
  expect(reply.citations).toEqual(FLOOBLE_CITATIONS);

  const answer = await replyTo(user, chat, "/mock-empty-after-search flooble");
  const answerText = mockEmptyAfterSearchAnswer(
    "flooble",
    FLOOBLE_CITATIONS.map(({ label }) => label),
  );

  expect(occurrences(answer.text, answerText)).toBe(1);
  expect(answer.citations).toEqual(FLOOBLE_CITATIONS);
  expect(await listMessages(user.id, chat.id)).toHaveLength(
    MESSAGES_AFTER_TWO_QUESTIONS,
  );
});

test("use_case_follow_citation", async () => {
  const { user, chat } = await signedInChat();
  await testData(user).manualSections([SPLONK]);

  const reply = await replyTo(user, chat, "/mock-search splonk");

  expect(reply.citations).toEqual([
    {
      label: SPLONK.title,
      url: "https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/splonk.html#splonk-modifier",
    },
  ]);
});

test("use_case_topic_not_in_manual", async () => {
  const { user, chat } = await signedInChat();

  const nothing = await replyTo(user, chat, "/mock-search quuxplorp");

  expect(nothing.text).toContain('The manual has nothing on "quuxplorp"');
  expect(nothing.citations).toEqual([]);

  const neverSearched = manualUrl("manual/addons/quuxplorp.rst", "quuxplorp");
  const cited = await replyTo(
    user,
    chat,
    `/mock-tool cite_blender_manual ${JSON.stringify({ urls: [neverSearched] })}`,
  );

  expect(cited.text).toContain("The mock buddy called `cite_blender_manual`.");
  expect(cited.citations).toEqual([]);
});

test("use_case_same_facts_any_buddy", async () => {
  const { user, chat: vellumChat } = await signedInChat("vellum");
  const data = testData(user);
  await data.manualSections([GRONK]);
  const otherBuddyChat = await data.chat(await data.project(), "lumen");

  const [vellum, otherBuddy] = await Promise.all([
    replyTo(user, vellumChat, "/mock-search gronk"),
    replyTo(user, otherBuddyChat, "/mock-search gronk"),
  ]);

  expect(vellum.text).toContain(GRONK.text);
  expect(otherBuddy.text).toContain(GRONK.text);
  expect(vellum.citations.map(({ url }) => url)).toEqual([GRONK.url]);
  expect(otherBuddy.citations.map(({ url }) => url)).toEqual([GRONK.url]);
});

test("use_case_ask_any_subject", async () => {
  const { user, chat } = await signedInChat();
  const prompt = await buddyPrompt(chat.id);
  const reply = await replyTo(user, chat, "How do I keep risotto creamy?");

  expect(prompt).toContain(`\`${BLENDER_MANUAL_LOOKUP_SPELL}\``);
  expect(prompt).toContain(LOOKUP_SPELL.definition.whenToUse);
  expect(prompt).not.toContain(LOOKUP_SPELL.definition.prompt);
  expect(prompt).not.toContain("get back to the user's project");
  expect(reply.citations).toEqual([]);
});

test("casting the Blender manual lookup gives the lookup instructions", async () => {
  const { chat } = await signedInChat();

  const reply = await buddyReply(
    chat.id,
    `/mock-cast ${BLENDER_MANUAL_LOOKUP_SPELL}`,
  );
  const cast = reply.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === CAST_SPELL_TOOL,
  );
  if (cast === undefined || !("output" in cast)) {
    throw new Error("The buddy didn't call cast_spell");
  }

  expect(CAST_SPELL_OUTPUT.parse(cast.output)).toEqual<CastSpellOutput>({
    status: "cast",
    spellId: BLENDER_MANUAL_LOOKUP_SPELL,
    name: LOOKUP_SPELL.name,
    instructions: LOOKUP_SPELL.definition.prompt,
  });
});
