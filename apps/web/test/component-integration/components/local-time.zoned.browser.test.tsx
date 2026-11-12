// Times show in the zone of her browser, not the server's: a quest's
// start ("use_case_view_quests"), a chat's start ("use_case_open_quest")
// that falls on a different day in New York than in Tokyo. The server
// renders them in UTC, unseen, and hydrating shows the browser's time with
// no mismatch. The browser-<zone> quests in vitest.config.mts run this
// file in each zone, in Chromium and WebKit, each with a locale of its own,
// which the times ignore: they are always in English.

import type { ReactNode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { page } from "vitest/browser";
import RetiredDefinitionPage from "@/app/(workspace)/retirement/[promptId]/page.tsx";
import { RetirementList } from "@/app/(workspace)/retirement/retirement-list.tsx";
import { LocalTime } from "@/components/local-time.tsx";
import { QuestList } from "@/components/quest-list.tsx";
import { formatTime, type TimeDetail } from "@/components/time-format.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { DEFAULT_THEME_CHOICE } from "@/themes/themes.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { RETIRED_CONSTRUCT } from "../retirement/retirement-fixtures.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";

// 20:16 on October 12 in New York (EDT), October 13 in UTC, and 9:16 the
// next morning in Tokyo: the release sweep's quest, which showed
// "12:16 AM".
const INSTANT = new Date("2026-10-13T00:16:00Z");
const QUEST_ID = questIdFixture();

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

// The browser's zone, which the quest running this file set.
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

// A time as the server's HTML held it: whether it was hidden, and its text.
interface ServerTime {
  readonly hidden: boolean;
  readonly text: string | null;
}

// The server's time, as its HTML held it before hydrating, and what
// hydrating reported: React's recoverable errors, such as a hydration
// mismatch, and every console error.
interface Hydration {
  readonly serverTime: ServerTime | undefined;
  readonly recoverableErrors: unknown[];
  readonly consoleErrors: unknown[][];
}

// The first time in element, if it holds one.
function readTime(element: HTMLElement): ServerTime | undefined {
  const time = element.querySelector("time");
  if (time === null) {
    return undefined;
  }
  return {
    hidden: getComputedStyle(time).visibility === "hidden",
    text: time.textContent,
  };
}

let reservedWidth = 0;
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
  // Read before hydrating, which changes the element in place.
  document.body.append(container);
  const serverTime = readTime(container);
  reservedWidth =
    container.querySelector("time")?.getBoundingClientRect().width ?? 0;
  root = hydrateRoot(container, tree, {
    onRecoverableError: (error: unknown): void => {
      recoverableErrors.push(error);
    },
  });
  return {
    serverTime,
    recoverableErrors,
    consoleErrors,
  };
}

// The time the server renders: unseen and in UTC, not in the browser's zone,
// which it cannot know, so the HTML is the same in every zone.
function hiddenServerTime(detail: TimeDetail): ServerTime {
  return { hidden: true, text: formatTime(INSTANT, detail, "UTC") };
}

// Everything hydrating reported, recoverable errors first.
function hydrationErrors({
  recoverableErrors,
  consoleErrors,
}: Hydration): readonly unknown[] {
  return [...recoverableErrors, ...consoleErrors];
}

beforeAll(installThemeFonts);
beforeEach(async () => {
  zoneTimes();
  applyTheme(DEFAULT_THEME_CHOICE.theme);
  await loadFonts();
});

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
  vi.restoreAllMocks();
});

describe("use_case_view_quests", () => {
  test(`a project's start shows on her day, in ${browserZone()}`, async () => {
    const hydration = serverRenderThenHydrate(
      <QuestList
        quests={[
          {
            id: QUEST_ID,
            name: "Low-poly fox",
            createdAt: INSTANT,
            status: "active",
            statusRevision: 0,
            dailies: false,
          },
        ]}
      />,
    );

    expect(hydration.serverTime, "the server's time").toStrictEqual(
      hiddenServerTime("day"),
    );
    await expect
      .element(page.getByRole("listitem"))
      .toMatchTextContent(QUESTS_COPY.created(zoneTimes().day));
    expect(hydrationErrors(hydration), "hydration errors").toStrictEqual([]);
  });
});

// Times are set in the body face with tabular figures (#843), so the
// placeholder may differ from the local time by a word's width, such as
// "AM" and "PM": a few pixels, never the room of a character more.
test("hydrating a time keeps about its reserved width, in the body face", async () => {
  serverRenderThenHydrate(<LocalTime dateTime={INSTANT} detail="minute" />);
  await expect.element(page.getByText(zoneTimes().minute)).toBeVisible();
  const time = container?.querySelector("time");
  if (time === null || time === undefined) {
    throw new Error("No time was rendered");
  }
  const look = getComputedStyle(time);
  expect(look.fontFamily).toBe(getComputedStyle(document.body).fontFamily);
  expect(look.fontVariantNumeric).toBe("tabular-nums");
  expect(
    Math.abs(time.getBoundingClientRect().width - reservedWidth),
  ).toBeLessThan(Number.parseFloat(look.fontSize));
});

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
}));
vi.mock("@/app/(workspace)/retirement/actions.ts", () => ({
  restoreDefinitionAction: vi.fn(),
  deleteRetiredDefinitionAction: vi.fn(),
}));

test("Retirement list and detail show the local retirement day", async () => {
  signInAs(SIGNED_IN_USER);
  const definition = { ...RETIRED_CONSTRUCT, retiredAt: INSTANT };
  vi.mocked(getRetiredDefinition).mockResolvedValue(definition);
  serverRenderThenHydrate(<RetirementList definitions={[definition]} />);
  await expect.element(page.getByText(zoneTimes().day)).toBeVisible();
  root?.unmount();
  container?.remove();
  const detail = await RetiredDefinitionPage({
    params: Promise.resolve({ promptId: definition.id }),
    searchParams: Promise.resolve({}),
  });
  serverRenderThenHydrate(detail);
  await expect.element(page.getByText(zoneTimes().day)).toBeVisible();
});
