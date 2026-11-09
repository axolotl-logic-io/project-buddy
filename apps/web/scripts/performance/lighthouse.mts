import { writeFile } from "node:fs/promises";
import lighthouse, { startFlow } from "lighthouse";
import type Result from "lighthouse/types/lhr/lhr.js";
import type LighthousePuppeteer from "lighthouse/types/puppeteer.js";
import { type Browser, Page } from "puppeteer-core";
import { z } from "zod";
import {
  type CaptureOptions,
  type Fixture,
  probe,
  route,
  visible,
} from "./capture.mts";
import { primaryPresent } from "./observe.mts";

// Lighthouse 12 bundles Puppeteer 22 while the matrix pins Puppeteer 24.
// Both expose the same CDP Page contract; their private TypeScript brands differ.
// Validate the actual Page instance at this single third-party adapter boundary.
const LIGHTHOUSE_PAGE = z.custom<LighthousePuppeteer.Page>(
  (input) =>
    input instanceof Page &&
    !input.isClosed() &&
    typeof input.url() === "string",
);

function reduce(report: Result): Readonly<Record<string, unknown>> {
  if (
    report.runtimeError !== undefined ||
    report.runWarnings.length > 0 ||
    Object.values(report.audits).some(
      (audit) => audit.scoreDisplayMode === "error",
    )
  ) {
    throw new Error("Lighthouse audit failed or warned");
  }
  return {
    version: report.lighthouseVersion,
    mode: report.gatherMode,
    throttlingMethod: report.configSettings.throttlingMethod,
    formFactor: report.configSettings.formFactor,
    throttling: report.configSettings.throttling,
    audits: Object.fromEntries(
      Object.entries(report.audits).map(([key, audit]) => [
        key,
        {
          score: audit.score,
          value: audit.numericValue,
          unit: audit.numericUnit,
        },
      ]),
    ),
  };
}
async function authenticated(
  page: Page,
  base: string,
  path: string,
  name: string,
): Promise<void> {
  const response = await page.goto(base + path, {
    waitUntil: "domcontentloaded",
  });
  if (response === null || !response.ok() || page.url() !== base + path) {
    throw new Error("Invalid Lighthouse authenticated destination");
  }
  await page.waitForFunction(primaryPresent, {}, name);
}
async function captureLighthouse(
  browser: Browser,
  fixture: Fixture,
  options: CaptureOptions,
): Promise<void> {
  const context = browser.defaultBrowserContext();
  const page = await context.newPage();
  try {
    const auditPage = LIGHTHOUSE_PAGE.parse(page);
    await context.setCookie({
      name: "session",
      value: fixture.populated,
      domain: new URL(options.base).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    const port = Number(new URL(browser.wsEndpoint()).port);
    const navigationReports: unknown[] = [];
    const flowReports: unknown[] = [];
    async function navigation(
      sample: number,
      name: string,
      path: string,
    ): Promise<void> {
      await authenticated(page, options.base, path, name);
      const result = await lighthouse(options.base + path, {
        port,
        disableStorageReset: true,
        output: "json",
        logLevel: "silent",
        onlyCategories: ["performance"],
      });
      if (
        result === undefined ||
        result.lhr.finalDisplayedUrl !== options.base + path ||
        result.lhr.requestedUrl !== options.base + path
      ) {
        throw new Error("Lighthouse redirected or failed");
      }
      await page.waitForFunction(primaryPresent, {}, name);
      navigationReports.push({
        sample,
        path: route(path),
        authenticated: true,
        cache: "authenticated warm assets; storage reset disabled",
        ...reduce(result.lhr),
      });
      await writeFile(
        `${options.output}/lighthouse.json`,
        JSON.stringify(navigationReports, null, 2),
      );
    }
    async function sampleFlow(sample: number): Promise<void> {
      if (sample > options.samples) {
        return;
      }
      await navigation(sample, "home", "/home");
      await navigation(sample, "long-adventure", `/chats/${fixture.chat}`);
      await authenticated(page, options.base, "/home", "home");
      await probe(page, "home");
      const sourceDocument = await page.evaluate(() => performance.timeOrigin);
      const session = await auditPage.createCDPSession();
      await session.send("Runtime.enable");
      await session.detach();
      const flow = await startFlow(auditPage, {
        name: "Authenticated Home to Quests",
      });
      await flow.startTimespan();
      await (await visible(page, 'a[href="/projects"]')).click();
      await page.waitForFunction(() => location.pathname === "/projects");
      await page.waitForFunction(primaryPresent, {}, "quests");
      if (
        page.url() !== `${options.base}/projects` ||
        (await page.evaluate(() => performance.timeOrigin)) !== sourceDocument
      ) {
        throw new Error("Lighthouse flow redirected");
      }
      await flow.endTimespan();
      const result = await flow.createFlowResult();
      flowReports.push(
        ...result.steps.map((step) => ({
          sample,
          source: "/home",
          destination: "/projects",
          authenticated: true,
          scope:
            "Source Home document can contribute lifetime metrics; flow CLS is not an independent transition metric",
          ...reduce(step.lhr),
        })),
      );
      await writeFile(
        `${options.output}/lighthouse-flow.json`,
        JSON.stringify(flowReports, null, 2),
      );
      await sampleFlow(sample + 1);
    }
    await sampleFlow(1);
  } catch (error) {
    await writeFile(
      `${options.output}/lighthouse-failure.json`,
      JSON.stringify({ reason: "audit-failed-or-redirected", complete: false }),
    );
    throw new Error("Lighthouse failed; partial reports retained", {
      cause: error,
    });
  } finally {
    await page.close();
  }
}

export { captureLighthouse };
