import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { messageOpenTo, spellResultOpenTo } from "@/accounts/owner-scope.ts";
import { readUserName } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { messages } from "@/db/tables/quests-and-chats.ts";
import { spellMessageResults } from "@/db/tables/spell-message-results.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";
import type { ChatRequest } from "@/replies/chat-protocol.ts";
import { resolveSpellName } from "@/spells/own-spell-store.ts";
import { saveSpellMessage } from "@/spells/save-spell-message.ts";
import { getSpell, SPELL_ID } from "@/spells/spell.ts";
import {
  DEFAULT_SPELL_RESPONSES,
  type SpellSnapshot,
} from "@/spells/spell-definition.ts";
import { spellResponse } from "@/spells/spell-response.ts";
import { readActiveSpell, setSpell } from "@/spells/spell-store.ts";
import { SPELL_MODE_COPY } from "@/ui/copy/spells.ts";

const COMMAND = z.enum(["brainstorm", "plan", "stop"]);
const LEADING_SLASH = /^\//u;
const OTHER_COMMAND = /^\s*(?:\/|help\b|look\b|cast\b)/iu;

interface SpellResponse {
  readonly text: string | null;
}

async function responseText(
  owner: UserId,
  spell: SpellSnapshot,
  templates: readonly string[],
  message: string,
): Promise<SpellResponse> {
  let userName: string | undefined;
  if (templates.some((template) => template.includes("{{name}}"))) {
    userName = await readUserName(owner);
  }
  return { text: spellResponse(templates, spell, message, { userName }) };
}

async function respond(
  owner: UserId,
  chat: Chat,
  message: ChatRequest["message"],
  tx: Transaction,
): Promise<SpellResponse> {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
  const verb = text.toLowerCase().replace(LEADING_SLASH, "");
  const command = COMMAND.safeParse(verb);
  const casting = verb.startsWith("cast ");
  if (command.success || casting) {
    if (verb === "stop") {
      const active = await readActiveSpell(owner, chat, tx);
      await setSpell(owner, { chatId: chat.id, spell: undefined }, tx);
      if (active === undefined) {
        return { text: DEFAULT_SPELL_RESPONSES.stopReply };
      }
      return responseText(owner, active, active.definition.stopReply, text);
    }
    if (chat.quest === undefined) {
      return { text: SPELL_MODE_COPY.noQuest };
    }
    let selected: SpellSnapshot;
    if (casting) {
      const name = text.replace(LEADING_SLASH, "").slice("cast ".length).trim();
      const resolved = await resolveSpellName(owner, name);
      if (resolved.kind === "ambiguous") {
        return { text: SPELL_MODE_COPY.ambiguous };
      }
      if (resolved.kind !== "found") {
        return { text: SPELL_MODE_COPY.castUsage };
      }
      selected = resolved.spell;
    } else {
      selected = getSpell(SPELL_ID.parse(verb));
    }
    if (!(await setSpell(owner, { chatId: chat.id, spell: selected.id }, tx))) {
      return { text: SPELL_MODE_COPY.castUsage };
    }
    return responseText(owner, selected, selected.definition.castReply, text);
  }
  if (OTHER_COMMAND.test(text) || chat.quest === undefined) {
    return { text: null };
  }
  const spell = await readActiveSpell(owner, chat, tx);
  if (spell === undefined) {
    return { text: null };
  }
  const saved = await saveSpellMessage(
    owner,
    { destination: spell.definition.destination, questId: chat.quest.id, text },
    tx,
  );
  if (!saved) {
    return responseText(owner, spell, spell.definition.invalidReply, text);
  }
  return responseText(owner, spell, spell.definition.savedReply, text);
}

// Executes the active spell once per saved message. The result and bucket
// write commit together; retrying after a lost reply never adds a second item.
function spellReply(
  owner: UserId,
  chat: Chat,
  message: ChatRequest["message"],
): Promise<string | undefined> {
  return withAppErrors("spellReply", () =>
    inTransaction(async (tx): Promise<string | undefined> => {
      const [saved] = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.id, message.id),
            eq(messages.chatId, chat.id),
            messageOpenTo(owner),
          ),
        )
        .for("update");
      if (saved === undefined) {
        return undefined;
      }
      const [previous] = await tx
        .select({ text: spellMessageResults.text })
        .from(spellMessageResults)
        .where(
          and(
            eq(spellMessageResults.messageId, message.id),
            spellResultOpenTo(owner),
          ),
        );
      if (previous !== undefined) {
        return previous.text;
      }
      const response = await respond(owner, chat, message, tx);
      if (response.text !== null) {
        await tx.insert(spellMessageResults).values({
          messageId: message.id,
          chatId: chat.id,
          text: response.text,
        });
        return response.text;
      }
      return undefined;
    }),
  );
}

export { spellReply };
