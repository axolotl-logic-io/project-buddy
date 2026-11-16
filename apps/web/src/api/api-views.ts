// The records the API answers with, as the command-line interface reads
// them: only the fields a caller acts on, with dates as ISO 8601 text in UTC
// once serialized, and no model-only instructions or private definitions.

import { authorDisplayName, type ChatMessage } from "@/chats/message-author.ts";
import type { Conversation } from "@/conversations/conversation-store.ts";
import type { QuestSharing } from "@/quests/membership.ts";
import type { QuestStatus } from "@/quests/quest-status.ts";
import type { Quest } from "@/quests/store.ts";
import { SPELL_ID } from "@/spells/spell.ts";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";

// A quest. Its revision is its status revision, which a status change
// names.
interface QuestView {
  readonly id: string;
  readonly name: string;
  readonly status: QuestStatus;
  readonly revision: number;
  readonly dailies: boolean;
  readonly sharing: QuestSharing;
  readonly createdAt: Date;
}

// A spell, built in or the user's own, with where it saves the messages
// it captures.
interface SpellView {
  readonly id: string;
  readonly name: string;
  readonly destination: string;
  readonly builtIn: boolean;
}

// A message as people see it: who wrote it, and its text.
interface MessageView {
  readonly id: string;
  readonly role: string;
  // The user who wrote it; null for the construct's messages.
  readonly author: string | null;
  readonly text: string;
}

// A quest's conversation: its construct, its spell and its messages in
// conversation order.
interface ConversationView {
  readonly id: string;
  readonly construct: string;
  readonly activeSpell: SpellView | null;
  readonly awaitingReply: boolean;
  readonly messages: readonly MessageView[];
}

function questView(quest: Quest): QuestView {
  return {
    id: quest.id,
    name: quest.name,
    status: quest.status,
    revision: quest.statusRevision,
    dailies: quest.dailies,
    sharing: quest.sharing,
    createdAt: quest.createdAt,
  };
}

function spellView(spell: SpellSnapshot): SpellView {
  return {
    id: spell.id,
    name: spell.name,
    destination: spell.definition.destination,
    builtIn: SPELL_ID.safeParse(spell.id).success,
  };
}

// The message's text parts, joined; other parts, such as tool calls, are
// left out.
function messageText(message: ChatMessage): string {
  return message.parts
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("");
}

function messageView(message: ChatMessage): MessageView {
  let author: string | null = null;
  if (message.metadata?.author !== undefined) {
    author = authorDisplayName(message.metadata.author);
  }
  return {
    id: message.id,
    role: message.role,
    author,
    text: messageText(message),
  };
}

function conversationView(
  conversation: Conversation,
  {
    messages,
    awaitingReply,
  }: {
    readonly messages: readonly ChatMessage[];
    readonly awaitingReply: boolean;
  },
): ConversationView {
  let activeSpell: SpellView | null = null;
  if (conversation.activeSpell !== undefined) {
    activeSpell = spellView(conversation.activeSpell);
  }
  return {
    id: conversation.id,
    construct: conversation.construct.name,
    activeSpell,
    awaitingReply,
    messages: messages.map(messageView),
  };
}

export type { ConversationView, MessageView, QuestView, SpellView };
export { conversationView, messageView, questView, spellView };
