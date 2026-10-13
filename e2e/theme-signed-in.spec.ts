// use_case_choose_theme, signed in: each theme on the pages it styles
// beyond its colours. A long project name keeps the "Project memory" link
// beside it, a chosen card's focus ring stands apart from its chosen ring,
// and the memory's checkboxes take the theme's colours. theme.spec.ts covers
// choosing the theme and its first paint.
import { expect, type Locator, type Page } from "@playwright/test";
import { THEMES, type ThemeId } from "@/themes/themes.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { lastMessage, sendMessage } from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { currentMemory, memoryField, openMemory } from "./memory-page.ts";
import { fillWhenReady } from "./page-helpers.ts";
import { choose, loadFonts, openPicker } from "./theme-page.ts";

// The longest project name, in characters, that each theme keeps on one row
// with the "Project memory" link at 1280 px.
const LONG_NAME_LENGTHS: Readonly<Record<ThemeId, number>> = {
  // Gravy Falls holds 36 characters beside the link; longer names wrap it
  // below, which Autumn accepted.
  "gravy-falls": 36,
  "ghost-hasslers": 40,
  "ay-liens": 40,
};

// The words a long project name is cut from.
const LONG_NAME_SOURCE = "Hangar door panel with hazard stripe rim and rivets";

// A milestone list in the memory: one milestone done, one to do.
const MILESTONES =
  "## Milestones\n\n- [x] Block out the panel\n- [ ] Bevel the rim";

// The top and bottom of an element on the page.
interface VerticalSpan {
  readonly top: number;
  readonly bottom: number;
}

function verticalSpan(element: Locator): Promise<VerticalSpan> {
  return element.evaluate((node) => {
    const { top, bottom } = node.getBoundingClientRect();
    return { top, bottom };
  });
}

// Whether two spans share a row: each starts above the other's end.
function shareRow(one: VerticalSpan, other: VerticalSpan): boolean {
  return one.top < other.bottom && other.top < one.bottom;
}

// Opens the page of a project whose name is as long as the theme keeps
// beside the "Project memory" link, and returns where the page's heading
// and the link sit.
async function openLongNamedProject(
  page: Page,
  testData: TestData,
  themeId: ThemeId,
): Promise<{ name: string; heading: VerticalSpan; link: VerticalSpan }> {
  const { [themeId]: length } = LONG_NAME_LENGTHS;
  const name = LONG_NAME_SOURCE.slice(0, length);
  const project = await testData.project(name);
  await page.goto(`/projects/${project.id}`);
  await loadFonts(page);
  const [heading, link] = await Promise.all([
    verticalSpan(page.getByRole("heading", { level: 1, name })),
    verticalSpan(page.getByRole("link", { name: MEMORY_COPY.link })),
  ]);
  return { name, heading, link };
}

// The focus ring of a focused element: its outline's style, how far it
// stands outside the ring a chosen card draws (as wide as the theme's
// lines), and the gap the token contract asks for between an element and
// its focus outline.
interface FocusRing {
  readonly outline: string;
  readonly gap: number;
  readonly contractGap: number;
}

function focusRing(element: Locator): Promise<FocusRing> {
  return element.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      outline: style.outlineStyle,
      gap:
        Number.parseFloat(style.outlineOffset) -
        Number.parseFloat(style.getPropertyValue("--line-width")),
      contractGap: Number.parseFloat(style.getPropertyValue("--focus-offset")),
    };
  });
}

// Opens the new-chat form and tabs from its project field to the persona
// cards, where the keyboard lands on the chosen one; returns that card.
async function tabToChosenPersona(
  page: Page,
  testData: TestData,
): Promise<Locator> {
  const project = await testData.project();
  await page.goto(`/chats/new?projectId=${project.id}`);
  await page
    .getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel })
    .focus();
  await page.keyboard.press("Tab");
  return page
    .getByRole("radiogroup", { name: NEW_CHAT_COPY.personaLabel })
    .getByRole("radio", { checked: true });
}

// A checkbox's look, beside the colours of the tokens it should show.
interface CheckboxLook {
  readonly appearance: string;
  readonly background: string;
  readonly border: string;
  readonly primary: string;
  readonly line: string;
  readonly field: string;
}

function checkboxLook(box: Locator): Promise<CheckboxLook> {
  return box.evaluate((node) => {
    const probe = document.createElement("span");
    node.after(probe);
    function token(name: string): string {
      probe.style.color = `var(--${name})`;
      return getComputedStyle(probe).color;
    }
    const style = getComputedStyle(node);
    const look = {
      appearance: style.appearance,
      background: style.backgroundColor,
      border: style.borderTopColor,
      primary: token("primary"),
      line: token("line"),
      field: token("field"),
    };
    probe.remove();
    return look;
  });
}

// Saves a milestone list as a new project's memory, and returns the
// checkboxes the current memory shows.
async function saveMilestones(
  page: Page,
  testData: TestData,
): Promise<Locator> {
  const project = await testData.project();
  await openMemory(page, project);
  await fillWhenReady(memoryField(page), MILESTONES);
  await page.getByRole("button", { name: MEMORY_COPY.save }).click();
  await expect(page.getByRole("status")).toHaveText(MEMORY_COPY.saved);
  return currentMemory(page).getByRole("checkbox");
}

// A heading's font size, in pixels.
function fontSize(heading: Locator): Promise<number> {
  return heading.evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).fontSize),
  );
}

// Opens a new chat, asks the mock tutor for its Markdown reply, and returns
// the sizes of the page's heading and of the reply's level-2 heading.
async function messageHeadingSizes(
  page: Page,
  testData: TestData,
): Promise<{ page: number; message: number }> {
  const chat = await testData.chat(await testData.project());
  await page.goto(`/chats/${chat.id}`);
  await sendMessage(page, "/mock-markdown");
  const messageHeading = lastMessage(page).getByRole("heading", { level: 2 });
  await expect(messageHeading).toBeVisible();
  await loadFonts(page);
  return {
    page: await fontSize(page.getByRole("heading", { level: 1 })),
    message: await fontSize(messageHeading),
  };
}

// One test per theme, under the use case's slug.
test.describe("use_case_choose_theme", () => {
  for (const { id, name } of THEMES) {
    test(`the ${name} theme, signed in`, async ({
      account,
      page,
      testData,
    }) => {
      await logIn(page, account);
      await openPicker(page);
      await choose(page, THEME_COPY.themeLabel, name);
      await page.keyboard.press("Escape");

      await test.step('a long project name keeps "Project memory" beside it at 1280 px', async () => {
        const project = await openLongNamedProject(page, testData, id);
        expect(project.name).toHaveLength(LONG_NAME_LENGTHS[id]);
        expect(shareRow(project.heading, project.link)).toBe(true);
      });

      await test.step("a chosen persona card shows its focus ring apart from its chosen ring", async () => {
        const chosen = await tabToChosenPersona(page, testData);
        await expect(chosen).toBeFocused();
        const ring = await focusRing(chosen);
        expect(ring.outline).not.toBe("none");
        expect(ring.gap).toBeGreaterThanOrEqual(ring.contractGap);
      });

      await test.step("the memory's milestones show read-only checkboxes in the theme's colours", async () => {
        const boxes = await saveMilestones(page, testData);
        await expect(boxes).toHaveCount(2);
        await expect(boxes.first()).toBeChecked();
        await expect(boxes.last()).not.toBeChecked();
        await expect(boxes.first()).toBeDisabled();
        await expect(boxes.last()).toBeDisabled();
        const done = await checkboxLook(boxes.first());
        expect(done.appearance).toBe("none");
        expect([done.background, done.border]).toEqual([
          done.primary,
          done.primary,
        ]);
        const toDo = await checkboxLook(boxes.last());
        expect([toDo.background, toDo.border]).toEqual([toDo.field, toDo.line]);
      });

      await test.step("a heading in a reply stays smaller than the page's heading", async () => {
        const sizes = await messageHeadingSizes(page, testData);
        expect(sizes.message).toBeLessThan(sizes.page);
      });
    });
  }
});
