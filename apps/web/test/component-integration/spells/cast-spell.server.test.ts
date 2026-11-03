// Spells in chats, in the test database with the mock buddy: every chat's
// instructions list her spells, built in and her own, and the buddy casts
// one with cast_spell, whose result is the spell's instructions as they are
// then. The saved reply keeps them for the buddy, so a later edit changes
// no past chat, but the chat's page sends them to no one. Whether a real
// buddy casts the right spell at the right time is the real-Claude smoke
// test's to check (use-cases/README.md).
import {
  getToolName,
  isToolUIPart,
  type UIMessage,
  validateUIMessages,
} from "ai";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import { listMessages } from "@/chats/store.ts";
import { CastSpellPart } from "@/components/chat/cast-spell-part.tsx";
import type { ChatId, UserId } from "@/ids.ts";
import { addProjectMember } from "@/projects/members-store.ts";
import {
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
  type CastSpellOutput,
} from "@/spells/cast-spell-contract.ts";
import { getSpell } from "@/spells/index.ts";
import {
  cloneSpell,
  type OwnSpell,
  updateSpell,
} from "@/spells/spell-store.ts";
import { CAST_SPELL_COPY } from "@/ui/copy/chat.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  buddyPrompt,
  buddyReply,
  messageText,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const ASK_ONE_QUESTION = getSpell("ask-one-question");

const OWN_SPELL = {
  name: "Render checklist",
  parts: {
    whenToUse: "When the user is about to render a scene.",
    instructions: "Check the samples, then the output path, then the camera.",
  },
};

// The props of the chat's page: its messages, as sent to the browser.
const CHAT_PAGE_PROPS = z.object({ messages: z.array(z.unknown()) });

// What cast_spell answered in the reply.
function castOutput(reply: UIMessage): CastSpellOutput {
  const call = reply.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === CAST_SPELL_TOOL,
  );
  if (call === undefined || !("output" in call)) {
    throw new Error("The buddy didn't call cast_spell");
  }
  return CAST_SPELL_OUTPUT.parse(call.output);
}

// Has the mock buddy in the chat cast the spell with this id, and returns
// its reply as saved.
function buddyCasts(chatId: ChatId, spellId: string): Promise<UIMessage> {
  return buddyReply(chatId, `/mock-cast ${spellId}`);
}

// A spell of the owner's, customized from Ask one question at a time and
// edited to OWN_SPELL.
async function ownSpell(owner: UserId): Promise<OwnSpell> {
  const copy = await cloneSpell(owner, "ask-one-question");
  if (copy === undefined) {
    throw new Error("The spell wasn't cloned");
  }
  const edited = await updateSpell(owner, copy.id, OWN_SPELL);
  if (edited === undefined) {
    throw new Error("The spell wasn't edited");
  }
  return edited;
}

// The chat's line for a cast, as the chat shows it.
function castLine(output: CastSpellOutput): string {
  return renderToStaticMarkup(
    createElement(CastSpellPart, { part: { result: output } }),
  );
}

describe("use_case_buddy_casts_spell", () => {
  test("every chat lists her spells, built in and her own, but no one else's", async () => {
    const { user, chat } = await signedInChat();
    const other = await testUser();
    const [mine, theirs] = await Promise.all([
      ownSpell(user.id),
      cloneSpell(other.id, "ask-one-question"),
    ]);
    if (theirs === undefined) {
      throw new Error("Their spell wasn't cloned");
    }

    const prompt = await buddyPrompt(chat.id);

    expect(prompt).toContain(
      `\`${ASK_ONE_QUESTION.id}\`: ${ASK_ONE_QUESTION.name}. ${ASK_ONE_QUESTION.parts.whenToUse}`,
    );
    expect(prompt).toContain(
      `\`${mine.id}\`: ${OWN_SPELL.name}. ${OWN_SPELL.parts.whenToUse}`,
    );
    expect(prompt).not.toContain(theirs.id);
    expect(prompt).not.toContain(ASK_ONE_QUESTION.parts.instructions);
    expect(prompt).not.toContain(OWN_SPELL.parts.instructions);
  });

  test("casting a built-in spell gives the buddy its instructions, and the chat shows the cast", async () => {
    const { chat } = await signedInChat();

    const reply = await buddyCasts(chat.id, ASK_ONE_QUESTION.id);

    const output = castOutput(reply);
    expect(output).toEqual({
      status: "cast",
      spellId: ASK_ONE_QUESTION.id,
      name: ASK_ONE_QUESTION.name,
      instructions: ASK_ONE_QUESTION.parts.instructions,
    });
    expect(messageText(reply)).toContain(ASK_ONE_QUESTION.parts.instructions);
    expect(castLine(output)).toContain(
      CAST_SPELL_COPY.cast(ASK_ONE_QUESTION.name),
    );
  });

  test("a past cast keeps her spell's instructions as they were", async () => {
    const { user, chat } = await signedInChat();
    const spell = await ownSpell(user.id);

    const first = await buddyCasts(chat.id, spell.id);
    await updateSpell(user.id, spell.id, {
      parts: { ...spell.parts, instructions: "Changed instructions." },
    });
    const second = await buddyCasts(chat.id, spell.id);

    expect(castOutput(second)).toMatchObject({
      instructions: "Changed instructions.",
    });
    const saved = await listMessages(user.id, chat.id);
    const firstSaved = saved.find(({ id }) => id === first.id);
    if (firstSaved === undefined) {
      throw new Error("The first cast wasn't saved");
    }
    expect(castOutput(firstSaved)).toEqual({
      status: "cast",
      spellId: spell.id,
      name: OWN_SPELL.name,
      instructions: OWN_SPELL.parts.instructions,
    });
  });

  test("an unknown spell, or another user's, casts nothing and tells the buddy why", async () => {
    const { chat } = await signedInChat();
    const other = await testUser();
    const theirs = await ownSpell(other.id);

    // The casts are replies in one chat, so they run in turn.
    const unknown = await buddyCasts(chat.id, "no-such-spell");
    const others = await buddyCasts(chat.id, theirs.id);

    const casts: readonly { reply: UIMessage; spellId: string }[] = [
      { reply: unknown, spellId: "no-such-spell" },
      { reply: others, spellId: theirs.id },
    ];
    for (const { reply, spellId } of casts) {
      const output = castOutput(reply);
      expect(output).toMatchObject({ status: "unknown", spellId });
      expect(messageText(reply)).toContain("cast no spell");
      expect(messageText(reply)).not.toContain(OWN_SPELL.parts.instructions);
      expect(castLine(output)).toBe("");
    }
  });

  test("a team chat lists the replying user's spells, and its page sends their instructions to no one", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const data = testData(owner);
    const project = await data.project();
    const chat = await data.chat(project);
    await addProjectMember(member.id, project.id);
    const spell = await ownSpell(member.id);

    await signIn(member);
    const memberPrompt = await buddyPrompt(chat.id);
    const reply = await buddyCasts(chat.id, spell.id);
    expect(memberPrompt).toContain(spell.id);
    expect(castOutput(reply)).toMatchObject({ status: "cast" });

    await signIn(owner);
    expect(await buddyPrompt(chat.id)).not.toContain(spell.id);
    const page = await ChatPage({
      params: Promise.resolve({ chatId: chat.id }),
      searchParams: Promise.resolve({}),
    });
    const served = await validateUIMessages({
      messages: CHAT_PAGE_PROPS.parse(page.props).messages,
    });
    const castReply = served.find(({ id }) => id === reply.id);
    if (castReply === undefined) {
      throw new Error("The page doesn't send the cast");
    }
    expect(castOutput(castReply)).toEqual({
      status: "cast",
      spellId: spell.id,
      name: OWN_SPELL.name,
    });
  });
});
