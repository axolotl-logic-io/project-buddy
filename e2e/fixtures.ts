// Playwright's `test`, extended for this app. Every spec imports `test` from
// here and `expect` from Playwright. Each test is named by its use case's
// slug in use-cases/. A spec file groups the cases that exercise one part
// of the site and share its helpers, whichever area's file they
// are in: when-things-go-wrong.spec.ts, for example, holds the failure cases
// of Access, Projects and Chats. `logIn` in log-in.ts signs a page in as
// the test's account, and chat-page.ts reads and writes a chat.
//
// - Each test has its own account, so it sees only the projects it makes,
//   whatever runs beside it. The account is deleted, with everything in it,
//   when the test ends.
// - Each test's browser sends its own client address, so rate limits on
//   one test never hold up another.
// - `testData` makes the account's projects and chats through the app's
//   stores, and adds manual sections through the manual index, in the test
//   database.
import {
  type BrowserContext,
  test as base,
  type TestInfo,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { findOrCreateUser, type User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { type Database, getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { addManualSections } from "@/manual/manual-index.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";
import { createProject, type Project } from "@/projects/store.ts";
import { recordSpend } from "@/quota/spend-store.ts";

// Projects and chats of one account that a test needs before it starts.
interface TestData {
  // The account the projects and chats are made for.
  readonly account: User;
  // A new project, named name, or a unique name when name is missing.
  readonly project: (name?: string) => Promise<Project>;
  // A new chat in project, in the voice of personaId or the default persona.
  readonly chat: (project: Project, personaId?: PersonaId) => Promise<Chat>;
  // Sections added to the manual index, beside any others, so the tutor's
  // search can find them. `manualSectionsFromRst` makes them from a page.
  readonly manualSections: (
    sections: readonly ManualSection[],
  ) => Promise<void>;
}

interface Fixtures {
  // The test's account, which logIn signs in as.
  readonly account: User;
  // The account's projects and chats.
  readonly testData: TestData;
  // A second account, and its projects and chats, for tests of what one
  // user can't see of another's.
  readonly otherAccount: User;
  readonly otherTestData: TestData;
}

interface WorkerFixtures {
  // The test database, which .env.test names.
  readonly database: Database;
}

const HEXADECIMAL = 16;
const NAME_SUFFIX_LENGTH = 8;

// Tests started in this worker process so far.
let testsInWorker = 0;

// A client address no other test in the run uses, from IPv6's documentation
// range, which no real client has.
function uniqueClientAddress(testInfo: TestInfo): string {
  testsInWorker += 1;
  const worker = testInfo.workerIndex.toString(HEXADECIMAL);
  return `2001:db8:${worker}::${testsInWorker.toString(HEXADECIMAL)}`;
}

function uniqueSuffix(): string {
  return crypto.randomUUID().slice(0, NAME_SUFFIX_LENGTH);
}

// A new account, under an address no other test uses, deleted with its
// projects, chats and memory when the test ends.
async function useAccount(
  { database }: { database: Database },
  use: (account: User) => Promise<void>,
): Promise<void> {
  const account = await findOrCreateUser(
    `e2e-${crypto.randomUUID()}@example.test`,
  );
  await use(account);
  // Deleting a user deletes everything of theirs. The stores have no
  // delete, so this module is the one place e2e/ names the table.
  await database.delete(users).where(eq(users.id, account.id));
}

// Test data of the account, with manual sections that are removed when the
// test ends.
async function useTestDataOf(
  account: User,
  use: (testData: TestData) => Promise<void>,
): Promise<void> {
  const removeManualSections: (() => Promise<void>)[] = [];
  await use({
    account,
    project: (name = `Test project ${uniqueSuffix()}`): Promise<Project> =>
      createProject(account.id, name),
    chat: (
      project: Project,
      personaId: PersonaId = DEFAULT_PERSONA_ID,
    ): Promise<Chat> =>
      createChat(account.id, { projectId: project.id, personaId }),
    manualSections: async (
      sections: readonly ManualSection[],
    ): Promise<void> => {
      removeManualSections.push(await addManualSections(sections));
    },
  });
  await Promise.all(removeManualSections.map((remove) => remove()));
}

function useTestData(
  { account }: { account: User },
  use: (testData: TestData) => Promise<void>,
): Promise<void> {
  return useTestDataOf(account, use);
}

function useOtherTestData(
  { otherAccount }: { otherAccount: User },
  use: (testData: TestData) => Promise<void>,
): Promise<void> {
  return useTestDataOf(otherAccount, use);
}

// Gives the test's browser its own client address.
async function useUniqueClientAddress(
  { context }: { context: BrowserContext },
  use: (context: BrowserContext) => Promise<void>,
  testInfo: TestInfo,
): Promise<void> {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": uniqueClientAddress(testInfo),
  });
  await use(context);
}

const test = base.extend<Fixtures, WorkerFixtures>({
  database: [getDb(), { scope: "worker" }],
  context: useUniqueClientAddress,
  account: useAccount,
  testData: useTestData,
  otherAccount: useAccount,
  otherTestData: useOtherTestData,
});

// Adds microUsd to account's spend this month (UTC), as its model calls
// would, for tests of the monthly quota.
async function spend(account: User, microUsd: number): Promise<void> {
  await recordSpend(account.id, microUsd, new Date());
}

export type { TestData };
export { spend, test };
