// The size of every control a page shows, by WCAG 2.2's 2.5.8 (Target Size
// (Minimum)), for mobile.spec.ts.
import type { Page } from "@playwright/test";
import { MINIMUM_TARGET_PX } from "@/viewports-test-kit.ts";

// Every element a user can touch to do something.
const CONTROLS = "a[href], button, input, select, textarea, summary";

// A control and its size, as a failure lists it.
interface MeasuredTarget {
  readonly control: string;
  readonly width: number;
  readonly height: number;
}

// Runs in the browser: the indexes, among controls, of those that are
// targets. Left out are those WCAG 2.5.8 exempts or that are not targets:
// - The inline exception: a link in a sentence, where the line of text sets
//   its size. A link is an <a>, or a button Streamdown renders for a link in
//   a reply (data-streamdown="link"). It is in a sentence when it is laid
//   out inline and its nearest block ancestor is a paragraph, a list item or
//   a table cell with other text in it, as in a reply's "Read more in [the
//   manual]." or a link inside <strong>.
// - Disabled controls, such as a task list's read-only checkboxes, are not
//   targets: touching them does nothing.
function targetIndexes(controls: Element[]): number[] {
  function isInline(element: Element): boolean {
    const { display } = getComputedStyle(element);
    return display.startsWith("inline") || display === "contents";
  }

  function blockAncestor(element: Element): Element | null {
    const parent = element.parentElement;
    if (parent === null || !isInline(parent)) {
      return parent;
    }
    return blockAncestor(parent);
  }

  function isLink(control: Element): boolean {
    return (
      control.tagName === "A" ||
      control.getAttribute("data-streamdown") === "link"
    );
  }

  function inSentence(control: Element): boolean {
    const block = blockAncestor(control);
    return (
      isLink(control) &&
      isInline(control) &&
      block?.matches("p, li, td") === true &&
      block.textContent.trim() !== control.textContent.trim()
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

  return controls.flatMap((control, index) => {
    if (isTarget(control)) {
      return [index];
    }
    return [];
  });
}

// Runs in the browser: the controls at indexes, each with its size.
// Each control is scrolled to the middle of the screen and measured a frame
// later. Streamdown draws a code block with `content-visibility: auto`, so
// until the block has been on screen its buttons (Copy Code, Download file)
// aren't laid out, and they measure 0×0 while still counting as visible.
async function measureEach(
  controls: Element[],
  indexes: readonly number[],
): Promise<MeasuredTarget[]> {
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

  async function measureFrom(
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
    return await measureFrom(rest, [
      ...measured,
      { control: label(control), width, height },
    ]);
  }

  return await measureFrom(
    controls.filter((_control, index) => indexes.includes(index)),
    [],
  );
}

// Every target on the page and its size.
async function measureTargets(page: Page): Promise<MeasuredTarget[]> {
  const controls = page.locator(CONTROLS);
  const indexes = await controls.evaluateAll(targetIndexes);
  return await controls.evaluateAll(measureEach, indexes);
}

// The targets smaller than the minimum either way.
function smallTargets(
  targets: readonly MeasuredTarget[],
): readonly MeasuredTarget[] {
  return targets.filter(
    ({ width, height }) =>
      width < MINIMUM_TARGET_PX || height < MINIMUM_TARGET_PX,
  );
}

export { measureTargets, smallTargets };
