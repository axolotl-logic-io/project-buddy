// Times show in the zone of her browser, not the server's: a project's
// start ("use_case_view_projects"), a chat's start ("use_case_open_project")
// and a memory version's time ("use_case_view_memory"), each at one instant
// that falls on a different day in New York than in Tokyo. The server
// renders them in UTC, unseen, and hydrating shows the browser's time with
// no mismatch. The browser-<zone> projects in vitest.config.mts run this
// file in each zone, in Chromium and WebKit, each with a locale of its own,
// which the times ignore: they are always in English.
import type { ReactNode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { MemoryHistory } from "@/app/(workspace)/projects/[projectId]/memory/memory-history.tsx";
import { getBuddy } from "@/buddies/index.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { ProjectList } from "@/components/project-list.tsx";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The restore form posts to a Server Action, which this test never runs.
vi.mock("@/app/(workspace)/projects/[projectId]/memory/actions.ts", () => ({
  restoreMemoryAction: vi.fn(),
}));

// 20:16 on October 12 in New York (EDT), October 13 in UTC, and 9:16 the
// next morning in Tokyo: the release sweep's project, which showed
// "12:16 AM".
const INSTANT = new Date("2026-10-13T00:16:00Z");
const PROJECT_ID = projectIdFixture();

// The instant's day and minute as she reads them in a zone.
interface ZoneTimes {
  readonly day: string;
  readonly minute: string;
}

const TIMES_BY_ZONE: Readonly<Record<string, ZoneTimes>> = {
  "America/New_York": {
    day: "Oct 12, 2026",
    minute: "Oct 12, 2026, 08:16 PM",
  },
  "Asia/Tokyo": {
    day: "Oct 13, 2026",
    minute: "Oct 13, 2026, 09:16 AM",
  },
};

// The browser's zone, which the project running this file set.
function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// The instant's times in the browser's zone; fails unless it is one of the
// zones the test knows.
function zoneTimes(): ZoneTimes {
  const zone = browserZone();
  const times = TIMES_BY_ZONE[zone];
  if (times === undefined) {
    throw new Error(
      `The browser is in ${zone}, not one of ${Object.keys(TIMES_BY_ZONE).join(", ")}: run this file through a browser-<zone> project`,
    );
  }
  return times;
}

// What hydrating reported: React's recoverable errors, such as a hydration
// mismatch, and every console error.
interface Hydration {
  readonly recoverableErrors: unknown[];
  readonly consoleErrors: unknown[][];
}

let root: Root | undefined;
let container: HTMLElement | undefined;

// Renders tree on the server, puts its HTML on the page, and hydrates it,
// as a page's first load does.
function serverRenderThenHydrate(tree: ReactNode): Hydration {
  const recoverableErrors: unknown[] = [];
  const consoleErrors: unknown[][] = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args);
  });
  container = document.createElement("div");
  container.innerHTML = renderToString(tree);
  document.body.append(container);
  root = hydrateRoot(container, tree, {
    onRecoverableError: (error: unknown): void => {
      recoverableErrors.push(error);
    },
  });
  return { recoverableErrors, consoleErrors };
}

// Everything hydrating reported, recoverable errors first.
function hydrationErrors({
  recoverableErrors,
  consoleErrors,
}: Hydration): readonly unknown[] {
  return [...recoverableErrors, ...consoleErrors];
}

beforeEach(() => {
  zoneTimes();
});

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
  vi.restoreAllMocks();
});

describe("use_case_view_projects", () => {
  test(`a project's start shows on her day, in ${browserZone()}`, async () => {
    const hydration = serverRenderThenHydrate(
      <ProjectList
        projects={[
          {
            id: PROJECT_ID,
            name: "Low-poly fox",
            interviewChatId: undefined,
            createdAt: INSTANT,
          },
        ]}
      />,
    );

    await expect
      .element(page.getByRole("listitem"))
      .toMatchTextContent(PROJECTS_COPY.created(zoneTimes().day));
    expect(hydrationErrors(hydration), "hydration errors").toStrictEqual([]);
  });
});

describe("use_case_open_project", () => {
  test(`a chat's start shows at her time, in ${browserZone()}`, async () => {
    const hydration = serverRenderThenHydrate(
      <ChatList
        chats={[
          {
            id: chatIdFixture(),
            projectId: PROJECT_ID,
            buddy: getBuddy("mr-tee"),
            name: undefined,
            renamedByHand: false,
            createdAt: INSTANT,
          },
        ]}
      />,
    );

    await expect
      .element(page.getByRole("listitem"))
      .toMatchTextContent(PROJECT_COPY.chatStarted(zoneTimes().minute));
    expect(hydrationErrors(hydration), "hydration errors").toStrictEqual([]);
  });
});

describe("use_case_view_memory", () => {
  test(`a version's time shows at her time, in ${browserZone()}`, async () => {
    const hydration = serverRenderThenHydrate(
      <MemoryHistory
        history={[
          {
            version: MEMORY_VERSION_NUMBER.parse(1),
            text: "## Goals",
            author: "user",
            createdAt: INSTANT,
          },
        ]}
        projectId={PROJECT_ID}
      />,
    );

    await expect
      .element(page.getByRole("listitem"))
      .toMatchTextContent(
        MEMORY_COPY.versionMade(MEMORY_COPY.byUser, zoneTimes().minute),
      );
    expect(hydrationErrors(hydration), "hydration errors").toStrictEqual([]);
  });
});
