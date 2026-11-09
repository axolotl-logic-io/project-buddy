import { writeFile } from "node:fs/promises";
import lighthouse, { startFlow } from "lighthouse";
import {
  screenEmulationMetrics,
  userAgents,
} from "lighthouse/core/config/constants.js";
import type LighthousePuppeteer from "lighthouse/types/puppeteer.js";
import { type Browser, type Frame, Page } from "puppeteer-core";
import { z } from "zod";
import {
  type CaptureOptions,
  type Fixture,
  probe,
  route,
  stateContent,
  visible,
} from "./capture.mts";
import { verifiedNavigation, verifiedTimespan } from "./lighthouse-evidence.ts";
import { primaryPresent, statePresent } from "./observe.mts";

// Lighthouse 12.8.2 nests its own puppeteer-core (24.43.1) while the matrix
// pins 24.12.1 at the root; the manifest records both installed versions.
// Their Page classes share the CDP contract but carry different private
// TypeScript brands. Validate the actual Page instance at this single
// third-party adapter boundary, and hand Lighthouse that same page.
const LIGHTHOUSE_PAGE = z.custom<LighthousePuppeteer.Page>(
  (input) =>
    input instanceof Page &&
    !input.isClosed() &&
    typeof input.url() === "string",
);

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
function viewport(): string {
  return `${innerWidth}x${innerHeight}@${devicePixelRatio}`;
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
    // The timespan's emulation is Lighthouse's own mobile profile, applied
    // before any source page loads so the measured interval never resizes.
    const metrics = screenEmulationMetrics.mobile;
    await page.setViewport({
      width: metrics.width,
      height: metrics.height,
      deviceScaleFactor: metrics.deviceScaleFactor,
      isMobile: metrics.mobile,
      hasTouch: metrics.mobile,
    });
    await page.setUserAgent(userAgents.mobile);
    const navigationReports: unknown[] = [];
    const flowReports: unknown[] = [];
    async function navigation(
      sample: number,
      name: "home" | "long-adventure",
      path: string,
    ): Promise<void> {
      const url = options.base + path;
      await authenticated(page, options.base, path, name);
      const sourceTimeOrigin = await page.evaluate(
        () => performance.timeOrigin,
      );
      const mainFrameUrls: string[] = [];
      function committed(frame: Frame): void {
        if (frame === page.mainFrame()) {
          mainFrameUrls.push(frame.url());
        }
      }
      const content = stateContent("populated", name, fixture);
      page.on("framenavigated", committed);
      let result: Awaited<ReturnType<typeof lighthouse>>;
      let auditedTimeOrigin = 0;
      try {
        result = await lighthouse(
          url,
          {
            disableStorageReset: true,
            output: "json",
            logLevel: "silent",
            onlyCategories: ["performance"],
            // Its gatherer leaves the audited document for another page and
            // back, so the tab might no longer hold the audited document.
            skipAudits: ["bf-cache"],
          },
          undefined,
          auditPage,
        );
        auditedTimeOrigin = await page.evaluate(() => performance.timeOrigin);
        // The audited document must show its content; a later document
        // would make this check describe something Lighthouse never saw.
        await page.waitForFunction(primaryPresent, {}, name);
        await page.waitForFunction(statePresent, {}, content);
      } finally {
        page.off("framenavigated", committed);
      }
      navigationReports.push(
        verifiedNavigation(
          result?.lhr,
          {
            url,
            sourceTimeOrigin,
            auditedTimeOrigin,
            checkedTimeOrigin: await page.evaluate(
              () => performance.timeOrigin,
            ),
            mainFrameUrls,
            pageUrl: page.url(),
            content: await page.evaluate(statePresent, content),
          },
          { sample, path: route(path), content: content.check },
        ),
      );
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
      const sourceTimeOrigin = await page.evaluate(
        () => performance.timeOrigin,
      );
      const session = await auditPage.createCDPSession();
      await session.send("Runtime.enable");
      await session.detach();
      const flow = await startFlow(auditPage, {
        name: "Authenticated Home to Quests",
      });
      const viewportBeforeTimespan = await page.evaluate(viewport);
      await flow.startTimespan();
      const viewportInTimespan = await page.evaluate(viewport);
      await (await visible(page, 'a[href="/projects"]')).click();
      await page.waitForFunction(() => location.pathname === "/projects");
      await page.waitForFunction(primaryPresent, {}, "quests");
      const content = stateContent("populated", "quests", fixture);
      const witness = {
        url: `${options.base}/projects`,
        viewportBeforeTimespan,
        viewportInTimespan,
        sourceTimeOrigin,
        destinationTimeOrigin: await page.evaluate(
          () => performance.timeOrigin,
        ),
        pageUrl: page.url(),
        content: await page.evaluate(statePresent, content),
      };
      await flow.endTimespan();
      const result = await flow.createFlowResult();
      if (result.steps.length !== 1) {
        throw new Error("Lighthouse flow has an unexpected step count");
      }
      flowReports.push(
        ...result.steps.map((step) =>
          verifiedTimespan(step.lhr, witness, {
            sample,
            content: content.check,
          }),
        ),
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
      JSON.stringify({ reason: "audit-failed-or-unverified", complete: false }),
    );
    throw new Error("Lighthouse failed; partial reports retained", {
      cause: error,
    });
  } finally {
    await page.close();
  }
}

export { captureLighthouse };
