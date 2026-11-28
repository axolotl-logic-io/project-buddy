import { expect, type Page } from "@playwright/test";
import { test } from "../system/fixtures.ts";
import { logIn } from "../system/log-in.ts";
import { waitForHydrated } from "../system/page-helpers.ts";
import { ACTIONS, seedAction } from "./actions.ts";
import { withAuditBrowser } from "./browser.ts";
import { ACTION, type ActionName, PROFILE } from "./options.ts";
import { type Case, keepReport, reportSample, type Sample } from "./results.ts";
import { auditRun } from "./run-options.ts";

type AuditBrowser = Parameters<Parameters<typeof withAuditBrowser>[3]>[0];

const CLICK_MARK = "performance-audit-click";
const INTERACTION_WAIT_MS = 1000;
const run = auditRun();

async function measureOutcome(page: Page): Promise<number> {
  return await page.evaluate(async (label) => {
    // The assertion has found the result. Allow the browser to paint it.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    const mark = performance.getEntriesByName(label, "mark").at(-1);
    if (mark === undefined) {
      throw new Error("The action click was not recorded");
    }
    return performance.now() - mark.startTime;
  }, CLICK_MARK);
}

// The Event Timing option the DOM types lack: the shortest event, in ms,
// reported to an observer, 16 at the least. The default is 104.
interface EventObserverInit extends PerformanceObserverInit {
  readonly durationThreshold: number;
}

// Chrome reports an interaction once the frame after it is presented, and
// a fast outcome can come before that. Lighthouse finds no interaction in a
// timespan ended sooner, so wait for the click's report, or for a while
// where the click was too short to be reported to an observer.
async function interactionReported(page: Page): Promise<void> {
  await page.evaluate(
    async ({ label, waitMs }) => {
      const mark = performance.getEntriesByName(label, "mark").at(-1);
      const after = mark?.startTime ?? 0;
      await new Promise<void>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const reported = list
            .getEntries()
            .some(
              (entry) => entry.name === "click" && entry.startTime >= after,
            );
          if (reported) {
            observer.disconnect();
            resolve();
          }
        });
        const init: EventObserverInit = {
          type: "event",
          buffered: true,
          durationThreshold: 16,
        };
        observer.observe(init);
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, waitMs);
      });
    },
    { label: CLICK_MARK, waitMs: INTERACTION_WAIT_MS },
  );
}

async function measure(
  browser: AuditBrowser,
  sample: Sample,
  result: Case,
  action: ActionName,
): Promise<void> {
  const { page, lighthousePage } = browser;
  const { [action]: scenario } = ACTIONS;
  const { target, outcome } = await scenario.prepare(page);
  await waitForHydrated(target);
  await expect(target).toBeEnabled();
  await target.evaluate((node, label) => {
    function record(event: Event): void {
      performance.mark(label, { startTime: event.timeStamp });
    }
    node.addEventListener("click", record, { capture: true, once: true });
  }, CLICK_MARK);

  const { defaultConfig, desktopConfig, startTimespan } = await import(
    "lighthouse"
  );
  let config = desktopConfig;
  if (sample.profile === "phone") {
    config = defaultConfig;
  }
  const timespan = await startTimespan(lighthousePage, {
    config,
    flags: {
      onlyAudits: ["interaction-to-next-paint", "cumulative-layout-shift"],
      throttlingMethod: "provided",
      screenEmulation: { disabled: true },
      emulatedUserAgent: false,
      disableStorageReset: true,
      disableFullPageScreenshot: true,
    },
  });
  try {
    await target.click();
    await outcome();
    Object.assign(result.numbers, { outcomeMs: await measureOutcome(page) });
    await interactionReported(page);
  } finally {
    await keepReport(sample, result, await timespan.endTimespan(), page.url());
  }
}

for (const action of ACTION.options.filter(
  (name) => run.action === undefined || name === run.action,
)) {
  for (const profile of PROFILE.options.filter(
    (name) => run.profile === undefined || name === run.profile,
  )) {
    for (let number = 1; number <= run.samples; number += 1) {
      const index = number;
      test(`${action} / ${profile} / sample ${index}`, async ({
        testData,
        clientAddress,
        baseURL: baseUrl,
      }, testInfo) => {
        const { [action]: scenario } = ACTIONS;
        const result: Case = { name: action, numbers: {}, failures: [] };
        const sample: Sample = {
          page: scenario.page,
          profile,
          sample: index,
          cases: [result],
          failures: [],
        };
        try {
          if (baseUrl === undefined) {
            throw new Error("The audit needs the system server address");
          }
          const path = await seedAction(action, testData, testData.account.id);
          await withAuditBrowser(
            profile,
            baseUrl,
            clientAddress,
            async (browser) => {
              const { page, version, problems } = browser;
              sample.browser = version;
              try {
                await logIn(page, testData.account);
                if (path !== "/") {
                  await page.goto(path);
                }
                await expect(page).toHaveURL(new URL(path, baseUrl).href);
                await measure(browser, sample, result, action);
              } finally {
                sample.failures.push(...problems);
              }
            },
          );
        } catch (problem) {
          result.failures.push(String(problem));
        }
        const failures = await reportSample(sample, testInfo);
        expect(failures, "audit run checks").toStrictEqual([]);
      });
    }
  }
}
