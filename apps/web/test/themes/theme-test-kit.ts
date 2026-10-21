import { afterEach, beforeEach } from "vitest";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import type { ThemeId } from "@/themes/themes.ts";

let htmlClasses: string | null;
let bodyClasses: string | null;
let attributes: [string, string | null][] = [];

beforeEach(() => {
  htmlClasses = document.documentElement.getAttribute("class");
  bodyClasses = document.body.getAttribute("class");
  attributes = Object.keys(DEFAULT_THEME_ATTRIBUTES).map((name) => [
    name,
    document.documentElement.getAttribute(name),
  ]);
});

function restoreAttribute(
  element: Element,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}

afterEach(() => {
  restoreAttribute(document.documentElement, "class", htmlClasses);
  restoreAttribute(document.body, "class", bodyClasses);
  for (const [name, value] of attributes) {
    restoreAttribute(document.documentElement, name, value);
  }
});

function applyTheme(theme: ThemeId, mode = "light"): void {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  document.documentElement.setAttribute(MODE_ATTRIBUTE, mode);
}

export { applyTheme };
