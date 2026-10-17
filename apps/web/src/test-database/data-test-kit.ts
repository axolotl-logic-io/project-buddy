// Data a server test needs before it starts, made through the app's stores
// in the test database, as e2e/fixtures.ts makes an e2e test's. Projects
// and chats belong to a test user and go when the user is deleted; manual
// sections are added beside the others and removed after the test, by the
// setup file (vitest.server-setup.ts).
import type { User } from "@/accounts/users-store.ts";
import { type BuddyId, DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { addManualSections } from "@/manual/manual-index.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { createProject, type Project } from "@/projects/store.ts";

const NAME_SUFFIX_LENGTH = 8;

// Projects and chats of one user, and sections of the manual.
interface TestData {
  // A new project, named name, or a unique name when name is missing.
  readonly project: (name?: string) => Promise<Project>;
  // A new chat in project, in the voice of buddyId or the default buddy.
  readonly chat: (project: Project, buddyId?: BuddyId) => Promise<Chat>;
  // Sections added to the manual index, beside any others, so the tutor's
  // search can find them.
  readonly manualSections: (
    sections: readonly ManualSection[],
  ) => Promise<void>;
}

// Removes what the test added to the manual index.
const removers: (() => Promise<void>)[] = [];

function uniqueSuffix(): string {
  return crypto.randomUUID().slice(0, NAME_SUFFIX_LENGTH);
}

// The data of user, a test user from testUser.
function testData(user: User): TestData {
  return {
    project: (name = `Test project ${uniqueSuffix()}`): Promise<Project> =>
      createProject(user.id, name),
    chat: (
      project: Project,
      buddyId: BuddyId = DEFAULT_BUDDY_ID,
    ): Promise<Chat> =>
      createChat(user.id, { projectId: project.id, buddy: getBuddy(buddyId) }),
    manualSections: async (
      sections: readonly ManualSection[],
    ): Promise<void> => {
      removers.push(await addManualSections(sections));
    },
  };
}

// Removes the manual sections the test added.
async function removeTestData(): Promise<void> {
  await Promise.all(removers.splice(0).map((remove) => remove()));
}

export type { TestData };
export { removeTestData, testData };
