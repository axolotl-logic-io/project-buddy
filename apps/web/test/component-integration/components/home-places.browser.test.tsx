// "use_case_home_streaks" in use-cases: the ribbon at the top of Home links
// to Quests, the Grimoire and the Timer, named as the site panel's Places
// names them. On the narrowest phone the three links stay on one line, each
// a touch target's height, and none runs past the ribbon. The theme fonts
// are loaded, since the links' widths depend on them.
// test/component-integration/app/phone-pages.touch.browser.test.tsx checks
// Home's reflow as a whole.

import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { HomePlaces } from "@/components/home-places.tsx";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

const PLACES = [
  { name: QUESTS_COPY.headerLink, href: "/quests" },
  { name: GRIMOIRE_COPY.heading, href: "/grimoire" },
  { name: TIMER_COPY.panelLink, href: "/timer" },
] as const;

// The site's --target-size, a touch target's height.
const TARGET_PX = 44;

beforeAll(() => installThemeFonts());
beforeEach(() => applyTheme("parchment"));

function ribbon(): ReturnType<typeof page.getByRole> {
  return page.getByRole("navigation", { name: SITE_PANEL_COPY.placesLabel });
}

describe("use_case_home_streaks", () => {
  test("links to Quests, the Grimoire and the Timer", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    await render(<HomePlaces />);
    const links = ribbon().getByRole("link");
    await expect.element(links.first()).toBeVisible();
    expect(links.elements()).toHaveLength(PLACES.length);
    await Promise.all(
      PLACES.map(({ name, href }) =>
        expect
          .element(ribbon().getByRole("link", { name }))
          .toHaveAttribute("href", href),
      ),
    );
  });

  test("keeps its links on one line on the narrowest phone", async () => {
    await setViewport(NARROWEST_VIEWPORT);
    await render(<HomePlaces />);
    await loadFonts();
    const nav = ribbon().element().getBoundingClientRect();
    const boxes = PLACES.map(({ name }) =>
      ribbon().getByRole("link", { name }).element().getBoundingClientRect(),
    );
    for (const box of boxes) {
      expect(box.top).toBe(boxes[0]?.top);
      expect(box.height).toBeGreaterThanOrEqual(TARGET_PX);
      expect(box.left).toBeGreaterThanOrEqual(nav.left);
      expect(box.right).toBeLessThanOrEqual(nav.right);
    }
  });
});
