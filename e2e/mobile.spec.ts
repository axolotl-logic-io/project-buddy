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
import { PHONE_VIEWPORT } from "./viewports.ts";

// The narrowest screen WCAG's Reflow asks a page to fit; the tests also
// run at a common phone's width (PHONE_VIEWPORT).
const NARROWEST_PHONE_WIDTH = 320;
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

// A control and its size, as a failure lists it.
interface MeasuredTarget {
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
  // Controls laid out only on screen, which the test checks it measured.
  readonly laidOutWhenShown?: readonly string[];
}

// Runs in the browser: every visible control and its size, except those
// WCAG 2.5.8 exempts or that are not targets.
// - The inline exception: a link whose parent is a paragraph with other
//   text in it is in a sentence, and the line of text sets its size.
// - Disabled controls, such as a task list's read-only checkboxes, are not
//   targets: touching them does nothing.
// Each control is scrolled to the middle of the screen and measured a frame
// later. Streamdown draws a code block with `content-visibility: auto`, so
// until the block has been on screen its buttons (Copy Code, Download file)
// aren't laid out, and they measure 0×0 while still counting as visible.
async function measureTargets(): Promise<MeasuredTarget[]> {
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

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  }

  async function measureEach(
    unmeasured: readonly Element[],
    measured: readonly MeasuredTarget[],
  ): Promise<MeasuredTarget[]> {
    const [control, ...rest] = unmeasured;
    if (control === undefined) {
      return [...measured];
    }
    control.scrollIntoView({ block: "center" });
    await nextFrame();
    const { width, height } = control.getBoundingClientRect();
    return await measureEach(rest, [
      ...measured,
      { control: label(control), width, height },
    ]);
  }

  const controls = document.querySelectorAll(
    "a[href], button, input, select, textarea, summary",
  );
  return await measureEach([...controls].filter(isTarget), []);
}

// The controls smaller than the minimum either way.
function smallTargets(
  targets: readonly MeasuredTarget[],
): readonly MeasuredTarget[] {
  return targets.filter(
    ({ width, height }) =>
      width < MINIMUM_TARGET_PX || height < MINIMUM_TARGET_PX,
  );
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
    name: "the sign-in page",
    open: (): Promise<string> => Promise.resolve("/login"),
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

  for (const width of [NARROWEST_PHONE_WIDTH, PHONE_VIEWPORT.width]) {
    test.describe(`at ${width} px`, () => {
      test.use({ viewport: { width, height: PHONE_VIEWPORT.height } });

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
            const targets = await page.evaluate(measureTargets);
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
