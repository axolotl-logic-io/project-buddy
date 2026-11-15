import { describe, expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { CAST_SPELL_INPUT } from "@/spells/cast-spell-contract.ts";
import { getSpell } from "@/spells/spell.ts";
import { spellResponse } from "@/spells/spell-response.ts";
import { currentSpell } from "@/spells/spell-store.ts";
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
    expect(prompt).toContain("`tasks`: Tasks");
    expect(prompt).toContain("`brainstorm`: Brainstorm");
    expect(prompt).not.toContain("# Activities");
    expect(CAST_SPELL_INPUT.safeParse({ name: "custom" }).success).toBe(true);
  });

  test("casting switches the persistent spell and saves its identity", async () => {
    const { user, chat } = await signedInChat();
    const reply = await constructReply(chat.id, "cast tasks");
    expect(messageText(reply)).toBe(
      spellResponse(
        getSpell("tasks").definition.castReply,
        getSpell("tasks"),
        "cast tasks",
      ),
    );
    expect(await currentSpell(user.id, chat)).toBe("tasks");
    expect(await constructPrompt(chat.id)).toContain("Active spell: Tasks");
    const saved = (await listMessages(user.id, chat.id)).find(
      (entry) => entry.id === reply.id,
    );
    if (saved === undefined) {
      throw new Error("Expected saved reply");
    }
    expect(messageText(saved)).toBe(
      spellResponse(
        getSpell("tasks").definition.castReply,
        getSpell("tasks"),
        "cast tasks",
      ),
    );
    await constructReply(chat.id, "cast brainstorm");
    expect(await currentSpell(user.id, chat)).toBe("brainstorm");
  });
});
