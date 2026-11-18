// Opens a view (views.ts) in a browser, in one appearance at one width, and
// brings it to its state, for the visual comparison (compare.ts) and the
// baseline (baseline.ts). Each view gets a fresh browser context, so no
// state leaks from one to the next.
//
// Runs after npm ci.
import { setTimeout as delay } from "node:timers/promises";
import type { Browser, BrowserContext, Page, Request } from "@playwright/test";
import { THEMES, type ThemeMode } from "../../src/themes/themes.ts";
import type { SignedIn } from "./site.ts";
import {
  type Layout,
  layoutOf,
  type ViewFinder,
  type ViewFrame,
  type ViewPath,
  type VisualView,
} from "./views.ts";

// The window for each layout: overlays are captured in it, and pages are
// never shorter.
const WINDOW_HEIGHTS: Readonly<Record<Layout, number>> = {
  desktop: 900,
  phone: 780,
};
// Tall pages are captured by growing the window to the page's height, up to
// this many pixels, instead of Playwright's full-page stitching, which
// misplaces the sticky header.
const MAX_HEIGHT = 5000;
// The page is settled once no request has been in flight for QUIET_MS, as
// Playwright's network idle has it, and its finite animations have finished;
// it waits no longer than SETTLE_TIMEOUT_MS for either. Then a last pause lets
// transitions that start after layout, such as a tooltip's, finish.
const QUIET_MS = 500;
const POLL_MS = 100;
const SETTLE_TIMEOUT_MS = 15_000;
const ANIMATION_TIMEOUT_MS = 3000;
const LAST_PAUSE_MS = 300;
const NAVIGATION_TIMEOUT_MS = 120_000;
const THEME_COOKIE = "theme";
// Requests a view holds on purpose (quest--loading-reply), which never end.
const HELD_REQUESTS = /\/api\/chat/u;

// A page, and how long since it last had a request in flight.
interface WatchedPage {
  readonly page: Page;
  readonly quietFor: () => number;
}

// A view opened at one appearance and width, and what went wrong on the way.
interface OpenedView {
  readonly context: BrowserContext;
  readonly watched: WatchedPage;
  readonly status: number | undefined;
  readonly problems: string[];
}

interface ViewTarget {
  readonly origin: string;
  readonly signedIn: SignedIn | undefined;
  readonly appearance: ThemeMode;
  readonly width: number;
}

function windowHeight(width: number): number {
  return WINDOW_HEIGHTS[layoutOf(width)];
}

// Watches the page's requests, so settle can tell when they have stopped.
function watch(page: Page): WatchedPage {
  const inFlight = new Set<Request>();
  let changed = Date.now();
  function started(request: Request): void {
    if (!HELD_REQUESTS.test(request.url())) {
      inFlight.add(request);
      changed = Date.now();
    }
  }
  function ended(request: Request): void {
    inFlight.delete(request);
    changed = Date.now();
  }
  page.on("request", started);
  page.on("requestfinished", ended);
  page.on("requestfailed", ended);
  function quietFor(): number {
    if (inFlight.size > 0) {
      return 0;
    }
    return Date.now() - changed;
  }
  return { page, quietFor };
}

async function untilQuiet(
  watched: WatchedPage,
  deadline: number,
): Promise<void> {
  if (watched.quietFor() >= QUIET_MS || Date.now() > deadline) {
    return;
  }
  await delay(POLL_MS);
  await untilQuiet(watched, deadline);
}

// Waits for the page's requests to stop, its fonts to load and its finite
// animations to finish. Endless ones, such as a spinner, are left running.
async function settle(watched: WatchedPage): Promise<void> {
  await untilQuiet(watched, Date.now() + SETTLE_TIMEOUT_MS);
  await watched.page.evaluate(async (timeout: number): Promise<void> => {
    await document.fonts.ready;
    const finite = document
      .getAnimations()
      .filter(
        (animation: Animation): boolean =>
          animation.effect?.getComputedTiming().iterations !==
          Number.POSITIVE_INFINITY,
      );
    const finished = Promise.all(
      finite.map(
        (animation: Animation): Promise<unknown> =>
          animation.finished.catch((): undefined => undefined),
      ),
    );
    const late = new Promise((done: (value: unknown) => void): void => {
      setTimeout(done, timeout);
    });
    await Promise.race([finished, late]);
  }, ANIMATION_TIMEOUT_MS);
  await delay(LAST_PAUSE_MS);
}

// Removes the Next.js development overlay, which production doesn't have.
async function removeDevOverlay(page: Page): Promise<void> {
  await page.evaluate((): void => {
    for (const element of document.querySelectorAll("nextjs-portal")) {
      element.remove();
    }
  });
}

// The height the window grows to for a frame: the page's, or the quest
// sidebar's (the open drawer's on a phone), never less than the window.
async function frameHeight(
  page: Page,
  frame: ViewFrame,
  width: number,
): Promise<number> {
  const least = windowHeight(width);
  if (frame === "window") {
    return least;
  }
  const height: number = await page.evaluate((sidebarOnly: boolean): number => {
    const drawer = document.querySelector(".quest-sidebar-frame:modal");
    const sidebar = document.querySelector(".quest-sidebar");
    if (sidebarOnly && drawer !== null) {
      return drawer.scrollHeight;
    }
    if (sidebarOnly && sidebar !== null) {
      return sidebar.getBoundingClientRect().top + sidebar.scrollHeight;
    }
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
  }, frame === "sidebar");
  return Math.min(Math.max(Math.ceil(height), least), MAX_HEIGHT);
}

// Grows the window to the frame's height.
async function fitFrame(
  watched: WatchedPage,
  frame: ViewFrame,
  width: number,
): Promise<void> {
  const height = await frameHeight(watched.page, frame, width);
  if (height !== windowHeight(width)) {
    await watched.page.setViewportSize({ width, height });
    await settle(watched);
  }
}

// A fresh browser context for the target's account, in its appearance, with
// the desktop site panel docked or closed.
async function viewContext(
  browser: Browser,
  target: ViewTarget,
  docked: boolean,
): Promise<BrowserContext> {
  const { origin, signedIn, appearance, width } = target;
  const context = await browser.newContext({
    viewport: { width, height: windowHeight(width) },
  });
  context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
  const [theme] = THEMES;
  const cookies = [
    { name: THEME_COOKIE, value: `${theme.id}.${appearance}`, url: origin },
  ];
  if (signedIn !== undefined) {
    cookies.push({ ...signedIn.cookie, url: origin });
  }
  await context.addCookies(cookies);
  await context.addInitScript((isDocked: boolean): void => {
    if (isDocked) {
      localStorage.setItem("site-panel", "docked");
    } else {
      localStorage.removeItem("site-panel");
    }
  }, docked);
  return context;
}

function resolvePath(path: ViewPath, find: ViewFinder | undefined): string {
  if (typeof path === "string") {
    return path;
  }
  if (find === undefined) {
    throw new Error("A signed-out view can't look up a quest or spell.");
  }
  return path(find);
}

// An error's first line: Playwright's run to many.
function messageOf(error: unknown): string {
  let message = String(error);
  if (error instanceof Error) {
    ({ message } = error);
  }
  return message.split("\n")[0] ?? message;
}

// Opens the view for the target and brings it to its state. A step that
// fails is noted in problems and the page left as it is, so the screenshot
// shows how far it got.
async function openView(
  browser: Browser,
  view: VisualView,
  target: ViewTarget,
): Promise<OpenedView> {
  const { origin, signedIn, width } = target;
  const context = await viewContext(browser, target, view.docked === true);
  const page = await context.newPage();
  const watched = watch(page);
  const problems: string[] = [];
  page.on("pageerror", (error: Error): void => {
    problems.push(`Page error: ${messageOf(error)}`);
  });
  let status: number | undefined;
  try {
    const path = resolvePath(view.path, signedIn?.find);
    const answer = await page.goto(new URL(path, origin).href);
    status = answer?.status();
    await settle(watched);
    if (signedIn !== undefined && new URL(page.url()).pathname === "/login") {
      problems.push("The page asked to sign in.");
    }
    if (view.prepare !== undefined) {
      await view.prepare({ page, layout: layoutOf(width) });
      await settle(watched);
    }
    await removeDevOverlay(page);
    await fitFrame(watched, view.frame, width);
  } catch (error) {
    problems.push(messageOf(error));
  }
  return { context, watched, status, problems };
}

// Acts on each item in turn, each after the last has finished, and answers
// the results in order.
async function inOrder<T, R>(
  items: readonly T[],
  act: (item: T) => Promise<R>,
): Promise<R[]> {
  const [first, ...rest] = items;
  if (first === undefined) {
    return [];
  }
  const result = await act(first);
  return [result, ...(await inOrder(rest, act))];
}

export type { OpenedView, ViewTarget, WatchedPage };
export {
  fitFrame,
  inOrder,
  messageOf,
  openView,
  resolvePath,
  settle,
  viewContext,
  watch,
  windowHeight,
};
