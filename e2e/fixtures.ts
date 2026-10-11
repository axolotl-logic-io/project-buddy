// Playwright's `test`, extended for this app. Every spec imports `test` from
// here and `expect` from Playwright.
//
// - Each test's browser sends its own client address, so failed logins in
//   one test never lock another out.
// - `testData` puts projects and chats straight into the test database and
//   deletes them, with everything in them, when the test ends.
import {
  type BrowserContext,
  test as base,
  type TestInfo,
} from "@playwright/test";
import { inArray } from "drizzle-orm";
import type { Chat } from "@/chats/store.ts";
import { type Database, getDb } from "@/db/client.ts";
import { chats, projects } from "@/db/tables/projects-and-chats.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";

// Projects and chats a test needs before it starts.
interface TestData {
  // A new project, named name, or a unique name when name is missing.
  readonly project: (name?: string) => Promise<Project>;
  // A new chat in project, in the voice of personaId or the default persona.
  readonly chat: (project: Project, personaId?: PersonaId) => Promise<Chat>;
}

interface Fixtures {
  readonly testData: TestData;
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

function uniqueProjectName(): string {
  return `Test project ${crypto.randomUUID().slice(0, NAME_SUFFIX_LENGTH)}`;
}

async function insertProject(
  database: Database,
  name: string,
): Promise<Project> {
  const [project] = await database
    .insert(projects)
    .values({ name })
    .returning();
  if (project === undefined) {
    throw new Error("Inserting a test project returned no row");
  }
  return project;
}

async function insertChat(
  database: Database,
  project: Project,
  personaId: PersonaId,
): Promise<Chat> {
  const [chat] = await database
    .insert(chats)
    .values({ projectId: project.id, personaId })
    .returning();
  if (chat === undefined) {
    throw new Error("Inserting a test chat returned no row");
  }
  return chat;
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

async function useTestData(
  { database }: { database: Database },
  use: (testData: TestData) => Promise<void>,
): Promise<void> {
  const projectIds: string[] = [];
  await use({
    project: async (name = uniqueProjectName()): Promise<Project> => {
      const project = await insertProject(database, name);
      projectIds.push(project.id);
      return project;
    },
    chat: (
      project: Project,
      personaId: PersonaId = DEFAULT_PERSONA_ID,
    ): Promise<Chat> => insertChat(database, project, personaId),
  });
  if (projectIds.length > 0) {
    // Deleting a project deletes its chats and their messages.
    await database.delete(projects).where(inArray(projects.id, projectIds));
  }
}

const test = base.extend<Fixtures, WorkerFixtures>({
  database: [getDb(), { scope: "worker" }],
  context: useUniqueClientAddress,
  testData: useTestData,
});

export type { TestData };
export { test };
