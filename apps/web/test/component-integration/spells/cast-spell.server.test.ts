import { describe, expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { CAST_SPELL_INPUT } from "@/spells/cast-spell-contract.ts";
import { getSpell } from "@/spells/spell.ts";
import { spellResponse } from "@/spells/spell-response.ts";
import { currentSpell } from "@/spells/spell-store.ts";
import { SPELL_MODE_COPY } from "@/ui/copy/spells.ts";
import {
  constructPrompt,
  constructReply,
  messageText,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

describe("use_case_construct_casts_spell", () => {
  test("built-in and own spell names are accepted", async () => {
    const { chat } = await signedInChat();
    const prompt = await constructPrompt(chat.id);
    expect(prompt).toContain("`plan`: Plan");
    expect(prompt).toContain("`brainstorm`: Brainstorm");
    expect(prompt).not.toContain("# Activities");
    expect(CAST_SPELL_INPUT.safeParse({ name: "custom" }).success).toBe(true);
  });

  test("casting switches the persistent spell and saves its identity", async () => {
    const { user, chat } = await signedInChat();
    const reply = await constructReply(chat.id, "cast plan");
    expect(messageText(reply)).toBe(
      spellResponse(
        getSpell("plan").definition.castReply,
        getSpell("plan"),
        "cast plan",
      ),
    );
    expect(await currentSpell(user.id, chat)).toBe("plan");
    expect(await constructPrompt(chat.id)).toContain("Active spell: Plan");
    const saved = (await listMessages(user.id, chat.id)).find(
      (entry) => entry.id === reply.id,
    );
    if (saved === undefined) {
      throw new Error("Expected saved reply");
    }
    expect(messageText(saved)).toBe(
      spellResponse(
        getSpell("plan").definition.castReply,
        getSpell("plan"),
        "cast plan",
      ),
    );
    await constructReply(chat.id, "cast brainstorm");
    expect(await currentSpell(user.id, chat)).toBe("brainstorm");
  });

  test("Chat requires a quest before entering a spell", async () => {
    const { user } = await signedInChat();
    const chat = await privateChat(user.id);
    expect(messageText(await constructReply(chat.id, "cast plan"))).toBe(
      SPELL_MODE_COPY.noQuest,
    );
    expect(await currentSpell(user.id, chat)).toBeUndefined();
  });
});
