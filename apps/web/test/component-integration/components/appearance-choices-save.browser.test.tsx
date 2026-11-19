// A browser without the Cookie Store API still saves an appearance.

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { render } from "vitest-browser-react";
import { SitePanel } from "@/components/site-panel.tsx";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE, type ThemeChoice } from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import {
  appliedChoice,
  choose,
  closePanel,
  openPanel,
} from "./site-panel-test-kit.ts";

const COOKIE_STORE = "cookieStore";

// Where a browser may define the Cookie Store API, with its definition
// there, put back after the tests.
const COOKIE_STORE_OWNERS: readonly object[] = [globalThis, Window.prototype];
const savedDefinitions = COOKIE_STORE_OWNERS.map((owner) =>
  Object.getOwnPropertyDescriptor(owner, COOKIE_STORE),
);

const PARCHMENT_DARK: ThemeChoice = {
  theme: DEFAULT_THEME_CHOICE.theme,
  mode: "dark",
};

beforeAll(() => {
  for (const owner of COOKIE_STORE_OWNERS) {
    Reflect.deleteProperty(owner, COOKIE_STORE);
  }
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  COOKIE_STORE_OWNERS.forEach((owner, index) => {
    const definition = savedDefinitions[index];
    if (definition !== undefined) {
      Object.defineProperty(owner, COOKIE_STORE, definition);
    }
  });
});

describe("use_case_choose_theme", () => {
  test("saves the choice without the Cookie Store API", async () => {
    expect(COOKIE_STORE in globalThis).toBe(false);
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", request);
    await render(<SitePanel links={null} />);

    await openPanel();
    await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    await closePanel();

    expect(appliedChoice()).toStrictEqual(PARCHMENT_DARK);
    expect(request).toHaveBeenCalledWith("/api/appearance", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(PARCHMENT_DARK),
      keepalive: true,
    });
  });
});
