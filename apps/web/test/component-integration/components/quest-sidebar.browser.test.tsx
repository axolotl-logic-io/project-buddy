import { beforeEach, describe, expect, onTestFinished, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SiteHeader, TrailBand } from "@/components/site-header.tsx";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";
import { QuestSidebar } from "./quest-panel-test-kit.tsx";
import { bucket, collectionTab, openBucket } from "./quest-sidebar-test-kit.ts";
import { openPanel, panelButton, sitePanel } from "./site-panel-test-kit.ts";

const TASKS_CONTENT = "Tasks steps";
const PROGRESS_CONTENT = "Recorded milestones";
const MESSAGE_LABEL = "Message";
const DRAFT_LABEL = "Idea draft";
const ACTIONS_CONTENT = "Spells to cast";
// A system font wider than the site's faces, as CI falls back to when they
// are unavailable.
const WIDE_FALLBACK_FONT = '"DejaVu Sans", sans-serif';
const QUEST_NAME = "A useful quest";
const EDGE_TAB_MINIMUM_PX = 56;

beforeEach(() => {
  applyTheme("parchment");
});

async function sidebar(initialSection?: string): Promise<void> {
  await render(
    <>
      <SiteHeader
        trail={
          <TrailBand
            items={[
              { label: "Quests", href: "/quests" },
              { label: QUEST_NAME },
            ]}
          />
        }
      />
      <QuestSidebar
        initialSection={initialSection}
        sideSections={[
          {
            id: "tasks",
            label: "Tasks",
            bucket: true,
            content: <p>{TASKS_CONTENT}</p>,
          },
          {
            id: "ideas",
            label: "Ideas",
            bucket: true,
            content: (
              <label>
                {DRAFT_LABEL}
                <input className="input-field" />
              </label>
            ),
          },
          {
            id: "progress",
            label: "Progress",
            bucket: true,
            content: <p>{PROGRESS_CONTENT}</p>,
          },
          {
            id: "actions",
            label: "Actions",
            content: <p>{ACTIONS_CONTENT}</p>,
          },
        ]}
      >
        <label>
          {MESSAGE_LABEL}
          <input className="input-field" />
        </label>
      </QuestSidebar>
    </>,
  );
}

describe.each(["light", "dark"])("sidebar in %s", (mode) => {
  test.each([NARROWEST_VIEWPORT, PHONE_VIEWPORT, LAPTOP_VIEWPORT])(
    "docks flush, retains edits and restores focus at $width px",
    async (viewport) => {
      applyTheme("parchment", mode);
      await setViewport(viewport);
      await sidebar("ideas");
      const draft = page.getByLabelText(DRAFT_LABEL);
      await draft.fill("Try clay");
      await openBucket("Tasks");
      await expect.element(draft).not.toBeVisible();
      await openBucket("Ideas");
      await expect.element(draft).toHaveValue("Try clay");
      const panel = page.getByRole("dialog", { name: "Quest side menu" });
      const bounds = panel.element().getBoundingClientRect();
      expect(bounds.right).toBe(viewport.width);
      expect(bounds.bottom).toBe(viewport.height);
      expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
      expect(smallTargets(await measureTargets())).toEqual([]);
      await page
        .getByRole("button", { name: "Collapse quest sidebar" })
        .click();
      const toggle = page.getByRole("button", { name: "Open quest sidebar" });
      await expect.element(draft).not.toBeVisible();
      await expect.element(toggle).toHaveFocus();
      const header = page.getByRole("banner");
      await expect
        .element(header.getByRole("button", { name: "Open quest sidebar" }))
        .toBeVisible();
      const buttonBounds = toggle.element().getBoundingClientRect();
      const headerBounds = header.element().getBoundingClientRect();
      expect(buttonBounds.top).toBeGreaterThanOrEqual(headerBounds.top);
      expect(buttonBounds.bottom).toBeLessThanOrEqual(headerBounds.bottom);
      expect(buttonBounds.right).toBe(viewport.width);
      expect(buttonBounds.width).toBeGreaterThanOrEqual(EDGE_TAB_MINIMUM_PX);
      expect(buttonBounds.height).toBeGreaterThanOrEqual(EDGE_TAB_MINIMUM_PX);
      const headingBounds = page
        .getByRole("heading", { name: QUEST_NAME })
        .element()
        .getBoundingClientRect();
      expect(buttonBounds.top + buttonBounds.height / 2).toBeCloseTo(
        headingBounds.top + headingBounds.height / 2,
        0,
      );
      const siteBounds = panelButton().element().getBoundingClientRect();
      expect(siteBounds.left).toBe(0);
      expect(siteBounds.width).toBe(buttonBounds.width);
      expect(siteBounds.height).toBe(buttonBounds.height);
      expect(siteBounds.top + siteBounds.height / 2).toBeCloseTo(
        headingBounds.top + headingBounds.height / 2,
        0,
      );
      for (const link of header.getByRole("link").all()) {
        expect(
          link.element().getBoundingClientRect().right,
        ).toBeLessThanOrEqual(buttonBounds.left);
      }
      await expect.element(page.getByLabelText("Message")).toBeVisible();
      await toggle.click();
      const closeBounds = page
        .getByRole("button", { name: "Collapse quest sidebar" })
        .element()
        .getBoundingClientRect();
      expect([
        closeBounds.left,
        closeBounds.top,
        closeBounds.width,
        closeBounds.height,
      ]).toEqual([
        buttonBounds.left,
        buttonBounds.top,
        buttonBounds.width,
        buttonBounds.height,
      ]);
      await expect.element(draft).toHaveValue("Try clay");
    },
  );
});

test.each(["light", "soot-brass", "dark"])(
  "breadcrumbs have a gutter beside both docked panels in %s",
  async (mode) => {
    applyTheme("parchment", mode);
    await setViewport(LAPTOP_VIEWPORT);
    await sidebar("tasks");
    const gutter = page
      .getByRole("link", { name: SITE_COPY.name })
      .element()
      .getBoundingClientRect().left;
    await openPanel();
    const leftPanel = sitePanel().element().getBoundingClientRect();
    const rightPanel = page
      .getByRole("dialog", { name: "Quest side menu" })
      .element()
      .getBoundingClientRect();
    const parent = page
      .getByRole("navigation", { name: "Breadcrumbs" })
      .getByRole("link", { name: "Quests" })
      .element()
      .getBoundingClientRect();
    const heading = page
      .getByRole("heading", { name: QUEST_NAME })
      .element()
      .getBoundingClientRect();
    expect(parent.left - leftPanel.right).toBeGreaterThanOrEqual(gutter);
    expect(rightPanel.left - heading.right).toBeGreaterThanOrEqual(gutter);
    expect(pageScrollWidth()).toBeLessThanOrEqual(LAPTOP_VIEWPORT.width);
  },
);

test("a phone starts with the conversation and Escape closes its drawer", async () => {
  await setViewport(PHONE_VIEWPORT);
  await sidebar();
  const toggle = page.getByRole("button", { name: "Open quest sidebar" });
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await openBucket("Ideas");
  await page.getByLabelText(DRAFT_LABEL).fill("Keep this draft");
  await userEvent.keyboard("{Escape}");
  await expect.element(toggle).toHaveFocus();
  await toggle.click();
  await expect
    .element(page.getByLabelText(DRAFT_LABEL))
    .toHaveValue("Keep this draft");
});

test("collection tabs switch with arrow keys and preserve the hidden editor", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await sidebar("tasks");
  const tasks = collectionTab();
  await expect.element(tasks).toHaveAttribute("aria-selected", "true");
  tasks.element().focus();
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(collectionTab("Ideas")).toHaveFocus();
  await expect.element(page.getByLabelText(DRAFT_LABEL)).toBeVisible();
  await expect.element(page.getByText(TASKS_CONTENT)).not.toBeVisible();
  await userEvent.keyboard("{ArrowLeft}");
  await expect.element(tasks).toHaveFocus();
  await expect.element(page.getByText(TASKS_CONTENT)).toBeVisible();
});

test("direct collection tabs expose every bucket and utility entry remains available", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await sidebar("actions");
  await expect
    .element(bucket("Actions").getByText(ACTIONS_CONTENT))
    .toBeVisible();
  await openBucket("Ideas");
  await expect
    .element(collectionTab("Ideas"))
    .toHaveAttribute("aria-selected", "true");
  await expect
    .element(bucket("Ideas").getByRole("heading", { name: "Ideas" }))
    .toBeVisible();
  await openBucket("Progress");
  await expect
    .element(bucket("Progress").getByText(PROGRESS_CONTENT))
    .toBeVisible();
});

// The quest page's sidebar sections: four collections, then utilities.
const SIX_SECTIONS = [
  { label: "Tasks", bucket: true },
  { label: "Ideas", bucket: true },
  { label: "Quick Notes", bucket: true },
  { label: "Progress", bucket: true },
  { label: "Actions", bucket: false },
  { label: "Members", bucket: false },
];
const SIDEBAR_TABS = ["Tasks", "Ideas", "Quick Notes", "Progress"];

describe("the sidebar's direct collection tabs", () => {
  test.each([
    { width: 320, height: 640 },
    { width: 360, height: 780 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
  ])(
    "all remain unclipped, the selected one included, at $width px",
    async (viewport) => {
      await setViewport(viewport);
      // CI's system fallback is wider than the site's loaded faces. Keep
      // the no-clipping promise while fonts are unavailable as well, by
      // setting every text in that fallback, whichever fonts the theme uses.
      const fallback = document.createElement("style");
      fallback.textContent = `body * { font-family: ${WIDE_FALLBACK_FONT} !important; }`;
      document.head.append(fallback);
      onTestFinished(() => {
        fallback.remove();
      });
      await render(
        <QuestSidebar
          initialSection="members"
          sideSections={SIX_SECTIONS.map(({ label, bucket: inMenu }) => ({
            id: label.toLowerCase(),
            label,
            bucket: inMenu,
            content: <p>{label}</p>,
          }))}
        />,
      );
      const tablist = page.getByRole("tablist").element();
      const strip = tablist.getBoundingClientRect();
      expect(tablist.scrollWidth).toBeLessThanOrEqual(tablist.clientWidth);
      expect(
        page
          .getByRole("tab")
          .elements()
          .map((tab) => tab.textContent),
      ).toEqual(SIDEBAR_TABS);
      const tops = new Set<number>();
      for (const label of SIDEBAR_TABS) {
        const tab = page.getByRole("tab", { name: label, exact: true });
        const box = tab.element().getBoundingClientRect();
        tops.add(Math.round(box.top));
        expect(box.left, label).toBeGreaterThanOrEqual(strip.left);
        expect(box.right, label).toBeLessThanOrEqual(strip.right);
        expect(tab.element().scrollWidth, label).toBeLessThanOrEqual(
          tab.element().clientWidth,
        );
      }
      // The approved direct tabs may wrap, but remain a compact two-row rail.
      expect(tops.size).toBeLessThanOrEqual(2);
      await expect
        .element(page.getByRole("region", { name: "Members" }))
        .toBeVisible();
    },
  );
});

test.each(["light", "soot-brass", "dark"])(
  "the line under the sidebar's tabs meets the line under the breadcrumbs in %s",
  async (mode) => {
    applyTheme("parchment", mode);
    await setViewport(LAPTOP_VIEWPORT);
    await sidebar("tasks");
    const rail = page
      .getByRole("heading", { name: "Quest", exact: true })
      .element().parentElement;
    const trail = page
      .getByRole("region", { name: SITE_COPY.breadcrumbs })
      .element()
      .getBoundingClientRect();
    expect(rail?.getBoundingClientRect().bottom).toBeCloseTo(trail.bottom, 0);
  },
);

test("crossing the docking breakpoint preserves the mounted editor", async () => {
  await setViewport(PHONE_VIEWPORT);
  await sidebar("ideas");
  const draft = page.getByLabelText(DRAFT_LABEL);
  await draft.fill("Keep across docking");
  await setViewport(LAPTOP_VIEWPORT);
  await expect.element(draft).toHaveValue("Keep across docking");
  await expect.element(page.getByLabelText(MESSAGE_LABEL)).toBeVisible();
  await setViewport(PHONE_VIEWPORT);
  await expect
    .poll(() =>
      page
        .getByRole("dialog", { name: "Quest side menu" })
        .element()
        .matches(":modal"),
    )
    .toBe(true);
  await expect.element(draft).toHaveValue("Keep across docking");
  await userEvent.keyboard("{Escape}");
  await expect
    .element(page.getByRole("button", { name: "Open quest sidebar" }))
    .toHaveFocus();
});
