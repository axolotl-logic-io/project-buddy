// For browser tests that check which colour a button is filled with, such
// as a confirm dialog's danger button: the theme's colour token as the
// browser paints it, to compare with the button's computed background.

// A background colour that paints nothing.
const UNPAINTED = "rgba(0, 0, 0, 0)";

// The colour the theme gives token (such as "danger"), as getComputedStyle
// writes a background colour. Throws when no theme gives it one, so a test
// that forgot to apply a theme can't compare two empty fills and pass.
function tokenColor(token: string): string {
  const probe = document.createElement("span");
  probe.style.backgroundColor = `var(--${token})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (color === UNPAINTED) {
    throw new Error(`No theme colours --${token}; apply a theme first`);
  }
  return color;
}

// The colours element is painted in: its fill and its text.
function paintOf(element: Element): {
  readonly fill: string;
  readonly text: string;
} {
  const look = getComputedStyle(element);
  return { fill: look.backgroundColor, text: look.color };
}

export { paintOf, tokenColor };
