// How a focused element draws its focus: no filter, which would make it a
// containing block for its positioned descendants, its own box-shadow kept,
// and the theme's glow as one more layer of that box-shadow.
import { expect, type Locator, type Page } from "@playwright/test";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import type { TestData } from "./fixtures.ts";

// How far, in pixels, a link card's overlay may be from the card's size.
const OVERLAY_TOLERANCE = 1;

// One layer of a computed box-shadow: its text, and its blur radius and
// spread in pixels.
interface ShadowLayer {
  readonly text: string;
  readonly blur: number;
  readonly spread: number;
}

// A focused element's filter and outline style, the layers of its
// box-shadow, the theme's focus glow as one such layer, and the theme's
// line width.
interface FocusLook {
  readonly filter: string;
  readonly outline: string;
  readonly shadows: readonly ShadowLayer[];
  readonly glow: ShadowLayer;
  readonly lineWidth: number;
}

// What a theme shows around a focused element beside its outline: whether
// it glows, and whether a chosen card keeps its chosen ring.
interface FocusShadows {
  readonly glow: boolean;
  readonly chosenRing: boolean;
}

function focusLook(element: Locator): Promise<FocusLook> {
  return element.evaluate((node) => {
    // Splits a computed box-shadow into its layers. Each layer reads
    // `<colour> <x> <y> <blur> <spread> [inset]`, so a layer's comma follows
    // a length or `inset`, and no comma in a colour does.
    function layers(shadow: string): ShadowLayer[] {
      if (shadow === "none") {
        return [];
      }
      const marked = shadow
        .replaceAll("px, ", "px\n")
        .replaceAll("inset, ", "inset\n");
      return marked.split("\n").map((text) => {
        const lengths = text
          .slice(text.lastIndexOf(")") + 1)
          .split(" ")
          .filter((word) => word.endsWith("px"))
          .map(Number.parseFloat);
        const [, , blur = 0, spread = 0] = lengths;
        return { text, blur, spread };
      });
    }
    const probe = document.createElement("span");
    probe.style.boxShadow = "var(--focus-glow)";
    document.body.append(probe);
    const [glow = { text: "none", blur: 0, spread: 0 }] = layers(
      getComputedStyle(probe).boxShadow,
    );
    probe.remove();
    const style = getComputedStyle(node);
    return {
      filter: style.filter,
      outline: style.outlineStyle,
      shadows: layers(style.boxShadow),
      glow,
      lineWidth: Number.parseFloat(style.getPropertyValue("--line-width")),
    };
  });
}

// Whether a focused element shows the theme's glow: a blurred layer of its
// box-shadow.
function showsGlow(look: FocusLook): boolean {
  return (
    look.glow.blur > 0 &&
    look.shadows.some((layer) => layer.text === look.glow.text)
  );
}

// Whether a box-shadow holds a chosen card's ring: a layer as wide as the
// theme's lines.
function showsChosenRing(look: FocusLook): boolean {
  return look.shadows.some(
    (layer) => layer.blur === 0 && layer.spread === look.lineWidth,
  );
}

function isFocusVisible(element: Locator): Promise<boolean> {
  return element.evaluate((node) => node.matches(":focus-visible"));
}

// Checks a focused chosen card draws no filter, keeps every layer of the
// box-shadow it has unfocused, and shows the theme's glow and chosen ring.
// Leaves the card unfocused.
async function expectChosenCardFocus(
  card: Locator,
  expected: FocusShadows,
): Promise<void> {
  const look = await focusLook(card);
  expect(look.filter).toBe("none");
  expect(showsGlow(look)).toBe(expected.glow);
  expect(showsChosenRing(look), JSON.stringify(look.shadows)).toBe(
    expected.chosenRing,
  );
  await card.blur();
  const unfocused = await focusLook(card);
  expect(look.shadows).toEqual(expect.arrayContaining([...unfocused.shadows]));
}

// Opens the projects list with a project on it, tabs from the new-project
// form's button to the first project card's link, and checks the link draws
// no filter, so its overlay still covers the whole card.
async function expectLinkCardFocus(
  page: Page,
  testData: TestData,
  expected: FocusShadows,
): Promise<void> {
  await testData.project();
  await page.goto("/projects");
  const link = page.locator(".link-card a").first();
  await expect(link).toBeVisible();
  await page.getByRole("button", { name: PROJECTS_COPY.create }).focus();
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  expect(await isFocusVisible(link)).toBe(true);
  const look = await focusLook(link);
  expect(look.filter).toBe("none");
  expect(showsGlow(look)).toBe(expected.glow);
  const overlay = await link.evaluate((node) => {
    const after = getComputedStyle(node, "::after");
    const card = node.closest(".link-card");
    return {
      width: Number.parseFloat(after.width) - (card?.clientWidth ?? 0),
      height: Number.parseFloat(after.height) - (card?.clientHeight ?? 0),
    };
  });
  expect(Math.abs(overlay.width)).toBeLessThanOrEqual(OVERLAY_TOLERANCE);
  expect(Math.abs(overlay.height)).toBeLessThanOrEqual(OVERLAY_TOLERANCE);
}

// Focuses an open chat's message and checks its field box shows the focus,
// with an outline and no filter, while the message itself draws no shadow.
async function expectFieldBoxFocus(
  page: Page,
  expected: FocusShadows,
): Promise<void> {
  const control = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  await control.focus();
  await expect(control).toBeFocused();
  expect(await isFocusVisible(control)).toBe(true);
  const look = await focusLook(
    page.locator(".field-box").filter({ has: control }),
  );
  expect(look.filter).toBe("none");
  expect(look.outline).not.toBe("none");
  expect(showsGlow(look)).toBe(expected.glow);
  expect((await focusLook(control)).shadows).toEqual([]);
}

export {
  expectChosenCardFocus,
  expectFieldBoxFocus,
  expectLinkCardFocus,
  type FocusShadows,
};
