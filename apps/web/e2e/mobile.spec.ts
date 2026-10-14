// Every page on a phone, by the rules of WCAG 2.2: at 320 and 390 CSS px
// wide, with touch, nothing scrolls sideways (1.4.10, Reflow), and every
// visible control is at least 24×24 CSS px (2.5.8, Target Size (Minimum)).
// Each page is checked in every theme, because each theme sets its own
// spacing and fonts, which move the sizes.
import { expect, type Page } from "@playwright/test";
import { editMemory } from "@/memory/memory-store.ts";
import { clonePersona } from "@/personas/persona-store.ts";
import { THEME_ATTRIBUTE, themeChoiceCookie } from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import {
  lastMessage,
  manualSection,
  openChat,
  sendMessage,
} from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { newSignInLink } from "./sign-in-pages.ts";
import {
  MINIMUM_TARGET_PX,
  measureTargets,
  smallTargets,
} from "./touch-targets.ts";
import { NARROWEST_VIEWPORT, PHONE_VIEWPORT } from "./viewports.ts";
import { waitUntilSettled } from "./visual/visual-page.ts";

// A word in no manual section but the one this spec adds, so a search finds
// it and the reply shows a citation.
const TOPIC = "glimmerwhisk";
const GLIMMERWHISK_SECTION = manualSection(
  "modeling/meshes/editing/edge/glimmerwhisk",
  "glimmerwhisk-edges",
  "Glimmerwhisk Edges",
  "Press Ctrl-Shift-G to glimmerwhisk the selected edges.",
);

// A memory with a task list and a long item. The tutor then ticks a
// milestone, so the page shows two versions: each with "Show its text", and
// the older one to restore.
const MEMORY = [
  "## Goals",
  "",
  "- Learn to bevel and to use the Mirror modifier on a low-poly fox den.",
  "",
  "## Milestones",
  "",
  "- [x] Block out the den's shape",
  "- [ ] Bevel the roof's edges",
].join("\n");

// One page as this spec checks it.
interface PhonePage {
  readonly name: string;
  // Makes the page's data, signs in if the page needs it, and returns the
  // page's address.
  readonly open: (page: Page, testData: TestData) => Promise<string>;
  // Controls laid out only on screen, which the test checks it measured.
  readonly laidOutWhenShown?: readonly string[];
}

// Runs in the browser: how wide the page's content is.
function pageScrollWidth(): number {
  return document.documentElement.scrollWidth;
}

// Saves theme, in Light, as the site's theme picker does, in the cookie that
// src/themes/theme-choice.ts reads before the page's first paint.
async function saveTheme(
  page: Page,
  baseUrl: string,
  theme: ThemeId,
): Promise<void> {
  await page
    .context()
    .addCookies([
      { ...themeChoiceCookie({ theme, mode: "light" }), url: baseUrl },
    ]);
}

// Opens address in theme and waits until the page has all of its content,
// so a check never measures the default theme or a page still loading.
async function showPage(
  page: Page,
  address: string,
  theme: ThemeId,
): Promise<void> {
  await page.goto(address);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(THEME_ATTRIBUTE, theme);
  await waitUntilSettled(page);
}

const PHONE_PAGES: readonly PhonePage[] = [
  {
    name: "the sign-in page",
    open: (): Promise<string> => Promise.resolve("/login"),
  },
  {
    name: "the sign-up page",
    open: (): Promise<string> => Promise.resolve("/signup"),
  },
  {
    name: "a sign-in link's page",
    open: (page: Page, testData: TestData): Promise<string> =>
      newSignInLink(page, testData.account.email),
  },
  {
    name: "an expired sign-in link's page",
    open: (): Promise<string> => Promise.resolve("/login/link"),
  },
  {
    name: "the home page",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await logIn(page, testData.account);
      return "/";
    },
  },
  {
    name: "the projects list",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await testData.project();
      await logIn(page, testData.account);
      return "/projects";
    },
  },
  {
    name: "a project",
    open: async (page: Page, testData: TestData): Promise<string> => {
      const project = await testData.project();
      await testData.chat(project);
      await logIn(page, testData.account);
      return `/projects/${project.id}`;
    },
  },
  {
    name: "a project's memory",
    open: async (page: Page, testData: TestData): Promise<string> => {
      const project = await testData.project();
      await editMemory(testData.account.id, {
        projectId: project.id,
        edit: { oldText: "", newText: MEMORY },
        author: "user",
      });
      await editMemory(testData.account.id, {
        projectId: project.id,
        edit: { oldText: "- [ ] Bevel", newText: "- [x] Bevel" },
        author: "tutor",
      });
      await logIn(page, testData.account);
      return `/projects/${project.id}/memory`;
    },
  },
  {
    name: "the new-chat form",
    open: async (page: Page, testData: TestData): Promise<string> => {
      const project = await testData.project();
      await logIn(page, testData.account);
      return `/chats/new?projectId=${project.id}`;
    },
  },
  {
    name: "the Settings page",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await logIn(page, testData.account);
      return "/settings";
    },
  },
  {
    name: "the personas page",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await clonePersona(testData.account.id, "hippy");
      await logIn(page, testData.account);
      return "/personas";
    },
  },
  {
    name: "a built-in persona's page",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await logIn(page, testData.account);
      return "/personas/hippy";
    },
  },
  {
    name: "her own persona's page",
    open: async (page: Page, testData: TestData): Promise<string> => {
      const persona = await clonePersona(testData.account.id, "hippy");
      if (persona === undefined) {
        throw new Error("Hippy could not be cloned");
      }
      await logIn(page, testData.account);
      return `/personas/${persona.id}`;
    },
  },
  {
    name: "the account page",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await logIn(page, testData.account);
      return "/account";
    },
  },
  {
    name: "a chat",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await testData.manualSections([GLIMMERWHISK_SECTION]);
      const chat = await testData.chat(await testData.project());
      await openChat(page, testData.account, chat);
      await sendMessage(page, `/mock-search ${TOPIC}`);
      await expect(lastMessage(page)).toContainText(
        `The manual covers "${TOPIC}":`,
      );
      await sendMessage(page, "/mock-markdown");
      await expect(lastMessage(page)).toContainText("Beveling an edge");
      return `/chats/${chat.id}`;
    },
    laidOutWhenShown: ['button "Copy Code"', 'button "Download file"'],
  },
];

// One test per page, width and theme, each with its own data, on a phone's
// screen with touch.
test.describe("use_case_use_on_phone", () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    const { width } = viewport;
    test.describe(`at ${width} px`, () => {
      test.use({ viewport });

      for (const theme of THEME_IDS) {
        for (const phonePage of PHONE_PAGES) {
          test(`${phonePage.name} in ${theme}`, async ({
            page,
            testData,
            baseURL,
          }) => {
            if (baseURL === undefined) {
              throw new Error("The phone tests need the config's baseURL");
            }
            await saveTheme(page, baseURL, theme);
            await showPage(page, await phonePage.open(page, testData), theme);

            // Compared with the width set rather than innerWidth, because a
            // phone zooms out to fit content wider than its screen, which
            // widens innerWidth too.
            expect(
              await page.evaluate(pageScrollWidth),
              "no sideways scroll",
            ).toBeLessThanOrEqual(width);
            const targets = await measureTargets(page);
            expect(
              smallTargets(targets),
              `every control at least ${MINIMUM_TARGET_PX}×${MINIMUM_TARGET_PX} px`,
            ).toEqual([]);
            expect(
              targets.map(({ control }) => control),
              "the controls laid out only on screen were measured",
            ).toEqual(
              expect.arrayContaining([...(phonePage.laidOutWhenShown ?? [])]),
            );
          });
        }
      }
    });
  }
});
