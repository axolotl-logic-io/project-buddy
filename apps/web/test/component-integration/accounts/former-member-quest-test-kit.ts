// A fixture for owner isolation: the former member has no membership rows,
// and every store must still deny them.

import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import {
  readQuestConversation,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { getQuest, listQuests, type Quest } from "@/quests/store.ts";
import { currentSpell, setSpell } from "@/spells/spell-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { newMessageId, question } from "../test-database/chat-test-kit.ts";

// A quest, its owner and a former member, with one of each kind of data the
// owner saved in it.
interface FormerMemberQuest {
  readonly owner: User;
  readonly member: User;
  readonly quest: Quest;
  readonly chat: Chat;
}

// A new quest of a new owner's, with a chat holding a message, an active
// spell; and a second user with no access to it.
async function formerMemberQuest(): Promise<FormerMemberQuest> {
  const [owner, member] = await Promise.all([testUser(), testUser()]);
  const data = testData(owner);
  const quest = await data.quest();
  const chat = await data.chat(quest);
  await setSpell(owner.id, { chatId: chat.id, spell: "tasks" });
  await data.exchanges(chat, [
    { message: "Hello", reply: [{ type: "text", text: "Hi" }] },
  ]);
  return {
    owner,
    member,
    quest,
    chat,
  };
}

// Everything user can read of the quest, through each store that
// reads quest data.
async function seenBy(
  user: User,
  fixture: FormerMemberQuest,
): Promise<Record<string, unknown>> {
  const { quest, chat } = fixture;
  const [found, listed, conversation, openedChat, messages, spell] =
    await Promise.all([
      getQuest(user.id, quest.id),
      listQuests(user.id),
      readQuestConversation(user.id, quest.id),
      getChat(user.id, chat.id),
      listMessages(user.id, chat.id),
      currentSpell(user.id, chat),
    ]);
  return {
    quest: found?.name,
    listed: listed.some(({ id }) => id === quest.id),
    conversation: conversation?.id,
    chat: openedChat?.id,
    messages: messages.length,
    spell,
  };
}

// What someone other than the owner reads of the quest: nothing, exactly
// as of a quest that doesn't exist.
const NOTHING: Record<string, unknown> = {
  quest: undefined,
  listed: false,
  conversation: undefined,
  chat: undefined,
  messages: 0,
  spell: undefined,
};

// Tries every write the owner may make in the quest, as user, and says what
// each answered: whether it took effect.
async function writesBy(
  user: User,
  fixture: FormerMemberQuest,
): Promise<Record<string, unknown>> {
  const { quest, chat } = fixture;
  const message = await saveMessage(user.id, chat.id, {
    ...question("Mine"),
    id: newMessageId(),
  });
  const spell = await setSpell(user.id, {
    chatId: chat.id,
    spell: "brainstorm",
  });
  const started = await startQuestConversation(user.id, quest.id);
  const conversation =
    started.kind === "started" && started.conversation.id === chat.id;
  return {
    message,
    spell,
    conversation,
  };
}

// What every write answers for someone other than the owner: nothing
// taken.
const NONE_TAKEN: Record<string, unknown> = {
  message: "id-taken",
  spell: false,
  conversation: false,
};

// What every write answers for the owner: each one taken.
const ALL_TAKEN: Record<string, unknown> = {
  message: "inserted",
  spell: true,
  conversation: true,
};

export { ALL_TAKEN, formerMemberQuest, NONE_TAKEN, NOTHING, seenBy, writesBy };
