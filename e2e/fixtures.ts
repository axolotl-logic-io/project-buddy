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
// - Each test's browser sends its own client address, `clientAddress`, so
//   rate limits on one test never hold up another. `otherClientAddress` is a
//   second one, for a test that switches its browser to another connection.
// - The rate-limit rows of every account's address, of `newAddress` and of
//   each client address are deleted when the test ends, through
//   endRateLimitWindowsFor.
// - `newAddress` is an email address no account has, for a test that signs
//   up through the site. The account the site makes for it is deleted when
//   the test ends.
// - `testData` makes the account's projects and chats through the app's
//   stores, and adds manual sections through the manual index, in the test
//   database.
import {
  type BrowserContext,
  test as base,
  type TestInfo,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import {
  findOrCreateUser,
  normalizeEmail,
  type User,
} from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { type Database, getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { addManualSections } from "@/manual/manual-index.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  type PersonaId,
} from "@/personas/index.ts";
import { createProject, type Project } from "@/projects/store.ts";
import { quotaResetsOn } from "@/quota/quota-terms.ts";
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
  // The client address the test's browser sends, in x-forwarded-for.
  readonly clientAddress: string;
  // Another client address of the test's own, which the browser sends only
  // once the test sets it.
  readonly otherClientAddress: string;
  // An email address no account has yet, for signing up through the site.
  readonly newAddress: string;
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
// projects, chats, memory and rate-limit rows when the test ends.
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
  await endRateLimitWindowsFor({ address: account.email });
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
      createChat(account.id, {
        projectId: project.id,
        persona: getPersona(personaId),
      }),
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
  {
    context,
    clientAddress,
  }: { context: BrowserContext; clientAddress: string },
  use: (context: BrowserContext) => Promise<void>,
): Promise<void> {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": clientAddress });
  await use(context);
}

// A client address of the test's own, whose rate-limit rows are deleted when
// the test ends. It needs no other fixture, but Playwright reads a fixture's
// first argument as a destructured object.
async function useClientAddress(
  { database: _database }: { database: Database },
  use: (clientAddress: string) => Promise<void>,
  testInfo: TestInfo,
): Promise<void> {
  const clientAddress = uniqueClientAddress(testInfo);
  await use(clientAddress);
  await endRateLimitWindowsFor({ clientKey: clientAddress });
}

// An address no account has, whose account, if the site makes one, and
// rate-limit rows are deleted when the test ends.
async function useNewAddress(
  { database }: { database: Database },
  use: (address: string) => Promise<void>,
): Promise<void> {
  const address = normalizeEmail(`e2e-new-${crypto.randomUUID()}@example.test`);
  await use(address);
  await database.delete(users).where(eq(users.email, address));
  await endRateLimitWindowsFor({ address });
}

const test = base.extend<Fixtures, WorkerFixtures>({
  database: [getDb(), { scope: "worker" }],
  clientAddress: useClientAddress,
  otherClientAddress: useClientAddress,
  newAddress: useNewAddress,
  context: useUniqueClientAddress,
  account: useAccount,
  testData: useTestData,
  otherAccount: useAccount,
  otherTestData: useOtherTestData,
});

// Adds microUsd to account's spend this month (UTC), as its model calls
// would, for tests of the monthly quota. It adds the same to next month's:
// a run that crosses a month's end before the server reads the spend then
// still finds it, and until the month turns no page shows next month's.
async function spend(account: User, microUsd: number): Promise<void> {
  const now = new Date();
  await recordSpend(account.id, microUsd, now);
  await recordSpend(account.id, microUsd, quotaResetsOn(now));
}

export type { TestData };
export { spend, test };
