import { beforeEach, describe, expect, onTestFinished, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatPanel } from "@/components/chat-panel.tsx";
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
import {
  bucket,
  bucketItem,
  bucketsTab,
  openBucket,
} from "./quest-sidebar-test-kit.ts";
import { openPanel, panelButton, sitePanel } from "./site-panel-test-kit.ts";

const TASKS_CONTENT = "Tasks steps";
const PROGRESS_CONTENT = "Recorded milestones";
const MESSAGE_LABEL = "Message";
const DRAFT_LABEL = "Idea draft";
const ACTIONS_CONTENT = "Spells to cast";
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
      <ChatPanel
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
      </ChatPanel>
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

test("sidebar tabs switch with arrow keys and show one section at a time", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await sidebar("tasks");
  const buckets = bucketsTab();
  await expect.element(buckets).toHaveAttribute("aria-selected", "true");
  await expect.element(bucket("Tasks").getByText(TASKS_CONTENT)).toBeVisible();
  buckets.element().focus();
  await userEvent.keyboard("{ArrowRight}");
  await expect
    .element(page.getByRole("tab", { name: "Actions", exact: true }))
    .toHaveFocus();
  await expect
    .element(page.getByRole("tabpanel"))
    .toHaveTextContent(ACTIONS_CONTENT);
  await expect.element(page.getByText(TASKS_CONTENT)).not.toBeVisible();
  await userEvent.keyboard("{ArrowLeft}");
  await expect.element(buckets).toHaveFocus();
  await expect.element(page.getByText(TASKS_CONTENT)).toBeVisible();
});

describe("the Buckets menu", () => {
  test("lists the buckets, checks the open one, and its choice heads the panel", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    await sidebar("ideas");
    await expect.element(bucketsTab()).toHaveAttribute("aria-selected", "true");
    await expect
      .element(bucket("Ideas").getByRole("heading", { name: "Ideas" }))
      .toBeVisible();
    await bucketsTab().click();
    await expect
      .element(page.getByRole("menu", { name: "Buckets" }))
      .toBeVisible();
    expect(
      page
        .getByRole("menuitemradio")
        .elements()
        .map((item) => item.textContent),
    ).toEqual(["Tasks", "Ideas", "Progress"]);
    await expect
      .element(bucketItem("Ideas"))
      .toHaveAttribute("aria-checked", "true");
    await bucketItem("Progress").click();
    await expect
      .element(page.getByRole("menu", { name: "Buckets" }))
      .not.toBeInTheDocument();
    await expect
      .element(bucket("Progress").getByText(PROGRESS_CONTENT))
      .toBeVisible();
    await expect.element(page.getByLabelText(DRAFT_LABEL)).not.toBeVisible();
  });

  test("opens from another tab and selects Buckets", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    await sidebar("actions");
    await expect.element(page.getByText(TASKS_CONTENT)).not.toBeVisible();
    await openBucket("Progress");
    await expect.element(bucketsTab()).toHaveAttribute("aria-selected", "true");
    await expect.element(bucket("Progress")).toBeVisible();
  });

  test("works from the keyboard, and Escape closes it back to its tab", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    await sidebar("tasks");
    bucketsTab().element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(bucketItem("Tasks")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect
      .element(page.getByRole("menu", { name: "Buckets" }))
      .not.toBeInTheDocument();
    await expect.element(bucketsTab()).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    await expect.element(bucket("Ideas")).toBeVisible();
    await expect.element(bucketsTab()).toHaveFocus();
  });
});

// The quest page's sidebar sections: four buckets, then two tabs.
const SIX_SECTIONS = [
  { label: "Tasks", bucket: true },
  { label: "Ideas", bucket: true },
  { label: "Quick Notes", bucket: true },
  { label: "Progress", bucket: true },
  { label: "Actions", bucket: false },
  { label: "Members", bucket: false },
];
const SIDEBAR_TABS = ["Buckets", "Actions", "Members"];

describe("the sidebar's three tabs", () => {
  test.each([
    { width: 320, height: 640 },
    { width: 360, height: 780 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
  ])(
    "all show on one row, unclipped, the selected one included, at $width px",
    async (viewport) => {
      await setViewport(viewport);
      // CI's system fallback is wider than the site's loaded face. Keep the
      // no-clipping promise while fonts are unavailable as well.
      const originalFont =
        document.documentElement.style.getPropertyValue("--typeface-nunito");
      document.documentElement.style.setProperty(
        "--typeface-nunito",
        "DejaVu Sans, sans-serif",
      );
      onTestFinished(() => {
        document.documentElement.style.setProperty(
          "--typeface-nunito",
          originalFont,
        );
      });
      await render(
        <ChatPanel
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
      expect(tops.size).toBe(1);
      await expect
        .element(page.getByRole("tab", { name: "Members" }))
        .toHaveAttribute("aria-selected", "true");
    },
  );
});

test.each(["light", "soot-brass", "dark"])(
  "the line under the sidebar's tabs meets the line under the breadcrumbs in %s",
  async (mode) => {
    applyTheme("parchment", mode);
    await setViewport(LAPTOP_VIEWPORT);
    await sidebar("tasks");
    const rail = page.getByRole("tablist").element().parentElement;
    const trail = page
      .getByRole("region", { name: SITE_COPY.breadcrumbs })
      .element()
      .getBoundingClientRect();
    expect(rail?.getBoundingClientRect().bottom).toBeCloseTo(trail.bottom, 0);
  },
);
