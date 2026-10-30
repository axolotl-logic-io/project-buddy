// For signed-in-pages.browser.test.tsx: where elements sit and how they
// look, measured in the page under test.

// The top and bottom of an element on the page.
interface VerticalSpan {
  readonly top: number;
  readonly bottom: number;
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

function verticalSpan(element: Element): VerticalSpan {
  const { top, bottom } = element.getBoundingClientRect();
  return { top, bottom };
}

// Whether two spans share a row: each starts above the other's end.
function shareRow(one: VerticalSpan, other: VerticalSpan): boolean {
  return one.top < other.bottom && other.top < one.bottom;
}

// A checkbox's look, and the colours of the theme's primary, line and field
// tokens, each as the browser computes a colour.
function checkboxLook(box: Element | undefined): CheckboxLook {
  if (box === undefined) {
    throw new Error("No checkbox to look at");
  }
  const probe = document.createElement("span");
  box.after(probe);
  function token(name: string): string {
    probe.style.color = `var(--${name})`;
    return getComputedStyle(probe).color;
  }
  const style = getComputedStyle(box);
  const look: CheckboxLook = {
    appearance: style.appearance,
    background: style.backgroundColor,
    border: style.borderTopColor,
    primary: token("primary"),
    line: token("line"),
    field: token("field"),
  };
  probe.remove();
  return look;
}

// An element's font size, in pixels.
function fontSize(element: Element): number {
  return Number.parseFloat(getComputedStyle(element).fontSize);
}

export type { CheckboxLook, VerticalSpan };
export { checkboxLook, fontSize, shareRow, verticalSpan };
