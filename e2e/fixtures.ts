// Playwright's `test`, extended for this app. Every spec imports `test` from
// here and `expect` from Playwright. Spec files follow the sections of
// USE_CASES.md, such as access.spec.ts for "Access", and each test is named
// by its use case's slug. `logIn` in log-in.ts signs a page in.
//
// - Each test's browser sends its own client address, so failed logins in
//   one test never lock another out.
// - `testData` makes projects and chats through the app's stores, and adds
//   manual sections through the manual index, in the test database. It
//   deletes them, with everything in them, when the test ends.
import {
  type BrowserContext,
  test as base,
  type TestInfo,
} from "@playwright/test";
import { inArray } from "drizzle-orm";
import { type Chat, createChat } from "@/chats/store.ts";
import { type Database, getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import type { ProjectId } from "@/ids.ts";
import { addManualSections } from "@/manual/manual-index.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";
import { createProject, type Project } from "@/projects/store.ts";
import { checkTestEnvironment } from "../scripts/test-db/test-database.ts";
import { WHOLE_DATABASE_TAG } from "./whole-database.ts";

// Projects and chats a test needs before it starts.
interface TestData {
  // A new project, named name, or a unique name when name is missing.
  readonly project: (name?: string) => Promise<Project>;
  // A new chat in project, in the voice of personaId or the default persona.
  readonly chat: (project: Project, personaId?: PersonaId) => Promise<Chat>;
  // Sections added to the manual index, beside any others, so the tutor's
  // search can find them. `manualSectionsFromRst` makes them from a page.
  readonly manualSections: (
    sections: readonly ManualSection[],
  ) => Promise<void>;
  // Deletes every project in the test database, with its chats, so the test
  // starts with none. Only a test tagged WHOLE_DATABASE_TAG may call it,
  // because it would delete the projects of tests running beside it.
  readonly deleteAllProjects: () => Promise<void>;
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

// Deletes every project, once the test has shown that it runs alone and
// against the test database.
async function deleteAllProjects(
  database: Database,
  testInfo: TestInfo,
): Promise<void> {
  if (!testInfo.tags.includes(WHOLE_DATABASE_TAG)) {
    throw new Error(
      `Only a test tagged ${WHOLE_DATABASE_TAG} may delete every project`,
    );
  }
  checkTestEnvironment();
  await database.delete(projects);
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
  testInfo: TestInfo,
): Promise<void> {
  const projectIds: ProjectId[] = [];
  const removeManualSections: (() => Promise<void>)[] = [];
  await use({
    project: async (name = uniqueProjectName()): Promise<Project> => {
      const project = await createProject(name);
      projectIds.push(project.id);
      return project;
    },
    chat: (
      project: Project,
      personaId: PersonaId = DEFAULT_PERSONA_ID,
    ): Promise<Chat> => createChat({ projectId: project.id, personaId }),
    manualSections: async (
      sections: readonly ManualSection[],
    ): Promise<void> => {
      removeManualSections.push(await addManualSections(sections));
    },
    deleteAllProjects: (): Promise<void> =>
      deleteAllProjects(database, testInfo),
  });
  await Promise.all(removeManualSections.map((remove) => remove()));
  if (projectIds.length > 0) {
    // Deleting a project deletes its chats and their messages. The stores
    // have no delete, so this module is the one place e2e/ names the table.
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
