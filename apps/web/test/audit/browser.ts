import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, devices, type Page } from "@playwright/test";
import type {
  Browser,
  CDPSession,
  Page as LighthousePage,
} from "puppeteer-core";
import { z } from "zod";
import { watchPageProblems } from "../support/page-problems.ts";
import type { Profile } from "./options.ts";

interface AuditBrowser {
  readonly page: Page;
  readonly lighthousePage: LighthousePage;
  readonly network: CDPSession;
  readonly problems: readonly string[];
  readonly version: string;
}

async function withAuditBrowser(
  profile: Profile,
  baseUrl: string,
  clientAddress: string,
  audit: (browser: AuditBrowser) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "project-buddy-chromium-"));
  try {
    let device = devices["Desktop Chrome"];
    if (profile === "phone") {
      device = devices["Pixel 7"];
    }
    const context = await chromium.launchPersistentContext(directory, {
      ...device,
      channel: "chromium",
      baseURL: baseUrl,
      args: ["--remote-debugging-port=0"],
      extraHTTPHeaders: { "x-forwarded-for": clientAddress },
    });
    let puppeteer: Browser | undefined;
    try {
      const problems = watchPageProblems(context);
      const [page] = context.pages();
      const address = await readFile(
        join(directory, "DevToolsActivePort"),
        "utf8",
      );
      const [port] = address.split("\n");
      const { connect } = await import("puppeteer-core");
      puppeteer = await connect({
        browserURL: `http://127.0.0.1:${z.coerce.number().int().positive().parse(port)}`,
        defaultViewport: null,
      });
      const [lighthousePage, extraPage] = await puppeteer.pages();
      if (
        page === undefined ||
        lighthousePage === undefined ||
        extraPage !== undefined
      ) {
        throw new Error("browser check: expected one shared Chromium tab");
      }
      await audit({
        page,
        lighthousePage,
        network: await lighthousePage.createCDPSession(),
        problems,
        version: await puppeteer.version(),
      });
    } finally {
      await puppeteer?.disconnect();
      await context.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

export { withAuditBrowser };
