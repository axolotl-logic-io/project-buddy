import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/page.tsx";
import { Markdown } from "@/components/markdown.tsx";
import { getConstruct } from "@/constructs/index.ts";
import type { getQuest, listQuests } from "@/quests/store.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
import { siteHeaderAt } from "../app/site-header-test-kit.tsx";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { loadCodeHighlighting } from "../components/code-highlighting-test-kit.ts";
import { LAPTOP_VIEWPORT } from "../viewports-test-kit.ts";
import { fontSize } from "./signed-in-pages-test-kit.ts";
import { installThemeFonts, loadFonts } from "./theme-fonts-test-kit.ts";
import { applyTheme } from "./theme-test-kit.ts";

// The header reads the experience total for feedback after saves.
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../experience/experience-store-test-kit.ts"),
);

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
// The header slot reads the balance and resolves the trail's names.

const stores = vi.hoisted(() => ({
  quests: {
    getQuest: vi.fn<typeof getQuest>(),
    listQuests: vi.fn<typeof listQuests>(),
  },
}));
vi.mock("@/quests/store.ts", () => stores.quests);
// The performance refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));
// A timer link's trail in the header waits for the request, which a
// browser test has none of.
vi.mock("next/server", () => ({
  connection: (): Promise<void> => Promise.resolve(),
}));

// The pages' forms post to Server Actions, which these tests never run.

// A long quest name, which the trail band's heading wraps.
const LONG_NAME = "Hangar door panel with hazard stripe rim and rivets";
const QUEST_PATH = ["quests", FOX_QUEST.id] as const;

// Renders the page of a quest named name, in its layout.
async function renderQuest(name: string): Promise<void> {
  stores.quests.getQuest.mockResolvedValue({ ...FOX_QUEST, name });
  stores.quests.listQuests.mockResolvedValue([{ ...FOX_QUEST, name }]);
  const params = Promise.resolve({ questId: FOX_QUEST.id });
  const content = await QuestPage({
    params,
    searchParams: Promise.resolve({}),
  });
  await render(
    <>
      {await siteHeaderAt(QUEST_PATH)}
      {inWorkspace(<QuestLayout params={params}>{content}</QuestLayout>)}
    </>,
  );
}

async function renderMarkdownReply(): Promise<void> {
  stores.quests.getQuest.mockResolvedValue(FOX_QUEST);
  await render(
    <>
      {await siteHeaderAt(QUEST_PATH)}
      <section aria-label={getConstruct("vellum").name}>
        <Markdown
          text="## Print a sample"
          running={false}
          topHeadingLevel={3}
        />
      </section>
    </>,
  );
}

// Opens the page of a quest with a long name and returns whether its
// section controls share the breadcrumb row.
async function sectionsAlongsideLongName(): Promise<boolean> {
  await renderQuest(LONG_NAME);
  await loadFonts();
  // The quest opens on its latest message; the frame is at the page's top.
  window.scrollTo(0, 0);
  const heading = page.getByRole("heading", { level: 1, name: LONG_NAME });
  const link = page
    .getByRole("complementary", { name: QUEST_OVERVIEW_COPY.panel.label })
    .getByRole("heading", { level: 2 });
  const header = page.getByRole("banner");
  const sectionBounds = link.element().getBoundingClientRect();
  return (
    sectionBounds.top >= header.element().getBoundingClientRect().top &&
    sectionBounds.top <= heading.element().getBoundingClientRect().bottom
  );
}

// The font sizes of the quest page's heading and of its reply's level-2
// heading.
async function headingSizes(): Promise<{ page: number; reply: number }> {
  await renderMarkdownReply();
  const replyHeading = page.getByRole("heading", { name: "Print a sample" });
  await vi.waitFor(() => replyHeading.element());
  await loadFonts();
  return {
    page: fontSize(page.getByRole("heading", { level: 1 }).element()),
    reply: fontSize(replyHeading.element()),
  };
}

beforeAll(async () => {
  installThemeFonts();
  await loadCodeHighlighting("python");
});

beforeEach(async () => {
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
  signInAs(SIGNED_IN_USER);
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
  await vi.waitFor(() => {
    if (window.innerWidth !== LAPTOP_VIEWPORT.width) {
      throw new Error(`The page is ${window.innerWidth}px wide`);
    }
  });
});

// One set of tests per theme, under the use case's slug.
describe("use_case_choose_theme", () => {
  for (const id of THEME_IDS) {
    describe(`the ${id} theme, signed in`, () => {
      beforeEach(() => {
        applyTheme(id);
      });

      test("a long quest title keeps the quest panel on the breadcrumb row at 1280 px", async () => {
        expect(await sectionsAlongsideLongName()).toBe(true);
      });

      test("a heading in a reply stays smaller than the page's heading", async () => {
        const sizes = await headingSizes();

        expect(sizes.reply).toBeLessThan(sizes.page);
      });
    });
  }
});
