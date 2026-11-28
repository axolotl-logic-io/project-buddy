// Content stays still while the user acts and moves between the signed-in
// pages, in the built site, where only the real App Router and server show
// when each change lands. Chrome reports every layout shift to a
// PerformanceObserver; shifts right after input count too, as they do in a
// Lighthouse timespan. Only a list item an action adds may move what comes
// after it in its own list.

import {
  devices,
  type ElementHandle,
  expect,
  type JSHandle,
  type Locator,
  type Page,
} from "@playwright/test";
import { z } from "zod";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { ACTIONS, seedAction } from "../audit/actions.ts";
import {
  ACTION,
  type ActionName,
  PAGE,
  type PageName,
} from "../audit/options.ts";
import { auditPages, openSitePanel, seedPages } from "../audit/pages.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { waitForHydrated } from "./page-helpers.ts";

// The largest shift allowed: a fraction of a pixel's move.
const MOST_SHIFT = 0.001;
// How much of a moved element a failure shows.
const SHOWN_LENGTH = 160;

const SIGNED_IN_PAGES: readonly PageName[] = PAGE.exclude([
  "login",
  "signup",
  "credits",
]).options;

type Device = Parameters<typeof test.use>[0];

// Home's Tasks.
function homeTasks(page: Page): Locator {
  // A dialog, such as Quick Add's, hides the page from assistive technology.
  return page.getByRole("region", {
    name: HOME_COPY.tasksHeading,
    exact: true,
    includeHidden: true,
  });
}

// The list each action adds a list item to, where the list item moves what
// follows it. Quick Add adds at the top of the chosen list, here under Home's
// Tasks, and Undo puts the task checked off back in its place there.
const ADDS_TO: Partial<Record<ActionName, (page: Page) => Locator>> = {
  "quick-add-task": homeTasks,
  "undo-task-check-off": homeTasks,
};

// The audit's profiles, without the browser type that a describe can't set.
function profileOf(name: "Desktop Chrome" | "Pixel 7"): Device {
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } =
    devices[name];
  return { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent };
}

const VIEWPORTS: Record<string, Device> = {
  desktop: profileOf("Desktop Chrome"),
  phone: profileOf("Pixel 7"),
};

const SHIFT = z.object({
  value: z.number(),
  hadRecentInput: z.boolean(),
  moved: z.array(z.string()),
});
type Shift = z.infer<typeof SHIFT>;

interface Recorder {
  readonly since: number;
  readonly entries: PerformanceEntry[];
  readonly observer: PerformanceObserver;
}

// Starts recording the page's layout shifts from now on.
async function recordShifts(page: Page): Promise<JSHandle<Recorder>> {
  return await page.evaluateHandle(() => {
    const entries: PerformanceEntry[] = [];
    const observer = new PerformanceObserver((list) => {
      entries.push(...list.getEntries());
    });
    observer.observe({ type: "layout-shift", buffered: true });
    return { since: performance.now(), entries, observer };
  });
}

// The shifts recorded so far, once the page has painted its last change,
// each with the elements it moved outside the list an action added to.
async function recordedShifts(
  recorder: JSHandle<Recorder>,
  list: ElementHandle | null,
): Promise<readonly Shift[]> {
  const shifts: unknown = await recorder.evaluate(
    async ({ since, entries, observer }, { shownLength, addedTo }) => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      entries.push(...observer.takeRecords());
      observer.disconnect();
      interface LayoutShift extends PerformanceEntry {
        readonly value: number;
        readonly hadRecentInput: boolean;
        readonly sources: readonly {
          readonly node: Node | null;
          readonly previousRect: DOMRectReadOnly;
          readonly currentRect: DOMRectReadOnly;
        }[];
      }
      function isShift(entry: PerformanceEntry): entry is LayoutShift {
        return entry.entryType === "layout-shift";
      }
      function box({ x, y, width, height }: DOMRectReadOnly): string {
        return `${x},${y} ${width}×${height}`;
      }
      function shown({
        node,
        previousRect,
        currentRect,
      }: LayoutShift["sources"][number]): string {
        let what = node?.textContent?.slice(0, shownLength) ?? "(gone)";
        if (node instanceof Element) {
          what = node.outerHTML.slice(0, shownLength);
        }
        return `${box(previousRect)} to ${box(currentRect)}: ${what}`;
      }
      function outside({ node }: LayoutShift["sources"][number]): boolean {
        return addedTo === null || node === null || !addedTo.contains(node);
      }
      return entries
        .filter(isShift)
        .filter(({ startTime }) => startTime >= since)
        .filter(({ sources }) => sources.some(outside))
        .map(({ value, hadRecentInput, sources }) => ({
          value,
          hadRecentInput,
          moved: sources.map(shown),
        }));
    },
    { shownLength: SHOWN_LENGTH, addedTo: list },
  );
  return z.array(SHIFT).parse(shifts);
}

// Resolves once every request the page started since this call has
// finished, so the server's answer to an action has landed.
function requestsSettle(page: Page): () => Promise<void> {
  const open = new Set<unknown>();
  let settled = Promise.withResolvers<void>();
  settled.resolve();
  function opened(request: unknown): void {
    if (open.size === 0) {
      settled = Promise.withResolvers<void>();
    }
    open.add(request);
  }
  function closed(request: unknown): void {
    open.delete(request);
    if (open.size === 0) {
      settled.resolve();
    }
  }
  page.on("request", opened);
  page.on("requestfinished", closed);
  page.on("requestfailed", closed);
  return async (): Promise<void> => {
    await settled.promise;
    page.off("request", opened);
    page.off("requestfinished", closed);
    page.off("requestfailed", closed);
  };
}

// Clicks target and records the layout shifts until shown has happened and
// the page's requests have settled, but for those only within addedTo.
async function shiftsOf(
  page: Page,
  target: Locator,
  shown: () => Promise<void>,
  addedTo?: Locator,
): Promise<readonly Shift[]> {
  await waitForHydrated(target);
  await expect(target).toBeEnabled();
  const list = (await addedTo?.elementHandle()) ?? null;
  const recorder = await recordShifts(page);
  const settle = requestsSettle(page);
  await target.click();
  await shown();
  await settle();
  return (await recordedShifts(recorder, list)).filter(
    ({ value }) => value > MOST_SHIFT,
  );
}

test.describe("use_case_content_stays_still", () => {
  for (const [profile, device] of Object.entries(VIEWPORTS)) {
    test.describe(`on a ${profile}`, () => {
      test.use(device);

      for (const action of ACTION.options) {
        test(`${action} moves nothing on the page`, async ({
          page,
          account,
          testData,
        }) => {
          const path = await seedAction(action, testData, account.id);
          await logIn(page, account);
          if (path !== "/") {
            await page.goto(path);
          }
          const { [action]: scenario } = ACTIONS;
          const { target, outcome } = await scenario.prepare(page);
          const addedTo = ADDS_TO[action]?.(page);

          expect(await shiftsOf(page, target, outcome, addedTo)).toStrictEqual(
            [],
          );
        });
      }

      for (const name of SIGNED_IN_PAGES) {
        test(`following a link to ${name} moves nothing on the page`, async ({
          page,
          account,
          testData,
        }) => {
          const seed = await seedPages(testData);
          const { [name]: target } = auditPages(seed);
          const { from, panel, link, to } = target.change;
          await logIn(page, account);
          await page.goto(from);
          if (panel === true) {
            await openSitePanel(page);
            // The panel was opened to set up the link click. Wait for its
            // entrance and the breadcrumbs to reach their starting positions.
            const trail = page.getByRole("region", { name: "Breadcrumbs" });
            await expect(trail.getByRole("dialog")).toBeVisible();
            await trail.evaluate(async (element): Promise<void> => {
              const transitions = element
                .getAnimations({ subtree: true })
                .filter((animation) => animation instanceof CSSTransition);
              await Promise.allSettled(
                transitions.map((animation) => animation.finished),
              );
            });
          }
          const destination = to ?? target;

          expect(
            await shiftsOf(
              page,
              page.getByRole("link", { name: link, exact: true }).first(),
              async () => {
                await expect(destination.marker(page)).toBeVisible();
              },
            ),
          ).toStrictEqual([]);
        });
      }
    });
  }
});
