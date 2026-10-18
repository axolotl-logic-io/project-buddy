// Playwright's `test`, extended for this app. Every spec imports `test` from
// here and `expect` from Playwright. Each test is named by its use case's
// slug in use-cases/. A spec file groups the cases that exercise one part
// of the site and share its helpers, whichever area's file they
// are in: when-things-go-wrong.spec.ts, for example, holds Access's
// lapsed-session case. `logIn` in log-in.ts signs a page in as
// the test's account, and chat-page.ts reads and writes a chat.
//
// The accounts and their data come from the server tests' kit in
// src/test-database/, so both kinds of test make them one way.
//
// - Each test has its own account, so it sees only the projects it makes,
//   whatever runs beside it. `otherAccount` is a second one. Both are
//   deleted, with everything in them and their rate-limit rows, when the
//   test ends (testUser and deleteTestUsers in user-test-kit.ts). A worker
//   runs one test at a time, so the kit's users are this test's alone.
// - Each test's browser sends its own client address, `clientAddress`, so
//   rate limits on one test never hold up another. `otherClientAddress` is a
//   second one, for a test that switches its browser to another connection.
// - The rate-limit rows of `newAddress` and of each client address are
//   deleted when the test ends, through endRateLimitWindowsFor.
// - `newAddress` is an email address no account has, for a test that signs
//   up through the site. The account the site makes for it is deleted when
//   the test ends.
// - `testData` makes the account's projects and chats through the app's
//   stores, and adds manual sections through the manual index, in the test
//   database (testData in data-test-kit.ts). The sections are removed when
//   the test ends.
import {
  type BrowserContext,
  test as base,
  type TestInfo,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import { normalizeEmail, type User } from "@/accounts/users-store.ts";
import { type Database, getDb } from "@/db/client.ts";
import { invitations } from "@/db/tables/invitations.ts";
import { users } from "@/db/tables/users.ts";
import {
  type TestData as AccountData,
  removeTestData,
  testData,
} from "../test/test-database/data-test-kit.ts";
import {
  deleteTestUsers,
  testUser,
} from "../test/test-database/user-test-kit.ts";

// Projects and chats of one account that a test needs before it starts, and
// the account they are made for.
interface TestData extends AccountData {
  readonly account: User;
}

interface Fixtures {
  // The test's account, which logIn signs in as.
  readonly account: User;
  // The account's projects and chats.
  readonly testData: TestData;
  // A second account, for tests of more than one account.
  readonly otherAccount: User;
  // The client address the test's browser sends, in x-forwarded-for.
  readonly clientAddress: string;
  // Another client address of the test's own, which the browser sends only
  // once the test sets it.
  readonly otherClientAddress: string;
  // An email address no account has yet, for signing up through the site.
  readonly newAddress: string;
}

interface WorkerFixtures {
  // The run's test database, which DATABASE_URL names.
  readonly database: Database;
}

const HEXADECIMAL = 16;

// Tests started in this worker process so far.
let testsInWorker = 0;

// A client address no other test in the run uses, from IPv6's documentation
// range, which no real client has.
function uniqueClientAddress(testInfo: TestInfo): string {
  testsInWorker += 1;
  const worker = testInfo.workerIndex.toString(HEXADECIMAL);
  return `2001:db8:${worker}::${testsInWorker.toString(HEXADECIMAL)}`;
}

// A new account, under an address no other test uses, deleted with its
// projects, chats, memory and rate-limit rows when the test ends, together
// with any other account the test made. It needs no other fixture, but
// Playwright reads a fixture's first argument as a destructured object.
async function useAccount(
  { database: _database }: { database: Database },
  use: (account: User) => Promise<void>,
): Promise<void> {
  await use(await testUser());
  await deleteTestUsers();
}

// Test data of the account, with manual sections that are removed when the
// test ends.
async function useTestData(
  { account }: { account: User },
  use: (testData: TestData) => Promise<void>,
): Promise<void> {
  await use({ account, ...testData(account) });
  await removeTestData();
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
  await database.delete(invitations).where(eq(invitations.email, address));
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
});

export type { TestData };
export { test };
