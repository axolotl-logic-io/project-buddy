import { beforeEach, describe, expect, onTestFinished, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SiteHeader, TrailBand } from "@/components/site-header.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
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
import {
  bucket,
  collectionTab,
  openAction,
  openBucket,
} from "./quest-sidebar-test-kit.ts";
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
const EDGE_TAB_MINIMUM_PX = 44;

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
            content: <TextField label={DRAFT_LABEL} />,
          },
          {
            id: "progress",
            label: "Milestones",
            content: <p>{PROGRESS_CONTENT}</p>,
          },
          {
            id: "actions",
            label: "Quest status",
            content: <p>{ACTIONS_CONTENT}</p>,
          },
        ]}
      >
        <TextField label={MESSAGE_LABEL} />
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
      const panel = page.getByRole("dialog", {
        name: QUEST_SIDEBAR_COPY.label,
      });
      const bounds = panel.element().getBoundingClientRect();
      expect(bounds.right).toBe(viewport.width);
      expect(bounds.bottom).toBe(viewport.height);
      expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
      expect(smallTargets(await measureTargets())).toEqual([]);
      await page
        .getByRole("button", { name: QUEST_SIDEBAR_COPY.collapse })
        .click();
      const toggle = page.getByRole("button", {
        name: QUEST_SIDEBAR_COPY.expand,
      });
      await expect.element(draft).not.toBeVisible();
      await expect.element(toggle).toHaveFocus();
      const header = page.getByRole("banner");
      await expect
        .element(
          header.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }),
        )
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
      await expect
        .element(page.getByLabelText(CHAT_COPY.messageLabel))
        .toBeVisible();
      await toggle.click();
      const closeBounds = page
        .getByRole("button", { name: QUEST_SIDEBAR_COPY.collapse })
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
      .getByRole("dialog", { name: QUEST_SIDEBAR_COPY.label })
      .element()
      .getBoundingClientRect();
    const parent = page
      .getByRole("navigation", { name: SITE_COPY.breadcrumbs })
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
  const toggle = page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand });
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

test("the bucket dropdown works by keyboard and preserves the hidden editor", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await sidebar("ideas");
  const buckets = collectionTab();
  await expect.element(buckets).toHaveAttribute("aria-selected", "true");
  const draft = page.getByLabelText(DRAFT_LABEL);
  await draft.fill("Keep this draft");
  buckets.element().focus();
  await userEvent.keyboard("{ArrowDown}");
  await expect
    .element(page.getByRole("menu", { name: QUEST_SIDEBAR_COPY.buckets }))
    .toBeVisible();
  await userEvent.keyboard("{Enter}");
  await expect.element(page.getByText(TASKS_CONTENT)).toBeVisible();
  await openBucket("Ideas");
  await expect.element(draft).toHaveValue("Keep this draft");
});

test("Scopes each destination to its menu and supports direct action links", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await sidebar("actions");
  await expect
    .element(bucket("Quest status").getByText(ACTIONS_CONTENT))
    .toBeVisible();
  await openBucket("Ideas");
  await expect
    .element(bucket("Ideas").getByRole("heading", { name: "Ideas" }))
    .toBeVisible();
  await expect.element(bucket("Quest status")).not.toBeInTheDocument();
  await openAction("Milestones");
  await expect
    .element(bucket("Milestones").getByText(PROGRESS_CONTENT))
    .toBeVisible();
});

const SECTIONS = [
  { id: "tasks", label: "Tasks", bucket: true },
  { id: "ideas", label: "Ideas", bucket: true },
  { id: "notes", label: "Quick Notes", bucket: true },
  { id: "spells", label: "Spells", bucket: false },
  { id: "actions", label: "Quest status", bucket: false },
  { id: "members", label: "Members", bucket: false },
];
const SIDEBAR_TABS = ["Spells", "Buckets", "Actions"];

describe("the sidebar's menu tabs", () => {
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
          sideSections={SECTIONS.map((section) => ({
            ...section,
            content: <p>{section.label}</p>,
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
        .element(page.getByRole("region", { name: QUEST_MEMBERS_COPY.heading }))
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
      .getByRole("heading", { name: QUEST_SIDEBAR_COPY.quest, exact: true })
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
        .getByRole("dialog", { name: QUEST_SIDEBAR_COPY.label })
        .element()
        .matches(":modal"),
    )
    .toBe(true);
  await expect.element(draft).toHaveValue("Keep across docking");
  await userEvent.keyboard("{Escape}");
  await expect
    .element(page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }))
    .toHaveFocus();
});
