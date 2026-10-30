// For the browser tests (*.browser.test.tsx) that check how a focused
// element draws its focus: its computed filter, outline and box-shadow, the
// theme's focus glow as one more layer of that box-shadow, read from the
// computed styles.

// One layer of a computed box-shadow: its text, and its blur radius and
// spread in pixels.
interface ShadowLayer {
  readonly text: string;
  readonly blur: number;
  readonly spread: number;
}

// A focused element's filter and outline, the layers of its box-shadow, the
// theme's focus glow as one such layer, and the gap the token contract asks
// for between an element and its focus outline.
interface FocusLook {
  readonly filter: string;
  readonly outline: string;
  readonly shadows: readonly ShadowLayer[];
  readonly glow: ShadowLayer;
  readonly contractGap: number;
}

// Splits a computed box-shadow into its layers. Each layer reads
// `<colour> <x> <y> <blur> <spread> [inset]`, so a layer's comma follows a
// length or `inset`, and no comma in a colour does.
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

function focusLook(node: Element): FocusLook {
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
    contractGap: Number.parseFloat(style.getPropertyValue("--focus-offset")),
  };
}

// Whether a focused element shows the theme's glow: a blurred layer of its
// box-shadow.
function showsGlow(look: FocusLook): boolean {
  return (
    look.glow.blur > 0 &&
    look.shadows.some((layer) => layer.text === look.glow.text)
  );
}

export { focusLook, type ShadowLayer, showsGlow };
