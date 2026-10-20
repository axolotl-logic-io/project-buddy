// "use_case_use_on_phone": every page on a phone, by the rules of WCAG 2.2,
// in Chromium and WebKit with touch (the browser-touch project in
// vitest.config.mts). At 320 and 390 CSS px wide nothing scrolls sideways
// (1.4.10, Reflow), and every visible control is at least 24×24 CSS px
// (2.5.8, Target Size (Minimum)). Each page is checked in every theme,
// because each theme sets its own spacing and fonts, which move the sizes.
// The pages are rendered from fixed data, in their layouts and the site's
// frame (phone-pages-test-kit.tsx), with the site's stylesheet
// (vitest.browser-setup.ts) and the theme's fonts (theme-fonts-test-kit.ts).
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { readInvitation } from "@/accounts/invitations.ts";
import type { readLoginLinkUser } from "@/accounts/login-links.ts";
import type { getUserBuddy, listBuddies } from "@/buddies/buddy-store.ts";
import type { listCentralChats } from "@/chats/central-chat.ts";
import type { getChat, listChats, listMessages } from "@/chats/store.ts";
import { DEFAULT_FLAG_ATTRIBUTES } from "@/flags/flag-choice.ts";
import type { readMemoryHistory } from "@/memory/memory-store.ts";
import type { getProject, listProjects } from "@/projects/store.ts";
import type { readMonthlyUsage } from "@/quota/spend-store.ts";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { loadCodeHighlighting } from "../components/code-highlighting-test-kit.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
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
  type ViewportSize,
} from "../viewports-test-kit.ts";
import {
  inSiteFrame,
  PHONE_PAGES,
  type PhonePage,
} from "./phone-pages-test-kit.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

// The stores the pages read, whose answers each PHONE_PAGES entry sets.
vi.mock("@/projects/store.ts", () => ({
  getProject: vi.fn<typeof getProject>(),
  listProjects: vi.fn<typeof listProjects>(),
}));
vi.mock("@/chats/store.ts", () => ({
  getChat: vi.fn<typeof getChat>(),
  listChats: vi.fn<typeof listChats>(),
  listMessages: vi.fn<typeof listMessages>(),
}));
vi.mock("@/chats/central-chat.ts", () => ({
  listCentralChats: vi.fn<typeof listCentralChats>(),
}));
vi.mock("@/memory/memory-store.ts", () => ({
  readMemoryHistory: vi.fn<typeof readMemoryHistory>(),
}));
vi.mock("@/buddies/buddy-store.ts", () => ({
  getUserBuddy: vi.fn<typeof getUserBuddy>(),
  listBuddies: vi.fn<typeof listBuddies>(),
}));
vi.mock("@/quota/spend-store.ts", () => ({
  readMonthlyUsage: vi.fn<typeof readMonthlyUsage>(),
}));
vi.mock("@/accounts/login-links.ts", () => ({
  readLoginLinkUser: vi.fn<typeof readLoginLinkUser>(),
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

vi.mock("@/app/(workspace)/chat/actions.ts", () => ({
  startStandaloneChatAction: vi.fn(),
}));

// The pages' forms post to Server Actions, which these tests never run.
vi.mock("@/app/login/actions.ts", () => ({ requestLoginLinkAction: vi.fn() }));
vi.mock("@/app/signup/actions.ts", () => ({ signUpAction: vi.fn() }));
vi.mock("@/app/login/link/actions.ts", () => ({
  continueSignInAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  createProjectAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/projects/[projectId]/memory/actions.ts", () => ({
  saveMemoryAction: vi.fn(),
  restoreMemoryAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  renameChatAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  cloneBuddyAction: vi.fn(),
  editBuiltInBuddyAction: vi.fn(),
  resetBuddyPartAction: vi.fn(),
  saveBuddyAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/account/actions.ts", () => ({
  setNameAction: vi.fn(),
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));
vi.mock("@/flags/save-hidden-flags-action.ts", () => ({
  saveHiddenFlagsAction: vi.fn(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

// A touch screen's pointer, which the browser-touch project's pages have.
const COARSE_POINTER = "(pointer: coarse)";

// What a page measures on a phone.
interface PhoneMeasures {
  readonly scrollWidth: number;
  readonly targets: readonly MeasuredTarget[];
}

// Applies theme in Light, as the pre-paint script does for a saved choice.
function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, theme);
  root.setAttribute(MODE_ATTRIBUTE, "light");
}

// Sets the screen's size and waits until the page is laid out at it.
async function setViewport({ width, height }: ViewportSize): Promise<void> {
  await page.viewport(width, height);
  await vi.waitFor(() => {
    if (window.innerWidth !== width) {
      throw new Error(`The page is ${window.innerWidth}px wide`);
    }
  });
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
  await loadFonts();
  return { scrollWidth: pageScrollWidth(), targets: await measureTargets() };
}

beforeAll(async () => {
  installThemeFonts();
  await loadCodeHighlighting("python");
});

beforeEach(() => {
  for (const [name, value] of Object.entries(DEFAULT_FLAG_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
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
            const { scrollWidth, targets } = await measureOnPhone(
              phonePage,
              viewport,
              theme,
            );

            // Compared with the width set, as a phone zooms out to fit
            // content wider than its screen.
            expect(scrollWidth, "no sideways scroll").toBeLessThanOrEqual(
              viewport.width,
            );
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
