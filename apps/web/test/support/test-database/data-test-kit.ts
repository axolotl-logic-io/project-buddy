// Data a server test needs before it starts, made through the app's stores
// in the test database, for server tests and for test/system/fixtures.ts's
// testData. Projects and chats belong to a test user and go when the user
// is deleted; manual sections are added beside the others and removed by
// removeTestData, which the setup file (vitest.server-setup.ts) and the e2e
// fixture call after each test.

import type { UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import { enterActivity } from "@/activities/activity-sessions.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/index.ts";
import {
  cloneBuddy,
  type OwnBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { type BuddyId, DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { saveMessage, saveReply } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { createProject, type Project } from "@/projects/store.ts";
import { addManualSections } from "@/skills/blender-manual/manual-index.ts";
import type { ManualSection } from "@/skills/blender-manual/manual-sections.ts";
import { manualUrl } from "@/skills/blender-manual/manual-source.ts";
import { messageIdFixture } from "../id-fixtures.ts";

const NAME_SUFFIX_LENGTH = 8;

// One of her messages and the buddy's reply to it, as the reply's stream
// saves them.
interface Exchange {
  readonly message: string;
  readonly reply: readonly UIMessage["parts"][number][];
}

// Projects and chats of one user, and sections of the manual.
interface TestData {
  // A new project, named name, or a unique name when name is missing.
  // Supply createdAt when a test needs a fixed chronological order.
  readonly project: (name?: string, createdAt?: Date) => Promise<Project>;
  // A new chat in project, in the voice of buddyId or the default buddy.
  readonly chat: (project: Project, buddyId?: BuddyId) => Promise<ProjectChat>;
  // A new buddy of the user's own, cloned from the default buddy with its
  // voice edited, so it has no prepared opening and writes its own.
  readonly editedBuddy: () => Promise<OwnBuddy>;
  // Makes the chat, a project chat, its project's interview chat.
  readonly interviewChat: (chat: { readonly id: ChatId }) => Promise<void>;
  // Saves the exchanges in the chat, one after another, so they keep their
  // order.
  readonly exchanges: (
    chat: { readonly id: ChatId },
    exchanges: readonly Exchange[],
  ) => Promise<void>;
  // Sections added to the manual index, beside any others, so the buddy's
  // search can find them. manualSection makes one.
  readonly manualSections: (
    sections: readonly ManualSection[],
  ) => Promise<void>;
}

// The owner's clone of the default buddy, with its voice edited.
async function testEditedBuddy(owner: UserId): Promise<OwnBuddy> {
  const clone = await cloneBuddy(owner, DEFAULT_BUDDY_ID);
  if (clone === undefined) {
    throw new Error("The default buddy wasn't cloned");
  }
  const edited = await updateBuddy(owner, clone.id, {
    parts: { ...clone.parts, voice: `${clone.parts.voice}\n\nEdited.` },
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

// Puts the owner's chat in the project interview from its start, as the
// chat a project is created with is: its project's interview chat.
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
  await saveReply(
    owner,
    chatId,
    { id: messageIdFixture(), role: "assistant", parts: [...exchange.reply] },
    messageId,
  );
  await saveExchanges(owner, chatId, rest);
}

async function testProject(
  owner: UserId,
  name: string,
  createdAt: Date | undefined,
): Promise<Project> {
  const project = await createProject(owner, name);
  if (createdAt === undefined) {
    return project;
  }
  await getDb()
    .update(projects)
    .set({ createdAt })
    .where(and(eq(projects.id, project.id), projectOwnedBy(owner)));
  return { ...project, createdAt };
}

// The data of user, a test user from testUser.
function testData(user: User): TestData {
  return {
    project: (
      name = `Test project ${uniqueSuffix()}`,
      createdAt?: Date,
    ): Promise<Project> => testProject(user.id, name, createdAt),
    chat: (
      project: Project,
      buddyId: BuddyId = DEFAULT_BUDDY_ID,
    ): Promise<ProjectChat> =>
      createChat(user.id, { project, buddy: getBuddy(buddyId) }),
    editedBuddy: (): Promise<OwnBuddy> => testEditedBuddy(user.id),
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
