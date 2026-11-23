// The views the visual comparison (compare.ts) screenshots and the baseline
// (baseline.ts) measures: every critical view of the site, and the
// states it must show, in the review accounts `mise run review-data` makes.
// This is the one list both tools read; add a view here and both pick it up.
//
// A view's name is "<view>--<state>", the same name as its mockup page
// (<view>--<state>.html), so the comparison can pair them.
import type { Page } from "@playwright/test";
import type { ReviewKind } from "../development/review-accounts.ts";
import { CROWDED, TYPICAL } from "../development/review-content.ts";

// The account a view is opened as: one of the review accounts, or nobody.
type ViewAccount = ReviewKind | "signed-out";

// What the screenshot covers: the whole page, grown to its height; the window
// only, for menus, dialogs and drawers; or the page down to the end of the
// quest sidebar, for a sidebar tab.
type ViewFrame = "page" | "window" | "sidebar";

// The site lays itself out for a phone below its 64rem breakpoint.
type Layout = "phone" | "desktop";

// Finds a review account's quests and rites by name, as paths to open.
interface ViewFinder {
  readonly quest: (name: string) => string;
  readonly rite: (name: string) => string;
}

// Where a view's preparation runs: the page, and the layout of its width.
interface ViewPage {
  readonly page: Page;
  readonly layout: Layout;
}

type ViewPath = string | ((find: ViewFinder) => string);

interface VisualView {
  readonly view: string;
  readonly state: string;
  readonly account: ViewAccount;
  // The path to open, or how to find it among the account's quests and
  // rites.
  readonly path: ViewPath;
  readonly frame: ViewFrame;
  // The desktop site panel is docked open; otherwise it is closed.
  readonly docked?: boolean;
  // Shown only in this layout.
  readonly only?: Layout;
  // Brings the page to the state after it loads. The tools wait for the
  // page to settle afterwards.
  readonly prepare?: (at: ViewPage) => Promise<void>;
  // The baseline measures this view's page load. One state per page is
  // measured, opened as the typical account or signed out.
  readonly measure?: boolean;
}

const PHONE_BELOW = 1024;
// The most Tab presses spent looking for a control.
const MAX_TABS = 60;
const MINUTE_MS = 60_000;
// The running timer: 18 minutes into a 50-minute work period.
const WORK_MINUTES = 50;
const BREAK_MINUTES = 10;
const MINUTES_IN = 18;

// The typical account's rite and quests (review-content.ts).
const RITE: string = TYPICAL.rites[0]?.name ?? "";
const QUEST_DONE: string = TYPICAL.quests[0]?.name ?? "";
const QUEST_LEARN: string = TYPICAL.quests.at(-1)?.name ?? "";
// The crowded account's main quest, the newest, and its first rite.
const CROWDED_QUEST: string = CROWDED.quests.at(-1)?.name ?? "";
const CROWDED_RITE: string = CROWDED.rites[0]?.name ?? "";

function layoutOf(width: number): Layout {
  if (width < PHONE_BELOW) {
    return "phone";
  }
  return "desktop";
}

function viewName({ view, state }: VisualView): string {
  return `${view}--${state}`;
}

function quest(name: string): (find: ViewFinder) => string {
  function questPath(find: ViewFinder): string {
    return find.quest(name);
  }
  return questPath;
}

function rite(name: string): (find: ViewFinder) => string {
  function ritePath(find: ViewFinder): string {
    return find.rite(name);
  }
  return ritePath;
}

function runningTimer(): string {
  const start = Date.now() - MINUTES_IN * MINUTE_MS;
  return `/timer/${WORK_MINUTES}/${BREAK_MINUTES}/${start}`;
}

// On a phone, opens the quest sidebar drawer; on a desktop it is open.
async function openTimerPanel({ page, layout }: ViewPage): Promise<void> {
  if (layout === "phone") {
    await page.getByRole("button", { name: "Open timer" }).click();
  }
}

async function openSitePanel({ page }: ViewPage): Promise<void> {
  await page.getByRole("button", { name: "Site panel" }).click();
}

async function tabTo(
  page: Page,
  selector: string,
  left: number = MAX_TABS,
): Promise<void> {
  if (left === 0) {
    throw new Error(`Tab never reached ${selector}.`);
  }
  await page.keyboard.press("Tab");
  const reached: boolean = await page.evaluate(
    (wanted: string): boolean =>
      document.activeElement?.matches(wanted) === true,
    selector,
  );
  if (!reached) {
    await tabTo(page, selector, left - 1);
  }
}

const VIEWS: readonly VisualView[] = [
  // 1. Sign in, signed out, and its notice once a link is sent.
  {
    view: "sign-in",
    state: "default",
    account: "signed-out",
    path: "/login",
    frame: "page",
    measure: true,
  },
  {
    view: "sign-in",
    state: "link-sent",
    account: "signed-out",
    path: "/login",
    frame: "page",
    async prepare({ page }: ViewPage): Promise<void> {
      await page
        .getByRole("textbox", { name: "Email address" })
        .fill("visual-check@project-buddy.test");
      await page.getByRole("button", { name: "Email me a link" }).click();
    },
  },

  // 2. Quests list, with the site panel docked open on a desktop; empty and
  // crowded.
  {
    view: "quests",
    state: "list",
    account: "typical",
    path: "/quests",
    frame: "page",
    docked: true,
    measure: true,
  },
  {
    view: "quests",
    state: "empty",
    account: "empty",
    path: "/quests",
    frame: "page",
  },
  {
    view: "quests",
    state: "crowded",
    account: "crowded",
    path: "/quests",
    frame: "page",
    docked: true,
  },
  {
    // The site panel holds the appearance swatches too.
    view: "site-panel",
    state: "open",
    account: "typical",
    path: "/quests",
    frame: "window",
    prepare: openSitePanel,
  },
  {
    view: "quick-note",
    state: "dialog",
    account: "typical",
    path: "/quests",
    frame: "window",
    async prepare(at: ViewPage): Promise<void> {
      await openSitePanel(at);
      await at.page.getByRole("button", { name: "Quick Note" }).click();
    },
  },

  // 3. Quest workspace: the performance, with the construct's avatar, and
  // the spaces.
  {
    view: "quest",
    state: "performance",
    account: "typical",
    path: quest(QUEST_LEARN),
    frame: "page",
    measure: true,
  },
  {
    view: "quest",
    state: "task-space",
    account: "typical",
    path: quest(QUEST_LEARN),
    frame: "page",
    async prepare({ page }: ViewPage): Promise<void> {
      await page.getByRole("link", { name: "Tasks", exact: true }).click();
    },
  },
  {
    view: "quest",
    state: "plain-space",
    account: "typical",
    path: quest(QUEST_LEARN),
    frame: "page",
    async prepare({ page }: ViewPage): Promise<void> {
      await page.getByRole("link", { name: "Ideas", exact: true }).click();
    },
  },
  {
    view: "quest",
    state: "completed",
    account: "typical",
    path: quest(QUEST_DONE),
    frame: "page",
  },
  {
    view: "quest",
    state: "crowded",
    account: "crowded",
    path: quest(CROWDED_QUEST),
    frame: "page",
  },

  // 7. Overlays: the row action menu, a destructive confirmation dialog and
  // the phone drawer.
  {
    view: "quest",
    state: "timer-drawer",
    account: "typical",
    path: quest(QUEST_LEARN),
    frame: "window",
    only: "phone",
    prepare: openTimerPanel,
  },

  // 4. Ritebook list and the rite editor.
  {
    view: "grimoire",
    state: "list",
    account: "typical",
    path: "/grimoire",
    frame: "page",
    measure: true,
  },
  {
    view: "rite",
    state: "editor",
    account: "typical",
    path: rite(RITE),
    frame: "page",
    measure: true,
  },
  {
    view: "rite",
    state: "crowded",
    account: "crowded",
    path: rite(CROWDED_RITE),
    frame: "page",
  },

  // 5. Timer setup and a running timer.
  {
    view: "timer",
    state: "setup",
    account: "typical",
    path: "/timer",
    frame: "page",
    measure: true,
  },
  {
    view: "timer",
    state: "running-work",
    account: "typical",
    path: runningTimer,
    frame: "page",
    measure: true,
  },

  // 6. Settings with the appearance swatches, resting and selected, with
  // keyboard focus and with the tooltip (site-panel--open has the same
  // swatches), and Profile with experience and circles.
  {
    view: "settings",
    state: "default",
    account: "typical",
    path: "/settings",
    frame: "page",
    measure: true,
  },
  {
    view: "settings",
    state: "swatch-focus",
    account: "typical",
    path: "/settings",
    frame: "page",
    async prepare({ page }: ViewPage): Promise<void> {
      await tabTo(page, "main .theme-choice-input");
    },
  },
  {
    view: "settings",
    state: "swatch-tooltip",
    account: "typical",
    path: "/settings",
    frame: "page",
    async prepare({ page }: ViewPage): Promise<void> {
      await page.locator("main .panel-mode").last().hover();
    },
  },
  {
    view: "profile",
    state: "experience",
    account: "typical",
    path: "/profile",
    frame: "page",
    measure: true,
  },
  {
    view: "profile",
    state: "crowded",
    account: "crowded",
    path: "/profile",
    frame: "page",
  },
  {
    view: "construct",
    state: "vellum",
    account: "typical",
    path: "/constructs/vellum",
    frame: "page",
  },
];

export type {
  Layout,
  ViewAccount,
  ViewFinder,
  ViewFrame,
  ViewPage,
  ViewPath,
  VisualView,
};
export { layoutOf, VIEWS, viewName };
