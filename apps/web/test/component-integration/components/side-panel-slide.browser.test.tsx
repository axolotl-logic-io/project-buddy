import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { PageHeader } from "@/components/page-header.tsx";
import { QuestSidePanel } from "@/components/quest-side-panel.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import { TrailBand } from "@/components/trail-band.tsx";
import { animationsSettled } from "../../support/animations-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";
import { closeButton, panelButton, sitePanel } from "./site-panel-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const SLIDE_MS = 100;
const MS_PER_SECOND = 1000;
// A panel slows as it arrives and speeds up as it leaves.
const ARRIVING = "ease-out";
const LEAVING = "ease-in";

const PAGE_TEXT = "The page";
const QUESTS_LINK = "Quests";
const PANEL_TEXT = "Members";
const OVERVIEW_TEXT = "Overview";

const QUEST_TITLE = "Fox quest";
const QUEST_TRAIL: readonly Breadcrumb[] = [{ label: QUEST_TITLE }];

const QUEST_PANEL_LABELS = {
  label: "Quest panel",
  expand: "Open quest panel",
  collapse: "Close quest panel",
};

function siteFrame(): JSX.Element {
  return (
    <>
      <PageHeader
        panel={<SitePanel links={<a href="/quests">{QUESTS_LINK}</a>} />}
      />
      <main>
        <p>{PAGE_TEXT}</p>
      </main>
    </>
  );
}

function questFrame(): JSX.Element {
  return (
    <>
      <PageHeader trail={<TrailBand items={QUEST_TRAIL} />} />
      <QuestSidePanel
        labels={QUEST_PANEL_LABELS}
        panel={<p>{PANEL_TEXT}</p>}
        title={QUEST_TITLE}
      >
        <p>{OVERVIEW_TEXT}</p>
      </QuestSidePanel>
    </>
  );
}

// The quest panel, open or closed.
function questPanel(): HTMLDialogElement {
  const dialog = document.querySelector("dialog.quest-sidebar-frame");
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error("The quest panel is not in the page");
  }
  return dialog;
}

// Whether the user can see `dialog`, or would if it were in view. WebKit
// can still show a panel just after its slide ends, until its next style
// update, so the tests wait for this rather than read it as the slide ends.
function onScreen(dialog: HTMLDialogElement): boolean {
  return dialog.checkVisibility({ visibilityProperty: true });
}

// The next slide of `dialog` to start, and whether the dialog was on screen
// as it started: a panel sliding out still is.
function nextSlide(
  dialog: HTMLDialogElement,
): Promise<{ readonly onScreen: boolean }> {
  return new Promise((resolve) => {
    function started(event: TransitionEvent): void {
      if (event.target === dialog && event.propertyName === "translate") {
        dialog.removeEventListener("transitionrun", started);
        resolve({ onScreen: onScreen(dialog) });
      }
    }
    dialog.addEventListener("transitionrun", started);
  });
}

// The slides that start anywhere in the page from now on.
function recordSlides(): {
  readonly slides: string[];
  readonly stop: () => void;
} {
  const slides: string[] = [];
  function started(event: TransitionEvent): void {
    if (event.propertyName === "translate" && event.target instanceof Element) {
      slides.push(event.target.className);
    }
  }
  document.addEventListener("transitionrun", started);
  return {
    slides,
    stop: (): void => {
      document.removeEventListener("transitionrun", started);
    },
  };
}

// How `element` moves when `property` changes: how long it takes, in ms,
// and its easing.
function motionOf(
  element: Element,
  property: string,
): { readonly ms: number; readonly easing: string } {
  const style = getComputedStyle(element);
  const at = style.transitionProperty.split(", ").indexOf(property);
  const durations = style.transitionDuration.split(", ");
  const easings = style.transitionTimingFunction.split(", ");
  return {
    ms: Number.parseFloat(durations[at] ?? "0") * MS_PER_SECOND,
    easing: easings[at] ?? "",
  };
}

// How `dialog` slides: it slows as it arrives and speeds up as it leaves.
function slideOf(dialog: HTMLDialogElement): {
  readonly ms: number;
  readonly easing: string;
} {
  return motionOf(dialog, "translate");
}

// The breadcrumbs, which give the docked panels room at their ends.
function breadcrumbs(): Element {
  const trail = document.querySelector(".trail-content");
  if (trail === null) {
    throw new Error("The breadcrumbs are not in the page");
  }
  return trail;
}

// The page beside the quest panel, which gives it room.
function questLayout(): Element {
  const layout = document.querySelector(".quest-layout");
  if (layout === null) {
    throw new Error("The quest page is not in the page");
  }
  return layout;
}

// After the next rendering update, when a change made now has been styled.
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

beforeEach(() => {
  applyTheme("parchment");
});

describe("use_case_use_on_phone: side panels slide", () => {
  beforeEach(async () => {
    await commands.reduceMotion(false);
  });

  afterEach(async () => {
    await commands.reduceMotion();
    await setViewport(LAPTOP_VIEWPORT);
  });

  for (const viewport of [LAPTOP_VIEWPORT, PHONE_VIEWPORT]) {
    test(`the site panel slides in when the user opens it and out when they close it at ${viewport.width} px`, async () => {
      await setViewport(viewport);
      await render(siteFrame());
      const dialog = document.querySelector("dialog.site-panel");
      if (!(dialog instanceof HTMLDialogElement)) {
        throw new Error("The site panel is not in the page");
      }
      const opening = nextSlide(dialog);
      await panelButton().click();
      await opening;
      expect(slideOf(dialog)).toEqual({ ms: SLIDE_MS, easing: ARRIVING });
      await animationsSettled(dialog, "The site panel");
      await expect
        .poll(() => onScreen(dialog), { message: "it has slid in" })
        .toBe(true);

      const closing = nextSlide(dialog);
      await closeButton().click();
      expect(
        (await closing).onScreen,
        "it stays on screen while it slides out",
      ).toBe(true);
      expect(dialog.open).toBe(false);
      expect(slideOf(dialog)).toEqual({ ms: SLIDE_MS, easing: LEAVING });
      await animationsSettled(dialog, "The site panel");
      await expect
        .poll(() => onScreen(dialog), {
          message: "it has gone once it slid out",
        })
        .toBe(false);
      expect(
        document.documentElement.scrollWidth,
        "the page doesn't scroll sideways to it",
      ).toBeLessThanOrEqual(viewport.width);
    });
  }

  test("the quest panel docked as the page loads shows at once, and slides out and back when the user closes and opens it", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    const loading = recordSlides();
    await render(questFrame());
    await vi.waitFor(() => {
      expect(questPanel().open).toBe(true);
    });
    await nextFrame();
    loading.stop();
    expect(loading.slides, "nothing slides as the page loads").toEqual([]);

    const dialog = questPanel();
    const closing = nextSlide(dialog);
    await page
      .getByRole("button", { name: QUEST_PANEL_LABELS.collapse })
      .click();
    expect((await closing).onScreen, "it slides out").toBe(true);
    expect(slideOf(dialog)).toEqual({ ms: SLIDE_MS, easing: LEAVING });
    expect(
      motionOf(questLayout(), "padding-inline-end"),
      "the page takes the room back at the panel's pace",
    ).toEqual({ ms: SLIDE_MS, easing: LEAVING });
    expect(
      motionOf(breadcrumbs(), "margin-inline-end"),
      "so do the breadcrumbs",
    ).toEqual({ ms: SLIDE_MS, easing: LEAVING });
    await animationsSettled(document, "The page");
    await expect
      .poll(() => onScreen(dialog), { message: "it has gone once it slid out" })
      .toBe(false);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      LAPTOP_VIEWPORT.width,
    );

    const opening = nextSlide(dialog);
    await page.getByRole("button", { name: QUEST_PANEL_LABELS.expand }).click();
    await opening;
    expect(slideOf(dialog)).toEqual({ ms: SLIDE_MS, easing: ARRIVING });
    expect(
      motionOf(questLayout(), "padding-inline-end"),
      "the page makes room at the panel's pace",
    ).toEqual({ ms: SLIDE_MS, easing: ARRIVING });
    expect(
      motionOf(breadcrumbs(), "margin-inline-end"),
      "so do the breadcrumbs",
    ).toEqual({ ms: SLIDE_MS, easing: ARRIVING });
    await animationsSettled(document, "The page");
    await expect
      .poll(() => onScreen(dialog), { message: "it has slid back in" })
      .toBe(true);
  });
});

describe("use_case_use_on_phone: side panels with reduced motion", () => {
  beforeEach(async () => {
    await commands.reduceMotion();
  });

  for (const viewport of [LAPTOP_VIEWPORT, PHONE_VIEWPORT]) {
    test(`the site panel opens and closes at once at ${viewport.width} px`, async () => {
      await setViewport(viewport);
      await render(siteFrame());
      const recorded = recordSlides();
      await panelButton().click();
      await expect.element(sitePanel()).toBeVisible();
      await closeButton().click();
      await expect.element(sitePanel()).not.toBeInTheDocument();
      await nextFrame();
      recorded.stop();
      expect(recorded.slides).toEqual([]);
    });
  }
});
