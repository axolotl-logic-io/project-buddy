import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
} from "@playwright/test";
import type lighthouse from "lighthouse";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { test } from "../system/fixtures.ts";
import { logIn } from "../system/log-in.ts";
import { waitForHydrated } from "../system/page-helpers.ts";
import { withAuditBrowser } from "./browser.ts";
import {
  loadWindow,
  observePageChange,
  recordNetwork,
} from "./observations.ts";
import { PAGE, PROFILE } from "./options.ts";
import { auditPages, checkContent, openSitePanel, seedPages } from "./pages.ts";
import {
  type Case,
  lighthouseNumbers,
  lighthouseProblems,
  type Report,
  type Sample,
} from "./results.ts";
import { auditRun } from "./run-options.ts";

const PAGE_CHANGE_TIMEOUT_MS = 10_000;
type Flags = NonNullable<Parameters<typeof lighthouse>[1]>;

const run = auditRun();

async function goto(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  if (
    response?.ok() !== true ||
    page.url() !== url ||
    response.request().redirectedFrom() !== null
  ) {
    throw new Error(
      `address check: expected ${url}, browser ended at ${page.url()} (status ${response?.status() ?? "unknown"})`,
    );
  }
}

function reportName(sample: Sample, result: Case): string {
  return `${sample.page}-${sample.profile}-${sample.sample}-${result.name}.json`;
}

async function keepReport(
  sample: Sample,
  result: Case,
  report: Report | undefined,
  url: string,
): Promise<void> {
  if (report === undefined) {
    throw new Error("Lighthouse returned no report");
  }
  const { lhr } = report;
  result.report = reportName(sample, result);
  await writeFile(join(run.directory, result.report), JSON.stringify(lhr));
  lighthouseNumbers(lhr, result);
  result.failures.push(...lighthouseProblems(lhr, url));
}

async function measure(
  browser: Parameters<Parameters<typeof withAuditBrowser>[3]>[0],
  sample: Sample,
  origin: string,
  seed: Awaited<ReturnType<typeof seedPages>>,
): Promise<void> {
  const { page, lighthousePage, network, problems } = browser;
  const target = auditPages(seed)[sample.page];
  const url = new URL(target.path, origin).href;
  const { defaultConfig, desktopConfig, navigation, snapshot, startTimespan } =
    await import("lighthouse");
  let config = desktopConfig;
  if (sample.profile === "phone") {
    config = defaultConfig;
  }
  const flags: Flags = {
    onlyCategories: ["performance", "accessibility", "best-practices"],
    skipAudits: ["bf-cache"],
    output: "json",
    disableStorageReset: true,
    disableFullPageScreenshot: true,
    screenEmulation: { disabled: true },
    emulatedUserAgent: false,
    // Navigation uses Lighthouse's standard simulation. The real browser's
    // transfers and input timings are measured separately.
    throttlingMethod: "simulate",
  };
  if (target.signedOut === true) {
    flags.onlyCategories?.push("seo");
  }
  const traffic = await recordNetwork(network);

  async function runCase(
    name: Case["name"],
    address: string,
    action: (result: Case) => Promise<void>,
  ): Promise<void> {
    const result: Case = { name, numbers: {}, failures: [] };
    sample.cases.push(result);
    traffic.clear();
    const priorProblems = problems.length;
    const redirects: string[] = [];
    function documentRequest(request: Request): void {
      const from = request.redirectedFrom();
      if (request.isNavigationRequest() && from !== null) {
        redirects.push(`${from.url()} → ${request.url()}`);
      }
    }
    page.on("request", documentRequest);
    try {
      await action(result);
      if (page.url() !== address) {
        throw new Error(
          `address check: expected ${address}, browser ended at ${page.url()}`,
        );
      }
      await checkContent(page, sample.page, target, seed);
    } catch (problem) {
      result.failures.push(String(problem));
    } finally {
      page.off("request", documentRequest);
      result.failures.push(
        ...redirects.map((redirect) => `redirect check: ${redirect}`),
      );
      result.failures.push(...problems.slice(priorProblems));
    }
  }

  await runCase("cold", url, async (result) => {
    // End requests from sign-in before clearing the cache for the cold load.
    await page.goto("about:blank");
    await network.send("Network.clearBrowserCache");
    await keepReport(
      sample,
      result,
      await navigation(lighthousePage, url, { config, flags }),
      url,
    );
    Object.assign(result.numbers, traffic.bytes(await loadWindow(page)));
  });
  await runCase("warm", url, async (result) => {
    await keepReport(
      sample,
      result,
      await navigation(lighthousePage, url, { config, flags }),
      url,
    );
    Object.assign(result.numbers, traffic.bytes(await loadWindow(page)));
  });

  const destination = target.change.to ?? target;
  const end = new URL(destination.path, origin).href;
  await runCase("change", url, async (result) => {
    result.change = { from: target.change.from, to: destination.path };
    await goto(page, new URL(target.change.from, origin).href);
    if (target.change.panel === true) {
      await openSitePanel(page);
    }
    const link = page
      .getByRole("link", { name: target.change.link, exact: true })
      .first();
    await waitForHydrated(link);
    const observer = await observePageChange(
      link,
      SITE_COPY.breadcrumbs,
      SITE_COPY.loading,
    );
    try {
      // Lighthouse exposes accessibility and SEO on navigation and snapshot.
      const onlyCategories =
        flags.onlyCategories?.filter((id) => {
          const { [id]: category } = defaultConfig.categories ?? {};
          return category?.supportedModes?.includes("timespan") === true;
        }) ?? [];
      const timespan = await startTimespan(lighthousePage, {
        flags: { ...flags, onlyCategories, throttlingMethod: "provided" },
      });
      try {
        await link.click();
        await page.waitForURL(end, { timeout: PAGE_CHANGE_TIMEOUT_MS });
        await expect(
          destination.marker(page),
          "page change destination check",
        ).toBeVisible();
        const observation = await observer.finish(end);
        Object.assign(
          result.numbers,
          observation.numbers,
          traffic.bytes(observation),
        );
      } finally {
        await keepReport(sample, result, await timespan.endTimespan(), end);
        if (await observer.viewportChanged()) {
          result.failures.push(
            "viewport check: viewport changed during the timespan",
          );
        }
      }
    } finally {
      await observer.close();
    }
    if (end !== url) {
      await checkContent(page, "home", auditPages(seed).home, seed);
      await goto(page, url);
    }
  });

  await runCase("snapshot", url, async (result) => {
    await goto(page, url);
    if (target.dialog === undefined) {
      await keepReport(
        sample,
        result,
        await snapshot(lighthousePage, {
          config,
          flags: { ...flags, throttlingMethod: "provided" },
        }),
        url,
      );
      return;
    }
    const open = page.getByRole("button", { name: target.dialog, exact: true });
    await waitForHydrated(open);
    await open.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog, "snapshot state check").toBeVisible();
    await keepReport(
      sample,
      result,
      await snapshot(lighthousePage, {
        config,
        flags: { ...flags, throttlingMethod: "provided" },
      }),
      url,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
}

async function signIn(
  context: BrowserContext,
  page: Page,
  account: Parameters<typeof logIn>[1],
): Promise<void> {
  try {
    await logIn(page, account);
  } catch (problem) {
    throw new Error(
      `session check: sign-in did not reach Home (${page.url()})`,
      { cause: problem },
    );
  }
  expect(
    await context.cookies(),
    "session check: expected a cookie after sign-in",
  ).not.toHaveLength(0);
}

const signedOutPages = new Set(["login", "signup", "credits"]);
for (const pageName of PAGE.options.filter(
  (name) => run.page === undefined || name === run.page,
)) {
  for (const profile of PROFILE.options.filter(
    (name) => run.profile === undefined || name === run.profile,
  )) {
    for (let index = 1; index <= run.samples; index += 1) {
      const number = index;
      test(`${pageName} / ${profile} / sample ${number}`, async ({
        testData,
        clientAddress,
        baseURL,
      }, testInfo) => {
        const sample: Sample = {
          page: pageName,
          profile,
          sample: number,
          cases: [],
          failures: [],
        };
        try {
          if (baseURL === undefined) {
            throw new Error("The audit needs the system server address");
          }
          const seed = await seedPages(testData);
          await withAuditBrowser(
            profile,
            baseURL,
            clientAddress,
            async (browser) => {
              sample.browser = browser.version;
              try {
                if (!signedOutPages.has(pageName)) {
                  await signIn(
                    browser.page.context(),
                    browser.page,
                    testData.account,
                  );
                }
                await measure(browser, sample, baseURL, seed);
              } finally {
                const recorded = new Set(
                  sample.cases.flatMap(
                    ({ failures: caseFailures }) => caseFailures,
                  ),
                );
                sample.failures.push(
                  ...browser.problems.filter(
                    (problem) => !recorded.has(problem),
                  ),
                );
              }
            },
          );
        } catch (problem) {
          sample.failures.push(String(problem));
        } finally {
          await testInfo.attach("audit-sample", {
            body: JSON.stringify(sample),
            contentType: "application/json",
          });
        }
        const runFailures = [
          ...sample.failures,
          ...sample.cases.flatMap(({ name, failures }) =>
            failures.map((failure) => `${name}: ${failure}`),
          ),
        ];
        expect(runFailures, "audit run checks").toStrictEqual([]);
      });
    }
  }
}
