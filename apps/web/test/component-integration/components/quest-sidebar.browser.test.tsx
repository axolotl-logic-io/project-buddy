import { beforeEach, describe, expect, test } from "vitest";
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
import { openPanel, panelButton, sitePanel } from "./site-panel-test-kit.ts";

const TASKS_CONTENT = "Tasks steps";
const PROGRESS_CONTENT = "Recorded milestones";
const MESSAGE_LABEL = "Message";
const DRAFT_LABEL = "Idea draft";
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
          { id: "tasks", label: "Tasks", content: <p>{TASKS_CONTENT}</p> },
          {
            id: "ideas",
            label: "Ideas",
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
            content: <p>{PROGRESS_CONTENT}</p>,
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
      await page.getByRole("tab", { name: "Tasks", exact: true }).click();
      await expect.element(draft).not.toBeVisible();
      await page.getByRole("tab", { name: "Ideas", exact: true }).click();
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
  await page.getByRole("tab", { name: "Ideas", exact: true }).click();
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
  const tasks = page.getByRole("tab", { name: "Tasks", exact: true });
  await expect.element(tasks).toHaveAttribute("aria-selected", "true");
  await expect
    .element(page.getByRole("tabpanel"))
    .toHaveTextContent("Tasks steps");
  await tasks.click();
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(page.getByRole("tab", { name: "Ideas" })).toHaveFocus();
  await expect.element(page.getByLabelText(DRAFT_LABEL)).toBeVisible();
  await userEvent.keyboard("{ArrowRight}");
  await expect
    .element(page.getByRole("tabpanel"))
    .toHaveTextContent("Recorded milestones");
  await expect.element(page.getByLabelText(DRAFT_LABEL)).not.toBeVisible();
});

// The quest page's six sidebar sections, by label.
const SIX_SECTIONS = [
  "Tasks",
  "Ideas",
  "Progress",
  "Quick Notes",
  "Members",
  "Actions",
];

describe("the sidebar's six tabs", () => {
  test.each([
    { width: 360, height: 780 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
  ])(
    "all show, unclipped, the selected one included, at $width px",
    async (viewport) => {
      await setViewport(viewport);
      await render(
        <ChatPanel
          initialSection="members"
          sideSections={SIX_SECTIONS.map((label) => ({
            id: label.toLowerCase(),
            label,
            content: <p>{label}</p>,
          }))}
        />,
      );
      const tablist = page.getByRole("tablist").element();
      const strip = tablist.getBoundingClientRect();
      expect(tablist.scrollWidth).toBeLessThanOrEqual(tablist.clientWidth);
      for (const label of SIX_SECTIONS) {
        const tab = page.getByRole("tab", { name: label, exact: true });
        const box = tab.element().getBoundingClientRect();
        expect(box.left, label).toBeGreaterThanOrEqual(strip.left);
        expect(box.right, label).toBeLessThanOrEqual(strip.right);
        expect(tab.element().scrollWidth, label).toBeLessThanOrEqual(
          tab.element().clientWidth,
        );
      }
      await expect
        .element(page.getByRole("tab", { name: "Members" }))
        .toHaveAttribute("aria-selected", "true");
    },
  );
});
