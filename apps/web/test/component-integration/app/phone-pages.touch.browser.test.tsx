// "use_case_use_on_phone": every page on a phone, by the rules of WCAG 2.2,
// in Chromium and WebKit with touch (the browser-touch quest in
// vitest.config.mts). At 320 and 390 CSS px wide nothing scrolls sideways
// (1.4.10, Reflow), and every visible control is at least 24×24 CSS px
// (2.5.8, Target Size (Minimum)). A row of tabs stays one row, and scrolls
// sideways inside itself if it must (#845). Each page is checked in every theme,
// because each theme sets its own spacing and fonts, which move the sizes.
// The pages are rendered from fixed data, in their layouts and the site's
// frame (phone-pages-test-kit.tsx), with the site's stylesheet
// (vitest.browser-setup.ts) and the theme's fonts (theme-fonts-test-kit.ts).

import type { JSX } from "react";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import type { getChat, listMessages } from "@/chats/store.ts";
import type {
  getOwnConstruct,
  listConstructs,
} from "@/constructs/construct-store.ts";
import type { privateChat } from "@/conversations/private-chat.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import type { listMilestones } from "@/milestones/milestone-store.ts";
import type { readCurrentQuest } from "@/quests/current-quest-store.ts";
import type { getQuest, listQuests } from "@/quests/store.ts";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { QUEST_COPY } from "@/ui/copy/quests.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { loadCodeHighlighting } from "../components/code-highlighting-test-kit.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  type MeasuredTarget,
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
  type ViewportSize,
} from "../viewports-test-kit.ts";
import { GOLD_BALANCE } from "./phone-pages-fixtures.ts";
import { PHONE_PAGES, type PhonePage } from "./phone-pages-test-kit.tsx";
import { inSiteFrame } from "./site-frame-test-kit.tsx";
import { siteHeaderAt } from "./site-header-test-kit.tsx";

vi.mock("@/ideas/idea-store.ts", () => ({
  listIdeas: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/ideas/idea-actions.ts", () => ({ changeIdeaAction: vi.fn() }));
vi.mock(
  "@/plan/plan-actions.ts",
  () => import("../plan/plan-actions-test-kit.ts"),
);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

vi.mock("@/images/generation-store.ts", () => ({
  listGeneratedImages: vi.fn(),
}));

// The stores the pages read, whose answers each PHONE_PAGES entry sets.
vi.mock("@/quests/store.ts", () => ({
  getQuest: vi.fn<typeof getQuest>(),
  listQuests: vi.fn<typeof listQuests>(),
}));
vi.mock("@/quests/current-quest-store.ts", () => ({
  readCurrentQuest: vi.fn<typeof readCurrentQuest>(),
}));
vi.mock("@/chats/store.ts", () => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
  readStoppedReply: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/conversations/start-quest.ts", () => ({
  readQuestConversation: vi.fn(),
  startQuestConversation: vi.fn(),
}));
vi.mock("@/conversations/private-chat.ts", () => ({
  privateChat: vi.fn<typeof privateChat>(),
}));
vi.mock("@/milestones/milestone-store.ts", () => ({
  listMilestones: vi.fn<typeof listMilestones>(),
}));
vi.mock("@/plan/plan-store.ts", () => import("../plan/plan-store-test-kit.ts"));
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn<typeof getOwnConstruct>(),
  listConstructs: vi.fn<typeof listConstructs>(),
}));
vi.mock("@/gold/gold-store.ts", () => ({
  readGoldBalance: vi.fn<typeof readGoldBalance>(),
}));
vi.mock("@/accounts/sign-in-links.ts", () => ({
  readSignInLinkUser: vi.fn<typeof readSignInLinkUser>(),
}));

vi.mock("@/accounts/sign-up-links.ts", () => ({ readSignUpEmail: vi.fn() }));

// A sign-in link's page waits for the request; ChatView refreshes the page
// through the App Router.
vi.mock("next/server", () => ({
  connection: (): Promise<void> => Promise.resolve(),
}));
vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));

// The pages' forms post to Server Actions, which these tests never run.
vi.mock("@/app/login/actions.ts", () => ({ requestSignInLinkAction: vi.fn() }));
vi.mock("@/app/login/link/actions.ts", () => ({
  continueSignInAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/quests/actions.ts", () => ({
  startQuestAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/quests/[questId]/(overview)/actions.ts", () => ({
  editMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
  startConversationAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  retireConstructAction: vi.fn(),
  cloneConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  newConstructAction: vi.fn(),
  resetConstructPromptAction: vi.fn(),
  saveConstructAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/settings/actions.ts", () => ({
  setNameAction: vi.fn(),
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

// A touch screen's pointer, which the browser-touch quest's pages have.
const COARSE_POINTER = "(pointer: coarse)";

// What a page measures on a phone.
interface PhoneMeasures {
  readonly scrollWidth: number;
  // The open dialogs whose content is wider than they are, which scroll
  // sideways inside the page.
  readonly wideDialogs: readonly string[];
  readonly targets: readonly MeasuredTarget[];
  // The rows of tabs whose tabs don't all sit on one line.
  readonly wrappedTabRows: readonly string[];
  // The page's headings of the first level: its one heading.
  readonly pageHeadings: number;
}

// The rows of tabs a page may have, besides its tab lists: a quest's
// sections, an adventure's, the Workshop's kinds and the Retirement filter. The Quests list's status tabs
// are a grid of two columns on a phone by design, so they aren't one.
const TAB_ROW_NAVIGATIONS: readonly string[] = [
  QUEST_COPY.navigation,
  WORKSPACES_COPY.conversation,
  WORKSHOP_PAGE_COPY.kindsLabel,
];

function tabRows(): Element[] {
  return [
    ...page
      .getByRole("tablist")
      .elements()
      .filter(
        (row) => row.getAttribute("aria-label") !== QUEST_STATUS_COPY.tabs,
      ),
    ...TAB_ROW_NAVIGATIONS.flatMap((name) =>
      page.getByRole("navigation", { name, exact: true }).elements(),
    ),
    ...page
      .getByRole("group", { name: RETIREMENT_COPY.kindFilter, exact: true })
      .elements(),
  ];
}

// The names of the rows of tabs whose tabs don't all share one line.
function measureWrappedTabRows(): string[] {
  return tabRows()
    .filter((row) => {
      const tops = new Set(
        Array.from(row.querySelectorAll("a, button"), (tab) =>
          Math.round(tab.getBoundingClientRect().top),
        ),
      );
      return tops.size > 1;
    })
    .map((row) => row.getAttribute("aria-label") ?? row.tagName);
}

// Waits until the page shows its heading and each button laid out only
// once on screen.
async function waitForContent(phonePage: PhonePage): Promise<void> {
  await vi.waitFor(() => page.getByRole("heading", { level: 1 }).element());
  await vi.waitFor(() => {
    for (const name of phonePage.laidOutWhenShown ?? []) {
      page.getByRole("button", { name, exact: true }).first().element();
    }
  });
}

// The names of the open dialogs whose content is wider than they are.
function measureWideDialogs(): string[] {
  return page
    .getByRole("dialog")
    .elements()
    .filter((dialog) => dialog.scrollWidth > dialog.clientWidth)
    .map((dialog) => dialog.getAttribute("aria-labelledby") ?? "dialog");
}

// Renders phonePage in theme at viewport, once its content and fonts have
// loaded, and measures it.
async function measureOnPhone(
  phonePage: PhonePage,
  viewport: ViewportSize,
  theme: ThemeId,
): Promise<PhoneMeasures> {
  applyTheme(theme);
  await setViewport(viewport);
  const content = await phonePage.render();
  let header: JSX.Element | undefined;
  if (phonePage.path !== undefined) {
    header = await siteHeaderAt(phonePage.path);
  }
  await render(await inSiteFrame(content, header));
  await waitForContent(phonePage);
  // Counted before a dialog opens and hides the page behind it.
  const pageHeadings = page
    .getByRole("heading", { level: 1 })
    .elements().length;
  await phonePage.open?.();
  await loadFonts();
  return {
    scrollWidth: pageScrollWidth(),
    wideDialogs: measureWideDialogs(),
    targets: await measureTargets(),
    wrappedTabRows: measureWrappedTabRows(),
    pageHeadings,
  };
}

beforeAll(async () => {
  installThemeFonts();
  await loadCodeHighlighting("python");
});

beforeEach(() => {
  vi.mocked(listRetiredDefinitions).mockResolvedValue([]);
  vi.mocked(readGoldBalance).mockResolvedValue(GOLD_BALANCE);
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
});

// One test per page, width and theme.
describe("use_case_use_on_phone", () => {
  test("the pages are on a touch screen", () => {
    expect(matchMedia(COARSE_POINTER).matches).toBe(true);
  });

  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    describe(`at ${viewport.width} px`, () => {
      for (const theme of THEME_IDS) {
        for (const phonePage of PHONE_PAGES) {
          test(`${phonePage.name} in ${theme}`, async () => {
            const {
              scrollWidth,
              wideDialogs,
              targets,
              wrappedTabRows,
              pageHeadings,
            } = await measureOnPhone(phonePage, viewport, theme);

            // Compared with the width set, as a phone zooms out to fit
            // content wider than its screen.
            expect(scrollWidth, "no sideways scroll").toBeLessThanOrEqual(
              viewport.width,
            );
            expect(wideDialogs, "no sideways scroll in a dialog").toEqual([]);
            expect(wrappedTabRows, "each row of tabs is one row").toEqual([]);
            expect(pageHeadings, "one page heading").toBe(1);
            expect(
              smallTargets(targets),
              `every control at least ${MINIMUM_TARGET_PX}×${MINIMUM_TARGET_PX} px`,
            ).toEqual([]);
            expect(
              targets.map(({ control }) => control),
              "the controls laid out only on screen were measured",
            ).toEqual(
              expect.arrayContaining(
                (phonePage.laidOutWhenShown ?? []).map(
                  (name) => `button "${name}"`,
                ),
              ),
            );
          });
        }
      }
    });
  }
});

vi.mock("@/constructs/interview-construct.ts", () => ({
  interviewConstruct: vi.fn().mockResolvedValue({ id: "vellum" }),
}));
vi.mock("@/app/(workspace)/settings/interview-construct-action.ts", () => ({
  setInterviewConstructAction: vi.fn().mockResolvedValue({ kind: "saved" }),
}));

vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
  listRetiredDefinitions: vi.fn(),
}));

vi.mock("@/app/(workspace)/retirement/actions.ts", () => ({
  restoreDefinitionAction: vi.fn(),
  deleteRetiredDefinitionAction: vi.fn(),
}));
