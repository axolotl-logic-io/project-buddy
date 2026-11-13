import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { messageOpenTo, spellResultOpenTo } from "@/accounts/owner-scope.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { messages } from "@/db/tables/quests-and-chats.ts";
import { spellMessageResults } from "@/db/tables/spell-message-results.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { IDEA_REQUEST } from "@/ideas/idea.ts";
import { changeIdea } from "@/ideas/idea-store.ts";
import type { UserId } from "@/ids.ts";
import { PLAN_STEP_TEXT } from "@/plan/plan.ts";
import { changePlan } from "@/plan/plan-store.ts";
import type { ChatRequest } from "@/replies/chat-protocol.ts";
import { getSpell, SPELL_ID, type SpellId } from "@/spells/spell.ts";
import { currentSpell, setSpell } from "@/spells/spell-store.ts";
import { SPELL_MODE_COPY } from "@/ui/copy/spells.ts";

const COMMAND = z.enum(["brainstorm", "plan", "stop"]);
const LEADING_SLASH = /^\//u;
const OTHER_COMMAND = /^\s*(?:\/|help\b|look\b|search\b|cast\b)/iu;

interface SpellResponse {
  readonly text: string | null;
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
  let verb = text.toLowerCase().replace(LEADING_SLASH, "");
  if (verb.startsWith("cast ")) {
    const cast = SPELL_ID.safeParse(verb.slice("cast ".length).trim());
    if (!cast.success) {
      return { text: SPELL_MODE_COPY.castUsage };
    }
    verb = cast.data;
  }
  const command = COMMAND.safeParse(verb);
  if (command.success) {
    const name = command.data;
    if (chat.quest === undefined && name.toLowerCase() !== "stop") {
      return { text: SPELL_MODE_COPY.noQuest };
    }
    let spellId: SpellId | undefined;
    if (name !== "stop") {
      spellId = SPELL_ID.parse(name);
    }
    await setSpell(owner, { chatId: chat.id, spell: spellId }, tx);
    if (spellId === undefined) {
      return { text: SPELL_MODE_COPY.stopped };
    }
    return { text: SPELL_MODE_COPY.started(getSpell(spellId).name) };
  }
  if (OTHER_COMMAND.test(text) || chat.quest === undefined) {
    return { text: null };
  }
  const spell = await currentSpell(owner, chat, tx);
  if (spell === undefined) {
    return { text: null };
  }
  const parsed = PLAN_STEP_TEXT.safeParse(text);
  if (!parsed.success) {
    return { text: SPELL_MODE_COPY.invalid };
  }
  if (spell === "brainstorm") {
    await changeIdea(
      owner,
      IDEA_REQUEST.parse({
        op: "add",
        questId: chat.quest.id,
        text: parsed.data,
      }),
      tx,
    );
    return { text: SPELL_MODE_COPY.ideaSaved };
  }
  const result = await changePlan(
    owner,
    { questId: chat.quest.id, author: "person" },
    [{ op: "add", text: parsed.data }],
    tx,
  );
  if (result?.kind !== "changed") {
    return { text: SPELL_MODE_COPY.full };
  }
  return { text: SPELL_MODE_COPY.planSaved };
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
