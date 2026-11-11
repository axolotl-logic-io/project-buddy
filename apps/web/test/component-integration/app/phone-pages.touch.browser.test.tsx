// "use_case_use_on_phone": every page on a phone, by the rules of WCAG 2.2,
// in Chromium and WebKit with touch (the browser-touch project in
// vitest.config.mts). At 320 and 390 CSS px wide nothing scrolls sideways
// (1.4.10, Reflow), and every visible control is at least 24×24 CSS px
// (2.5.8, Target Size (Minimum)). A row of tabs stays one row, and scrolls
// sideways inside itself if it must (#845). Each page is checked in every theme,
// because each theme sets its own spacing and fonts, which move the sizes.
// The pages are rendered from fixed data, in their layouts and the site's
// frame (phone-pages-test-kit.tsx), with the site's stylesheet
// (vitest.browser-setup.ts) and the theme's fonts (theme-fonts-test-kit.ts).
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { readInvitation } from "@/accounts/invitations.ts";
import type { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import type {
  getOwnActivity,
  listOwnActivities,
} from "@/activities/activity-store.ts";
import type { getChat, listMessages } from "@/chats/store.ts";
import type {
  getOwnConstruct,
  listConstructs,
} from "@/constructs/construct-store.ts";
import type { privateChat } from "@/conversations/private-chat.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import type {
  getListing,
  listListings,
  listOwnListings,
  readSaleState,
} from "@/marketplace/listing-store.ts";
import type { readMemoryHistory } from "@/memory/memory-store.ts";
import type { listMilestones } from "@/milestones/milestone-store.ts";
import type { readRecentNotes } from "@/notes/note-store.ts";
import type { listProjectMembers } from "@/projects/members-store.ts";
import type { getProject, listProjects } from "@/projects/store.ts";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
import type { getOwnSpell, listOwnSpells } from "@/spells/spell-store.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
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
vi.mock("@/projects/store.ts", () => ({
  getProject: vi.fn<typeof getProject>(),
  listProjects: vi.fn<typeof listProjects>(),
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
vi.mock("@/memory/memory-store.ts", () => ({
  readMemoryHistory: vi.fn<typeof readMemoryHistory>(),
}));
vi.mock("@/milestones/milestone-store.ts", () => ({
  listMilestones: vi.fn<typeof listMilestones>(),
}));
vi.mock("@/plan/plan-store.ts", () => import("../plan/plan-store-test-kit.ts"));
vi.mock(
  "@/projects/project-invitations.ts",
  () => import("../projects/project-invitations-test-kit.ts"),
);
vi.mock("@/app/(workspace)/projects/invitations/actions.ts", () => ({
  joinProjectAction: vi.fn(),
  declineProjectInvitationAction: vi.fn(),
}));
vi.mock("@/projects/members-store.ts", () => ({
  listProjectMembers: vi.fn<typeof listProjectMembers>(),
}));
vi.mock("@/notes/note-store.ts", () => ({
  readRecentNotes: vi.fn<typeof readRecentNotes>(),
}));
vi.mock("@/activities/activity-store.ts", () => ({
  getOwnActivity: vi.fn<typeof getOwnActivity>(),
  listOwnActivities: vi.fn<typeof listOwnActivities>(),
}));
vi.mock("@/spells/spell-store.ts", () => ({
  getOwnSpell: vi.fn<typeof getOwnSpell>(),
  listOwnSpells: vi.fn<typeof listOwnSpells>(),
}));
vi.mock("@/marketplace/listing-store.ts", () => ({
  listedPromptIds: vi.fn().mockResolvedValue(new Set()),
  getListing: vi.fn<typeof getListing>(),
  listListings: vi.fn<typeof listListings>(),
  listOwnListings: vi.fn<typeof listOwnListings>(),
  readSaleState: vi.fn<typeof readSaleState>(),
}));
vi.mock("@/app/(workspace)/marketplace/actions.ts", () => ({
  buyListingAction: vi.fn(),
  sellListingAction: vi.fn(),
  unlistListingAction: vi.fn(),
  updateListingAction: vi.fn(),
}));
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

vi.mock("@/accounts/invitations.ts", () => ({
  readInvitation: vi.fn<typeof readInvitation>(),
}));
vi.mock("@/app/(workspace)/invitations/actions.ts", () => ({
  sendInvitationAction: vi.fn(),
}));
vi.mock("@/app/setup/actions.ts", () => ({ confirmSetupAction: vi.fn() }));

// A sign-in link's page waits for the request; ChatView refreshes the page
// through the App Router.
vi.mock("next/server", () => ({
  connection: (): Promise<void> => Promise.resolve(),
}));
vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));

// The pages' forms post to Server Actions, which these tests never run.
vi.mock("@/app/login/actions.ts", () => ({ requestSignInLinkAction: vi.fn() }));
vi.mock("@/app/signup/actions.ts", () => ({ signUpAction: vi.fn() }));
vi.mock("@/app/login/link/actions.ts", () => ({
  continueSignInAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  startQuestAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/projects/[projectId]/memory/actions.ts", () => ({
  saveMemoryAction: vi.fn(),
  restoreMemoryAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/capture/actions.ts", () => ({
  saveNoteAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/projects/[projectId]/(overview)/actions.ts", () => ({
  inviteToProjectAction: vi.fn(),
  revokeProjectInvitationAction: vi.fn(),
  deleteNoteAction: vi.fn(),
  editMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
  removeMemberAction: vi.fn(),
  leaveProjectAction: vi.fn(),
  startConversationAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  retireActivityAction: vi.fn(),
  cloneActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  newActivityAction: vi.fn(),
  resetActivityPromptAction: vi.fn(),
  saveActivityAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  cloneSpellAction: vi.fn(),
  retireSpellAction: vi.fn(),
  editBuiltInSpellAction: vi.fn(),
  newSpellAction: vi.fn(),
  resetSpellPromptAction: vi.fn(),
  saveSpellAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  retireConstructAction: vi.fn(),
  cloneConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  newConstructAction: vi.fn(),
  resetConstructPromptAction: vi.fn(),
  saveConstructAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/account/actions.ts", () => ({
  setNameAction: vi.fn(),
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../activities/activity-choices-test-kit.ts"),
);
// A touch screen's pointer, which the browser-touch project's pages have.
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
}

// The rows of tabs a page may have, besides its tab lists: a quest's
// sections, an adventure's, the Workshop's kinds, the Marketplace's, the
// Library's books and the Retirement filter. The Quests list's status tabs
// are a grid of two columns on a phone by design, so they aren't one.
const TAB_ROW_NAVIGATIONS: readonly string[] = [
  PROJECT_COPY.navigation,
  WORKSPACES_COPY.conversation,
  WORKSHOP_PAGE_COPY.kindsLabel,
  MARKETPLACE_COPY.filterLabel,
  WORKSPACES_COPY.books,
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
  await render(await inSiteFrame(await phonePage.render()));
  await waitForContent(phonePage);
  await phonePage.open?.();
  await loadFonts();
  return {
    scrollWidth: pageScrollWidth(),
    wideDialogs: measureWideDialogs(),
    targets: await measureTargets(),
    wrappedTabRows: measureWrappedTabRows(),
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
            const { scrollWidth, wideDialogs, targets, wrappedTabRows } =
              await measureOnPhone(phonePage, viewport, theme);

            // Compared with the width set, as a phone zooms out to fit
            // content wider than its screen.
            expect(scrollWidth, "no sideways scroll").toBeLessThanOrEqual(
              viewport.width,
            );
            expect(wideDialogs, "no sideways scroll in a dialog").toEqual([]);
            expect(wrappedTabRows, "each row of tabs is one row").toEqual([]);
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
vi.mock("@/app/(workspace)/settings/actions.ts", () => ({
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
