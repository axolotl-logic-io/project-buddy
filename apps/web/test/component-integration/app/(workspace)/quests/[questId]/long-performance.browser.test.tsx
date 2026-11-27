// "use_case_breadcrumbs_in_long_performance" in use-cases/performances.md, in
// Chromium and WebKit: the quest page in the site's frame, with an active
// performance several screens long. Client navigation and the browser's
// back and forward buttons replacing the trail are Next.js's, and the
// system tests'.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/page.tsx";
import { readLists } from "@/lists/list-store.ts";
import {
  listPerformances,
  readPerformanceMessages,
} from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest } from "@/quests/store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import {
  MARKDOWN_REPLY,
  PERFORMANCE,
  sentMessage,
} from "../../../../performances/performance-test-kit.tsx";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../../../../viewports-test-kit.ts";
import { inSiteFrame } from "../../../site-frame-test-kit.tsx";
import { siteHeaderAt } from "../../../site-header-test-kit.tsx";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_QUEST } from "../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/quests/store.ts", () => ({ getQuest: vi.fn() }));
// The header's ring of the user's circle reads their experience, server code.
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../../../../experience/experience-store-test-kit.ts"),
);
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

// The screens the case is checked on, and the most the trail band may take
// of each, in CSS px.
const SCREENS = [
  { viewport: LAPTOP_VIEWPORT, bandBudget: 140 },
  { viewport: PHONE_VIEWPORT, bandBudget: 112 },
  { viewport: NARROWEST_VIEWPORT, bandBudget: 112 },
] as const;
// A quest's name that takes the band's heading to two lines on a phone.
const LONG_QUEST_NAME = "One layer up: interface, associativity explorer";
// The Python block that ends each reply, shown once the reply is laid out.
const REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
// Three replies fill a laptop's screen several times over.
const EXCHANGES = 3;
const ENTRIES = Array.from({ length: EXCHANGES }, () =>
  sentMessage("Show the saved example", MARKDOWN_REPLY),
);

// The quest page with its site header, as the root layout renders them.
async function questPage(): Promise<React.JSX.Element> {
  const params = Promise.resolve({ questId: FOX_QUEST.id });
  const content = await QuestPage({
    params,
    searchParams: Promise.resolve({}),
  });
  return await inSiteFrame(
    inWorkspace(<QuestLayout params={params}>{content}</QuestLayout>),
    await siteHeaderAt(["quests", FOX_QUEST.id]),
  );
}

// Scrolls the page to its end, again until it stays there, since a reply's
// code blocks may still grow once laid out.
async function scrollToBottom(): Promise<void> {
  await vi.waitFor((): void => {
    const { scrollHeight } = document.documentElement;
    window.scrollTo(0, scrollHeight);
    if (
      window.scrollY === 0 ||
      window.scrollY + window.innerHeight < scrollHeight - 1
    ) {
      throw new Error("The page is not scrolled to its end");
    }
  });
}

// Whether nothing is drawn over the centre of element, so a tap there
// reaches it.
function topmostAtCentre(element: Element): boolean {
  const box = element.getBoundingClientRect();
  const topmost = document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  );
  return topmost !== null && element.contains(topmost);
}

beforeEach(() => {
  applyTheme("parchment");
  // The root layout's page and body (src/app/layout.tsx); the theme kit
  // restores them after each test.
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
  signInAs(SIGNED_IN_USER);
  vi.mocked(readLists).mockResolvedValue([]);
  vi.mocked(listQuestPeople).mockResolvedValue(undefined);
  vi.mocked(listPerformances).mockResolvedValue([PERFORMANCE]);
  vi.mocked(readPerformanceMessages).mockResolvedValue(ENTRIES);
});

afterEach(async () => {
  window.scrollTo(0, 0);
  vi.mocked(listPerformances).mockResolvedValue([]);
  vi.mocked(readPerformanceMessages).mockResolvedValue([]);
  await setViewport(LAPTOP_VIEWPORT);
});

describe("use_case_breadcrumbs_in_long_performance", () => {
  for (const { viewport, bandBudget } of SCREENS) {
    for (const name of [FOX_QUEST.name, LONG_QUEST_NAME]) {
      test(`${viewport.width} px wide, for ${name}`, async () => {
        vi.mocked(getQuest).mockResolvedValue({ ...FOX_QUEST, name });
        await setViewport(viewport);
        await render(await questPage());
        const transcript = page
          .getByRole("region", { name: PERFORMANCE.rite.name })
          .getByRole("list")
          .first();
        await expect
          .poll(() => transcript.element().textContent)
          .toContain(REPLY_END);

        await scrollToBottom();
        const trails = page.getByRole("navigation", {
          name: SITE_COPY.breadcrumbs,
        });
        expect(trails.elements()).toHaveLength(1);
        await expect.element(trails).toBeInViewport({ ratio: 1 });
        const band = trails.element().closest("header");
        expect(band).not.toBeNull();
        // The quest's name is the page's one heading, in the same band.
        const heading = page.getByRole("heading", { level: 1 });
        expect(heading.elements()).toHaveLength(1);
        await expect.element(heading).toHaveTextContent(name);
        await expect.element(heading).toBeInViewport({ ratio: 1 });
        expect(heading.element().closest("header")).toBe(band);
        const bandBox = band?.getBoundingClientRect();
        expect(
          (bandBox?.bottom ?? Number.POSITIVE_INFINITY) -
            Math.max(0, bandBox?.top ?? 0),
          "the trail band stays within its budget",
        ).toBeLessThanOrEqual(bandBudget);

        // The way back to the quests and the composer: each wholly on
        // screen, and in reach.
        const backLink = trails.getByRole("link", {
          name: QUESTS_COPY.heading,
          exact: true,
        });
        const targets = [
          backLink,
          page.getByRole("textbox", { name: PERFORMANCE_COPY.message }),
        ];
        await Promise.all(
          targets.map((target) =>
            expect.element(target).toBeInViewport({ ratio: 1 }),
          ),
        );
        expect(
          targets.map((target) => topmostAtCentre(target.element())),
        ).toEqual([true, true]);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          viewport.width,
        );

        // Jumping to a message shows it below the trail band.
        const first = transcript.element().firstElementChild;
        if (first === null) {
          throw new Error("The transcript is empty");
        }
        first.scrollIntoView({ block: "start" });
        expect(first.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          band?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
        );

        await expect.element(backLink).toHaveAttribute("href", "/quests");
      });
    }
  }
});
