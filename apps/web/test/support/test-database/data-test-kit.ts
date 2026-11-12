// Data a server test needs before it starts, made through the app's stores
// in the test database, for server tests and for test/system/fixtures.ts's
// testData. Quests and chats belong to a test user and go when the user
// is deleted; manual sections are added beside the others and removed by
// removeTestData, which the setup file (vitest.server-setup.ts) and the e2e
// fixture call after each test.

import type { UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import { enterActivity } from "@/activities/activity-sessions.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { addManualSections } from "@/blender-manual/manual-index.ts";
import type { ManualSection } from "@/blender-manual/manual-sections.ts";
import { manualUrl } from "@/blender-manual/manual-source.ts";
import type { QuestChat } from "@/chats/chat-rows.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { saveMessage, saveReply } from "@/chats/store.ts";
import {
  cloneConstruct,
  type OwnConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
} from "@/constructs/index.ts";
import { getDb } from "@/db/client.ts";
import { messages, quests } from "@/db/tables/quests-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest, type Quest } from "@/quests/store.ts";
import { messageIdFixture } from "../id-fixtures.ts";

const NAME_SUFFIX_LENGTH = 8;

// One of her messages and the construct's reply to it, as the reply's stream
// saves them. author, another user, writes the message instead, as a
// member of a team quest would; it is recorded straight in the messages
// table, since the chat isn't theirs.
interface Exchange {
  readonly message: string;
  readonly reply: readonly UIMessage["parts"][number][];
  readonly author?: User;
}

// Quests and chats of one user, and sections of the manual.
interface TestData {
  // A new quest, named name, or a unique name when name is missing.
  // Supply createdAt when a test needs a fixed chronological order.
  readonly quest: (name?: string, createdAt?: Date) => Promise<Quest>;
  // A new chat in quest, in the voice of constructId or the default construct.
  readonly chat: (
    quest: Quest,
    constructId?: ConstructId,
  ) => Promise<QuestChat>;
  // A new construct of the user's own, cloned from the default construct with its
  // voice edited, so it has no prepared opening and writes its own.
  readonly editedConstruct: () => Promise<OwnConstruct>;
  // Makes the chat, a quest chat, its quest's interview chat.
  readonly interviewChat: (chat: { readonly id: ChatId }) => Promise<void>;
  // Saves the exchanges in the chat, one after another, so they keep their
  // order.
  readonly exchanges: (
    chat: { readonly id: ChatId },
    exchanges: readonly Exchange[],
  ) => Promise<void>;
  // Sections added to the manual index, beside any others, so the construct's
  // search can find them. manualSection makes one.
  readonly manualSections: (
    sections: readonly ManualSection[],
  ) => Promise<void>;
}

// The owner's clone of the default construct, with its voice edited.
async function testEditedConstruct(owner: UserId): Promise<OwnConstruct> {
  const clone = await cloneConstruct(owner, DEFAULT_CONSTRUCT_ID);
  if (clone === undefined) {
    throw new Error("The default construct wasn't cloned");
  }
  const edited = await updateConstruct(owner, clone.id, {
    definition: {
      ...clone.definition,
      prompt: `${clone.definition.prompt}\n\nEdited.`,
    },
  });
  if (edited === undefined) {
    throw new Error("The clone wasn't edited");
  }
  return edited;
}

// Removes what the test added to the manual index.
const removers: (() => Promise<void>)[] = [];

function uniqueSuffix(): string {
  return crypto.randomUUID().slice(0, NAME_SUFFIX_LENGTH);
}

// Puts the owner's chat in the quest interview from its start, as the
// chat a quest is created with is: its quest's interview chat.
async function setInterviewChat(owner: UserId, chatId: ChatId): Promise<void> {
  await enterActivity(
    owner,
    chatId,
    builtInActivity(INTERVIEW_ACTIVITY_ID),
    undefined,
  );
}

async function saveExchanges(
  owner: UserId,
  chatId: ChatId,
  exchanges: readonly Exchange[],
): Promise<void> {
  const [exchange, ...rest] = exchanges;
  if (exchange === undefined) {
    return;
  }
  const messageId = messageIdFixture();
  await saveMessage(owner, chatId, {
    id: messageId,
    role: "user",
    parts: [{ type: "text", text: exchange.message }],
  });
  if (exchange.author !== undefined) {
    await getDb()
      .update(messages)
      .set({ userId: exchange.author.id })
      .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)));
  }
  await saveReply(
    owner,
    chatId,
    { id: messageIdFixture(), role: "assistant", parts: [...exchange.reply] },
    messageId,
  );
  await saveExchanges(owner, chatId, rest);
}

// A quest of the owner's named name, made at createdAt when it is given.
// A name the site would refuse now, such as one longer than the limit, is
// saved as quests named before the limit kept theirs.
async function testQuest(
  owner: UserId,
  name: string,
  createdAt: Date | undefined,
): Promise<Quest> {
  const checked = QUEST_NAME.safeParse(name);
  const allowed = checked.success && checked.data === name;
  let created = QUEST_NAME.parse(`Test project ${uniqueSuffix()}`);
  if (checked.success) {
    created = checked.data;
  }
  const quest = await createQuest(owner, created);
  if (allowed && createdAt === undefined) {
    return quest;
  }
  const saved = { name, createdAt: createdAt ?? quest.createdAt };
  await getDb()
    .update(quests)
    .set(saved)
    .where(and(eq(quests.id, quest.id), questOwnedBy(owner)));
  return { ...quest, ...saved };
}

// The data of user, a test user from testUser.
function testData(user: User): TestData {
  return {
    quest: (
      name = `Test project ${uniqueSuffix()}`,
      createdAt?: Date,
    ): Promise<Quest> => testQuest(user.id, name, createdAt),
    chat: (
      quest: Quest,
      constructId: ConstructId = DEFAULT_CONSTRUCT_ID,
    ): Promise<QuestChat> =>
      createChat(user.id, { quest, construct: getConstruct(constructId) }),
    editedConstruct: (): Promise<OwnConstruct> => testEditedConstruct(user.id),
    interviewChat: (chat: { readonly id: ChatId }): Promise<void> =>
      setInterviewChat(user.id, chat.id),
    exchanges: (
      chat: { readonly id: ChatId },
      exchanges: readonly Exchange[],
    ): Promise<void> => saveExchanges(user.id, chat.id, exchanges),
    manualSections: async (
      sections: readonly ManualSection[],
    ): Promise<void> => {
      removers.push(await addManualSections(sections));
    },
  };
}

// A section of a made-up manual page, for a test's own sections
// (manualSections), with the URL the app links its citation to.
function manualSection(
  page: string,
  anchor: string,
  title: string,
  text: string,
): ManualSection {
  const filePath = `manual/${page}.rst`;
  return { title, text, filePath, anchor, url: manualUrl(filePath, anchor) };
}

// Removes the manual sections the test added.
async function removeTestData(): Promise<void> {
  await Promise.all(removers.splice(0).map((remove) => remove()));
}

export type { Exchange, TestData };
export { manualSection, removeTestData, testData };
