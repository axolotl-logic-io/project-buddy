import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import {
  CAST_SPELL_INPUT,
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
  type CastSpellOutput,
} from "@/spells/cast-spell-contract.ts";
import { currentSpell } from "@/spells/spell-store.ts";
import {
  constructPrompt,
  constructReply,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

function output(reply: UIMessage): CastSpellOutput {
  const part = reply.parts.find(
    (entry) => isToolUIPart(entry) && getToolName(entry) === CAST_SPELL_TOOL,
  );
  if (part === undefined || !("output" in part)) {
    throw new Error("Expected a saved cast result");
  }
  return CAST_SPELL_OUTPUT.parse(part.output);
}

describe("use_case_construct_casts_spell", () => {
  test("only Plan and Brainstorm can be cast", async () => {
    const { chat } = await signedInChat();
    const prompt = await constructPrompt(chat.id);
    expect(prompt).toContain("`plan`: Plan");
    expect(prompt).toContain("`brainstorm`: Brainstorm");
    expect(prompt).not.toContain("# Activities");
    expect(CAST_SPELL_INPUT.safeParse({ spellId: "custom" }).success).toBe(
      false,
    );
  });

  test("casting switches the persistent spell and saves its identity", async () => {
    const { user, chat } = await signedInChat();
    const reply = await constructReply(chat.id, "/mock-cast plan");
    const identity = { status: "cast", spellId: "plan", name: "Plan" };
    expect(output(reply)).toEqual(identity);
    expect(await currentSpell(user.id, chat)).toBe("plan");
    expect(await constructPrompt(chat.id)).toContain("Active spell: Plan");
    const saved = (await listMessages(user.id, chat.id)).find(
      (entry) => entry.id === reply.id,
    );
    if (saved === undefined) {
      throw new Error("Expected saved reply");
    }
    expect(output(saved)).toEqual(identity);
    await constructReply(chat.id, "/mock-cast brainstorm");
    expect(await currentSpell(user.id, chat)).toBe("brainstorm");
  });

  test("Chat requires a quest before entering a spell", async () => {
    const { user } = await signedInChat();
    const chat = await privateChat(user.id);
    expect(output(await constructReply(chat.id, "/mock-cast plan"))).toEqual({
      status: "needsQuest",
    });
    expect(await currentSpell(user.id, chat)).toBeUndefined();
  });
});
