// Every page on a phone, by the rules of WCAG 2.2: at 320 and 390 CSS px
// wide, with touch, nothing scrolls sideways (1.4.10, Reflow), and every
// visible control is at least 24×24 CSS px (2.5.8, Target Size (Minimum)).
// Each page is checked in every theme, because each theme sets its own
// spacing and fonts, which move the sizes.
import { expect, type Page } from "@playwright/test";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import { editMemory } from "@/memory/memory-store.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { lastMessage, openChat, sendMessage } from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// The narrowest screen WCAG's Reflow asks a page to fit, and a common
// phone's width.
const NARROWEST_PHONE_WIDTH = 320;
const COMMON_PHONE_WIDTH = 390;
const PHONE_HEIGHT = 800;
const MINIMUM_TARGET_PX = 24;

// A word in no manual section but the one this spec adds, so a search finds
// it and the reply shows a citation.
const TOPIC = "glimmerwhisk";
const GLIMMERWHISK_PATH =
  "manual/modeling/meshes/editing/edge/glimmerwhisk.rst";
const GLIMMERWHISK_ANCHOR = "glimmerwhisk-edges";
const GLIMMERWHISK_SECTION: ManualSection = {
  title: "Glimmerwhisk Edges",
  text: "Press Ctrl-Shift-G to glimmerwhisk the selected edges.",
  filePath: GLIMMERWHISK_PATH,
  anchor: GLIMMERWHISK_ANCHOR,
  url: manualUrl(GLIMMERWHISK_PATH, GLIMMERWHISK_ANCHOR),
};

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

// A control smaller than the minimum, as the failure lists it.
interface SmallTarget {
  readonly control: string;
  readonly width: number;
  readonly height: number;
}

// One page as this spec checks it.
interface PhonePage {
  readonly name: string;
  // Makes the page's data, signs in if the page needs it, and returns the
  // page's address.
  readonly open: (page: Page, testData: TestData) => Promise<string>;
}

// Runs in the browser: every visible control smaller than minimum either
// way, except those WCAG 2.5.8 exempts or that are not targets.
// - The inline exception: a link whose parent is a paragraph with other
//   text in it is in a sentence, and the line of text sets its size.
// - Disabled controls, such as a task list's read-only checkboxes, are not
//   targets: touching them does nothing.
function smallTargetsIn(minimum: number): SmallTarget[] {
  function inSentence(control: Element): boolean {
    const parent = control.parentElement;
    return (
      control.tagName === "A" &&
      parent?.tagName === "P" &&
      parent.textContent.trim() !== control.textContent.trim()
    );
  }

  function isTarget(control: Element): boolean {
    return (
      control.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
      }) &&
      !control.matches(":disabled") &&
      !inSentence(control)
    );
  }

  // The control's name, roughly as a screen reader finds it.
  function label(control: Element): string {
    const name =
      control.getAttribute("aria-label") ??
      control.getAttribute("title") ??
      control.textContent.trim();
    return `${control.tagName.toLowerCase()} "${name}"`;
  }

  const controls = document.querySelectorAll(
    "a[href], button, input, select, textarea, summary",
  );
  return [...controls]
    .filter(isTarget)
    .map((control) => {
      const { width, height } = control.getBoundingClientRect();
      return { control: label(control), width, height };
    })
    .filter(({ width, height }) => width < minimum || height < minimum);
}

// Runs in the browser: how wide the page's content is.
function pageScrollWidth(): number {
  return document.documentElement.scrollWidth;
}

// Saves the theme as the site's theme picker does, in the cookie that
// src/themes/theme-choice.ts reads before the page's first paint.
async function chooseTheme(
  page: Page,
  baseUrl: string,
  theme: ThemeId,
): Promise<void> {
  await page
    .context()
    .addCookies([{ name: "theme", value: `${theme}.light`, url: baseUrl }]);
}

// Opens address and waits until the page has all of its content: nothing
// is loading, and its fonts, which set its sizes, are in.
async function showPage(page: Page, address: string): Promise<void> {
  await page.goto(address);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
  await page.evaluate(async (): Promise<void> => {
    await document.fonts.ready;
  });
}

const PHONE_PAGES: readonly PhonePage[] = [
  {
    name: "the passphrase page",
    open: (): Promise<string> => Promise.resolve("/login"),
  },
  {
    name: "the home page",
    open: async (page: Page): Promise<string> => {
      await logIn(page);
      return "/";
    },
  },
  {
    name: "the projects list",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await testData.project();
      await logIn(page);
      return "/projects";
    },
  },
  {
    name: "a project",
    open: async (page: Page, testData: TestData): Promise<string> => {
      const project = await testData.project();
      await testData.chat(project);
      await logIn(page);
      return `/projects/${project.id}`;
    },
  },
  {
    name: "a project's memory",
    open: async (page: Page, testData: TestData): Promise<string> => {
      const project = await testData.project();
      await editMemory({
        projectId: project.id,
        edit: { oldText: "", newText: MEMORY },
        author: "user",
      });
      await editMemory({
        projectId: project.id,
        edit: { oldText: "- [ ] Bevel", newText: "- [x] Bevel" },
        author: "tutor",
      });
      await logIn(page);
      return `/projects/${project.id}/memory`;
    },
  },
  {
    name: "the new-chat form",
    open: async (page: Page, testData: TestData): Promise<string> => {
      const project = await testData.project();
      await logIn(page);
      return `/chats/new?projectId=${project.id}`;
    },
  },
  {
    name: "a chat",
    open: async (page: Page, testData: TestData): Promise<string> => {
      await testData.manualSections([GLIMMERWHISK_SECTION]);
      const chat = await testData.chat(await testData.project());
      await openChat(page, chat);
      await sendMessage(page, `/mock-search ${TOPIC}`);
      await expect(lastMessage(page)).toContainText(
        `The manual covers "${TOPIC}":`,
      );
      await sendMessage(page, "/mock-markdown");
      await expect(lastMessage(page)).toContainText("Beveling an edge");
      return `/chats/${chat.id}`;
    },
  },
];

// One test per page, width and theme, each with its own data, on a phone's
// screen with touch.
test.describe("use_case_use_on_phone", () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const width of [NARROWEST_PHONE_WIDTH, COMMON_PHONE_WIDTH]) {
    test.describe(`at ${width} px`, () => {
      test.use({ viewport: { width, height: PHONE_HEIGHT } });

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
            await chooseTheme(page, baseURL, theme);
            await showPage(page, await phonePage.open(page, testData));

            // Compared with the width set rather than innerWidth, because a
            // phone zooms out to fit content wider than its screen, which
            // widens innerWidth too.
            expect(
              await page.evaluate(pageScrollWidth),
              "no sideways scroll",
            ).toBeLessThanOrEqual(width);
            expect(
              await page.evaluate(smallTargetsIn, MINIMUM_TARGET_PX),
              `every control at least ${MINIMUM_TARGET_PX}×${MINIMUM_TARGET_PX} px`,
            ).toEqual([]);
          });
        }
      }
    });
  }
});
