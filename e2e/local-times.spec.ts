// Times show in the zone of her browser, not the server's: a project's
// start, a chat's start and a memory version's time, each seeded at one
// instant that falls on a different day in New York than in Tokyo. The
// server renders them in UTC, and a test server runs in its machine's zone,
// so two zones on either side of UTC tell the browser's zone apart from
// either.
import { expect, type Locator, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { chats, projects } from "@/db/tables/projects-and-chats.ts";
import type { ProjectId } from "@/ids.ts";
import { editMemory } from "@/memory/memory-store.ts";
import type { Project } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { openMemory } from "./memory-page.ts";

// 20:16 on October 12 in New York (EDT), October 13 in UTC, and 9:16 the
// next morning in Tokyo: the release sweep's project, which showed
// "12:16 AM".
const INSTANT = new Date("2026-10-13T00:16:00Z");

// A browser's zone, and the instant's day and minute as she reads them there.
interface Zone {
  readonly timezoneId: string;
  readonly day: string;
  readonly minute: string;
}

const ZONES: readonly Zone[] = [
  {
    timezoneId: "America/New_York",
    day: "Oct 12, 2026",
    minute: "Oct 12, 2026, 8:16 PM",
  },
  {
    timezoneId: "Asia/Tokyo",
    day: "Oct 13, 2026",
    minute: "Oct 13, 2026, 9:16 AM",
  },
];

// A project, with one chat and one memory version, all made at INSTANT.
async function projectMadeAtInstant(testData: TestData): Promise<Project> {
  const project = await testData.project();
  await testData.chat(project);
  await editMemory(testData.account.id, {
    projectId: project.id,
    edit: { oldText: "", newText: "## Goals" },
    author: "user",
  });
  await madeAt(project.id, INSTANT);
  return project;
}

// Moves the project's, its chats' and its memory versions' times to instant.
async function madeAt(projectId: ProjectId, instant: Date): Promise<void> {
  const database = getDb();
  await database
    .update(projects)
    .set({ createdAt: instant })
    .where(eq(projects.id, projectId));
  await database
    .update(chats)
    .set({ createdAt: instant })
    .where(eq(chats.projectId, projectId));
  await database
    .update(memoryVersions)
    .set({ createdAt: instant })
    .where(eq(memoryVersions.projectId, projectId));
}

// Records what the page logs as an error, such as React's hydration
// mismatch, which a time rendered differently by the server and the
// browser would cause.
function recordErrors(page: Page): readonly string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

function listItemNamed(page: Page, name: string): Locator {
  return page.getByRole("main").getByRole("listitem").filter({ hasText: name });
}

for (const zone of ZONES) {
  test.describe("use_case_view_projects", () => {
    test.use({ timezoneId: zone.timezoneId });

    test(`a project's start shows on her day, in ${zone.timezoneId}`, async ({
      account,
      page,
      testData,
    }) => {
      const project = await projectMadeAtInstant(testData);
      const errors = recordErrors(page);
      await logIn(page, account);

      await page.goto("/projects");

      await expect(listItemNamed(page, project.name)).toContainText(
        PROJECTS_COPY.created(zone.day),
      );
      expect(errors).toStrictEqual([]);
    });
  });

  test.describe("use_case_open_project", () => {
    test.use({ timezoneId: zone.timezoneId });

    test(`a chat's start shows at her time, in ${zone.timezoneId}`, async ({
      account,
      page,
      testData,
    }) => {
      const project = await projectMadeAtInstant(testData);
      const errors = recordErrors(page);
      await logIn(page, account);

      await page.goto(`/projects/${project.id}`);

      await expect(page.getByRole("main").getByRole("listitem")).toContainText(
        PROJECT_COPY.chatStarted(zone.minute),
      );
      expect(errors).toStrictEqual([]);
    });
  });

  test.describe("use_case_view_memory", () => {
    test.use({ timezoneId: zone.timezoneId });

    test(`a version's time shows at her time, in ${zone.timezoneId}`, async ({
      account,
      page,
      testData,
    }) => {
      const project = await projectMadeAtInstant(testData);
      const errors = recordErrors(page);
      await logIn(page, account);

      await openMemory(page, project);

      await expect(
        page
          .getByRole("list", { name: MEMORY_COPY.historyHeading })
          .getByRole("listitem"),
      ).toContainText(MEMORY_COPY.versionMade(MEMORY_COPY.byUser, zone.minute));
      expect(errors).toStrictEqual([]);
    });
  });
}
