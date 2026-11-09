import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { loadavg } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import puppeteer, {
  type Browser,
  type ElementHandle,
  type Frame,
  type Page,
} from "puppeteer-core";
import { z } from "zod";
import {
  type NetworkResource,
  parseReadinessRow,
  parseReadinessSelection,
  type ReadinessRow,
  type ReadinessSelection,
  validateReadinessRows,
  validateTrace,
} from "./artifacts.ts";
import { type CapturePhase, captureFailure } from "./capture-failure.ts";
import { initialCls } from "./metrics.ts";
import {
  observe,
  primaryPresent,
  type StateContent,
  statePresent,
} from "./observe.mts";
import type { seedAudit } from "./seed.mts";

const CONTROL_DEADLINE_MS = 15_000;
const PROBE_RESOLUTION_MS = 100;
const DOCUMENT_TIMEOUT_MS = 30_000;
const PHONE_LATENCY_MS = 150;
const PHONE_DOWNLOAD = 200_000;
const PHONE_UPLOAD = 93_750;
const PHONE_CPU_RATE = 4;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gu;
const JS_SUFFIX = /\.m?js$/u;
const FONT_SUFFIX = /\.woff2?$/u;
const CSS_SUFFIX = /\.css$/u;
const ARTWORK_SUFFIX = /\.(?:png|webp|avif|jpg|jpeg|svg)$/u;
const TRACE = z.object({
  traceEvents: z.array(
    z.object({
      name: z.string(),
      cat: z.string().optional(),
      ph: z.string().optional(),
      ts: z.number().optional(),
      dur: z.number().optional(),
      pid: z.number().optional(),
      tid: z.number().optional(),
      args: z.unknown().optional(),
    }),
  ),
});
const SNAPSHOT = z.object({
  snapshot: z.string(),
  expected_display_time: z.number().optional(),
  frame_sequence: z.number().optional(),
  source_id: z.number().optional(),
});
type Fixture = Awaited<ReturnType<typeof seedAudit>>;
interface CaptureOptions {
  base: string;
  output: string;
  browserPath: string;
  samples: number;
  selection?: ReadinessSelection;
}
function supports(
  state: ReadinessRow["state"],
  name: ReadinessRow["name"],
): boolean {
  if (state === "empty-detail") {
    return name === "quest" || name === "long-adventure";
  }
  if (state === "empty") {
    return ["home", "quests", "adventures", "activities", "workshop"].includes(
      name,
    );
  }
  return true;
}
// The content each state must show once observed: the fixture's own entity,
// the exact history size, or no owned entities for an empty account.
function stateContent(
  state: ReadinessRow["state"],
  name: ReadinessRow["name"],
  fixture: Fixture,
): StateContent {
  if (name === "long-adventure") {
    let count = fixture.counts.messages;
    if (state === "empty-detail") {
      count = fixture.counts.emptyDetailMessages;
    }
    return { check: "message-count", label: "Conversation", count };
  }
  if (name === "editor") {
    return {
      check: "edited-prompt",
      ending: fixture.counts.editedPromptEnding,
    };
  }
  if (name === "activities") {
    return { check: "built-in-activities-only" };
  }
  if (state === "empty") {
    return { check: "no-owned-entities" };
  }
  if (name === "quest" && state === "empty-detail") {
    return { check: "fixture-link", href: `/chats/${fixture.emptyChat}` };
  }
  if (name === "quest" || name === "adventures") {
    return { check: "fixture-link", href: `/chats/${fixture.chat}` };
  }
  if (name === "workshop") {
    return {
      check: "fixture-link",
      href: `/constructs/${fixture.construct}`,
    };
  }
  return { check: "fixture-link", href: `/projects/${fixture.project}` };
}
function route(path: string): string {
  return path.split("?")[0]?.replace(UUID, ":id") ?? "/other";
}
function safeResource(path: string): ReadinessRow["resources"][number]["path"] {
  const { pathname } = new URL(path);
  if (JS_SUFFIX.test(pathname)) {
    return "/_next/static/:asset.js";
  }
  if (FONT_SUFFIX.test(pathname)) {
    return "/_next/static/:asset.woff2";
  }
  if (CSS_SUFFIX.test(pathname)) {
    return "/_next/static/:asset.css";
  }
  if (ARTWORK_SUFFIX.test(pathname)) {
    return "/artwork/:asset";
  }
  const template = route(pathname);
  for (const allowed of [
    "/home",
    "/projects",
    "/projects/:id",
    "/chat",
    "/chats/:id",
    "/activities",
    "/workshop",
    "/constructs/:id",
  ] as const) {
    if (allowed === template) {
      return allowed;
    }
  }
  return "/other";
}
async function visible(
  page: Page,
  selector: string,
  position = 0,
): Promise<ElementHandle<Element>> {
  const candidates = await Promise.all(
    (await page.$$(selector)).map(
      async (element): Promise<ElementHandle<Element> | null> => {
        if (await element.isVisible()) {
          return element;
        }
        return null;
      },
    ),
  );
  const selected = candidates.filter((candidate) => candidate !== null)[
    position
  ];
  if (selected !== undefined && selected !== null) {
    return selected;
  }
  throw new Error("Expected visible control absent");
}
function confirmed(name: string, marker: string): boolean {
  if (name === "home") {
    return document.querySelector("dialog[open]") !== null;
  }
  if (name === "quests") {
    return (
      Array.from(document.querySelectorAll("button"))
        .filter((button) => button.getAttribute("role") === "tab")[1]
        ?.getAttribute("aria-selected") === "true"
    );
  }
  if (name === "editor") {
    return Object.values(localStorage).some((value) => value.includes(marker));
  }
  if (name === "long-adventure") {
    return (
      document
        .querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')
        ?.value.includes(marker) === true &&
      Array.from(document.querySelectorAll("main button")).some(
        (button) =>
          button.textContent.trim() === "Send" &&
          button instanceof HTMLButtonElement &&
          !button.disabled,
      )
    );
  }
  const dialog = document.querySelector("[role=dialog]");
  if (dialog === null) {
    return false;
  }
  return dialog.querySelector("input, select") !== null;
}
function probe(page: Page, name: string): Promise<ReadinessRow["control"]> {
  let attempts = 0;
  let firstAttempt = 0;
  const start = performance.now();
  async function attempt(): Promise<ReadinessRow["control"]> {
    if (performance.now() - start >= CONTROL_DEADLINE_MS) {
      throw new Error("Control readiness not confirmed");
    }
    attempts += 1;
    const marker = `audit-${randomUUID()}`;
    if (attempts === 1) {
      firstAttempt = await page.evaluate(() => performance.now());
    }
    if (name === "editor" || name === "long-adventure") {
      let selector = 'textarea[aria-label="Message"]';
      if (name === "editor") {
        selector = 'textarea[name="prompt"]';
      }
      const input = await visible(page, selector);
      await input.focus();
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");
      // Each probe uses exactly 42 characters, matching the #773 action cost.
      await page.keyboard.type(marker);
    } else {
      let selector = 'main button[aria-haspopup="dialog"]';
      let position = 0;
      if (name === "home") {
        selector = 'header button[aria-haspopup="dialog"]';
      }
      if (name === "quests") {
        selector = "[role=tab]";
        position = 1;
      }
      await (await visible(page, selector, position)).click();
    }
    // Fixed lab sampling resolution, never a deterministic behavior-test retry.
    await delay(PROBE_RESOLUTION_MS);
    if ((await page.evaluate(confirmed, name, marker)) === true) {
      const time = await page.evaluate(() => performance.now());
      let method: ReadinessRow["control"]["method"] = "adventure-dialog-form";
      if (name === "home") {
        method = "menu-open";
      }
      if (name === "quests") {
        method = "status-tab-state";
      }
      if (name === "editor") {
        method = "persisted-draft";
      }
      if (name === "long-adventure") {
        method = "send-enabled";
      }
      if (method === "menu-open" || method === "adventure-dialog-form") {
        await page.keyboard.press("Escape");
      }
      return { firstAttempt, confirmed: time, attempts, method };
    }
    return attempt();
  }
  return attempt();
}
async function writeGzip(
  output: string,
  name: string,
  value: unknown,
): Promise<void> {
  const path = `${output}/${name}`;
  await writeFile(path, gzipSync(JSON.stringify(value)));
  const retained: unknown = JSON.parse(
    gunzipSync(await readFile(path)).toString("utf8"),
  );
  if (name.endsWith(".trace.json.gz")) {
    validateTrace(retained, name);
  }
}
async function sanitizedTrace(
  page: Page,
  output: string,
  name: string,
): Promise<void> {
  const raw = await page.tracing.stop();
  if (raw === undefined) {
    throw new Error("Missing trace");
  }
  const { traceEvents } = TRACE.parse(
    JSON.parse(new TextDecoder().decode(raw)),
  );
  const events: z.infer<typeof TRACE>["traceEvents"] = [];
  for (const event of traceEvents) {
    const { args, ...fields } = event;
    if (event.name === "Screenshot") {
      if (name === "home.trace.json.gz" || name === "stream.trace.json.gz") {
        events.push({ ...fields, args: SNAPSHOT.parse(args) });
      }
    } else {
      events.push(fields);
    }
  }
  validateTrace({ traceEvents: events }, name);
  await writeGzip(output, name, { traceEvents: events });
}
async function captureMatrix(
  browser: Browser,
  fixture: Fixture,
  options: CaptureOptions,
): Promise<ReadinessRow[]> {
  const rows: ReadinessRow[] = [];
  let selection: ReadinessSelection | undefined;
  if (options.selection !== undefined) {
    selection = parseReadinessSelection(options.selection);
  }
  const journeys: [ReadinessRow["name"], string, string][] = [
    ["home", "/home", "/projects"],
    ["quests", "/projects", "/home"],
    ["quest", `/projects/${fixture.project}`, "/projects"],
    ["adventures", "/chat", "/home"],
    [
      "long-adventure",
      `/chats/${fixture.chat}`,
      `/projects/${fixture.project}`,
    ],
    ["activities", "/activities", "/home"],
    ["workshop", "/workshop", "/home"],
    ["editor", `/constructs/${fixture.construct}`, "/workshop"],
  ];
  type Cell = Pick<ReadinessRow, "state" | "profile" | "name" | "sample"> & {
    path: string;
    source: string;
  };
  const plan: Cell[] = [];
  for (const state of ["populated", "empty", "empty-detail"] as const) {
    for (const profile of ["desktop", "phone"] as const) {
      for (const [name, normalPath, normalSource] of journeys.filter(
        ([journey]) => supports(state, journey),
      )) {
        let path = normalPath;
        let source = normalSource;
        if (state === "empty-detail") {
          if (name === "quest") {
            path = `/projects/${fixture.emptyProject}`;
            source = "/projects";
          } else {
            path = `/chats/${fixture.emptyChat}`;
            source = `/projects/${fixture.emptyProject}`;
          }
        }
        for (let sample = 1; sample <= options.samples; sample += 1) {
          if (
            selection === undefined ||
            (state === selection.state &&
              profile === selection.profile &&
              name === selection.name)
          ) {
            plan.push({ state, profile, name, sample, path, source });
          }
        }
      }
    }
  }
  // Each cell owns one context and its cold→warm→client cache lineage.
  // Failures stop the plan; the next cell starts only after context cleanup.
  async function captureCell(cellIndex: number): Promise<void> {
    const cell = plan[cellIndex];
    if (cell === undefined) {
      return;
    }
    const { state, profile, name, sample, path, source } = cell;
    const context = await browser.createBrowserContext();
    let activeMode: ReadinessRow["mode"] | null = null;
    let phase: CapturePhase = "context";
    try {
      const page = await context.newPage();
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: "light" },
      ]);
      let viewport = {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      };
      if (profile === "phone") {
        viewport = {
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          isMobile: true,
          hasTouch: true,
        };
      }
      await page.setViewport(viewport);
      let token = fixture.populated;
      if (state === "empty") {
        token = fixture.empty;
      }
      if (state === "empty-detail") {
        token = fixture.details;
      }
      await context.setCookie({
        name: "session",
        value: token,
        domain: new URL(options.base).hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      });
      const cdp = await page.createCDPSession();
      const prefetchUrls = new Set<string>();
      type RequestRecord = Omit<NetworkResource, "start" | "duration"> & {
        wallTime: number;
        timestamp: number;
        end?: number;
      };
      const networkRequests = new Map<string, RequestRecord>();
      cdp.on("Network.requestWillBeSent", (event) => {
        let initiator: NetworkResource["initiator"] = "other";
        for (const allowed of ["parser", "script", "preload"] as const) {
          if (event.initiator.type === allowed) {
            initiator = allowed;
          }
        }
        let resourceType: NetworkResource["resourceType"] = "Other";
        for (const allowed of [
          "Document",
          "Script",
          "Font",
          "Image",
          "Stylesheet",
          "Fetch",
          "XHR",
        ] as const) {
          if (event.type === allowed) {
            resourceType = allowed;
          }
        }
        let method: NetworkResource["method"] = "other";
        const { method: requestMethod } = event.request;
        if (requestMethod === "GET" || requestMethod === "POST") {
          method = requestMethod;
        }
        const headers = Object.entries(event.request.headers);
        const prefetch = headers.some(
          ([key, value]) =>
            ["purpose", "sec-purpose", "next-router-prefetch"].includes(
              key.toLowerCase(),
            ) &&
            (String(value).includes("prefetch") || String(value) === "1"),
        );
        if (prefetch) {
          prefetchUrls.add(event.request.url);
        }
        networkRequests.set(event.requestId, {
          path: safeResource(event.request.url),
          method,
          resourceType,
          initiator,
          prefetch,
          bytes: 0,
          status: 0,
          failed: false,
          wallTime: event.wallTime,
          timestamp: event.timestamp,
        });
      });
      cdp.on("Network.responseReceived", (event) => {
        const request = networkRequests.get(event.requestId);
        if (request !== undefined) {
          request.status = event.response.status;
        }
      });
      cdp.on("Network.dataReceived", (event) => {
        const request = networkRequests.get(event.requestId);
        if (request !== undefined) {
          request.bytes += event.encodedDataLength;
        }
      });
      cdp.on("Network.loadingFinished", (event) => {
        const request = networkRequests.get(event.requestId);
        if (request !== undefined) {
          request.end = event.timestamp;
          request.bytes = event.encodedDataLength;
        }
      });
      cdp.on("Network.loadingFailed", (event) => {
        const request = networkRequests.get(event.requestId);
        if (request !== undefined) {
          request.end = event.timestamp;
          request.failed = true;
        }
      });
      await cdp.send("Network.enable");
      let latency = 0;
      let downloadThroughput = -1;
      let uploadThroughput = -1;
      let rate = 1;
      if (profile === "phone") {
        latency = PHONE_LATENCY_MS;
        downloadThroughput = PHONE_DOWNLOAD;
        uploadThroughput = PHONE_UPLOAD;
        rate = PHONE_CPU_RATE;
      }
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency,
        downloadThroughput,
        uploadThroughput,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await page.evaluateOnNewDocument(observe);
      const modes = [
        "cold-direct",
        "warm-direct",
        "client-navigation",
      ] as const;
      async function captureMode(modeIndex: number): Promise<void> {
        const mode = modes[modeIndex];
        if (mode === undefined) {
          return;
        }
        activeMode = mode;
        const hostLoad = loadavg();
        prefetchUrls.clear();
        networkRequests.clear();
        const tracing =
          sample === 1 &&
          mode === "cold-direct" &&
          (selection !== undefined ||
            (state === "populated" && profile === "desktop"));
        if (tracing) {
          await page.tracing.start({
            screenshots: name === "home",
            categories: [
              "devtools.timeline",
              "v8.execute",
              "blink.user_timing",
              "loading",
            ],
          });
        }
        let activated: ReadinessRow["activated"] = null;
        let navigation: ReturnType<Page["goto"]> | undefined;
        if (mode !== "cold-direct") {
          await page.evaluate(() => localStorage.clear());
        }
        if (mode === "client-navigation") {
          phase = "source-navigation";
          const response = await page.goto(options.base + source, {
            waitUntil: "domcontentloaded",
          });
          if (
            response === null ||
            !response.ok() ||
            page.url() !== options.base + source
          ) {
            throw new Error("Invalid authenticated source");
          }
          phase = "source-content";
          await page.waitForFunction(
            () =>
              !document.querySelector('[aria-busy="true"]') &&
              document.querySelector("main") !== null,
          );
          // Confirm the source's shared React control before measuring a client link.
          phase = "source-control";
          await probe(page, "home");
          const sourceDocument = await page.evaluate(
            () => performance.timeOrigin,
          );
          phase = "route-link";
          const selector = `a[href="${path}"]`;
          // The shared menu can hydrate before streamed detail links arrive.
          // Wait for the actual source link, using the existing browser deadline.
          await page.waitForFunction(
            (target) =>
              Array.from(document.querySelectorAll(target)).some((node) => {
                const style = getComputedStyle(node);
                const rect = node.getBoundingClientRect();
                return (
                  style.visibility !== "hidden" &&
                  style.visibility !== "collapse" &&
                  rect.width > 0 &&
                  rect.height > 0
                );
              }),
            {},
            selector,
          );
          const anchor = await visible(page, selector);
          activated = {
            region: "route-link",
            rect: await anchor.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              return {
                x: rect.x,
                y: rect.y + scrollY,
                width: rect.width,
                height: rect.height,
              };
            }),
          };
          await page.evaluate(observe, true);
          phase = "transition-navigation";
          await anchor.click();
          await page.waitForFunction(
            (target) => location.pathname === target,
            {},
            path,
          );
          if (
            (await page.evaluate(() => performance.timeOrigin)) !==
            sourceDocument
          ) {
            throw new Error("Client link performed a document navigation");
          }
        } else {
          phase = "document-navigation";
          const committed = new Promise<void>((resolveCommit, rejectCommit) => {
            const deadline = setTimeout(() => {
              page.off("framenavigated", onFrame);
              rejectCommit(new Error("Document commit not observed"));
            }, DOCUMENT_TIMEOUT_MS);
            function onFrame(frame: Frame): void {
              if (
                frame === page.mainFrame() &&
                frame.url() === options.base + path
              ) {
                clearTimeout(deadline);
                page.off("framenavigated", onFrame);
                resolveCommit();
              }
            }
            page.on("framenavigated", onFrame);
          });
          navigation = page
            .goto(options.base + path, { waitUntil: "domcontentloaded" })
            .catch(() => null);
          await committed;
        }
        if (page.url() !== options.base + path) {
          throw new Error("Intended authenticated destination not reached");
        }
        phase = "primary-content";
        await page.waitForFunction(primaryPresent, {}, name);
        await page.evaluate(() => {
          globalThis.audit.primary = performance.now();
        });
        const content = stateContent(state, name, fixture);
        // Two probes change what the page shows: the editor's replaces the
        // prompt text and the quests probe switches to another status tab.
        // Those states are read before the probe; the rest after the
        // observation window, outside every measured interval.
        const probeChangesContent = name === "editor" || name === "quests";
        if (probeChangesContent) {
          phase = "state-content";
          if ((await page.evaluate(statePresent, content)) !== true) {
            throw new Error("State content not observed");
          }
        }
        phase = "control-probe";
        const control = await probe(page, name);
        phase = "observation";
        const remaining = await page.evaluate((time) => {
          const MinimumWindowMs = 5000;
          const PostControlMs = 2000;
          return (
            Math.max(
              globalThis.audit.origin + MinimumWindowMs,
              time + PostControlMs,
            ) - performance.now()
          );
        }, control.confirmed);
        if (remaining > 0) {
          await delay(Math.ceil(remaining));
        }
        if (navigation !== undefined) {
          const response = await navigation;
          if (response === null || !response.ok()) {
            throw new Error("Non-2xx destination");
          }
        }
        phase = "read-result";
        const data = await page.evaluate(() => {
          globalThis.stopAudit?.();
          const nav = performance
            .getEntriesByType("navigation")
            .find(
              (entry): entry is PerformanceNavigationTiming =>
                entry instanceof PerformanceNavigationTiming,
            );
          if (nav === undefined) {
            throw new Error("Missing navigation timing");
          }
          const resources = performance
            .getEntriesByType("resource")
            .filter(
              (entry): entry is PerformanceResourceTiming =>
                entry instanceof PerformanceResourceTiming,
            )
            .map((resource) => ({
              path: resource.name,
              start: resource.startTime,
              duration: resource.duration,
              bytes: resource.transferSize,
              type: resource.initiatorType,
            }));
          return {
            ...globalThis.audit,
            end: performance.now(),
            nav: {
              responseStart: nav.responseStart,
              requestStart: nav.requestStart,
              start: nav.startTime,
              dom: nav.domContentLoadedEventEnd,
            },
            resources,
          };
        });
        phase = "state-content";
        if (
          !probeChangesContent &&
          (await page.evaluate(statePresent, content)) !== true
        ) {
          throw new Error("State content not observed");
        }
        phase = "read-result";
        const documentTimeOrigin = await page.evaluate(
          () => performance.timeOrigin,
        );
        const SecondsToMs = 1000;
        const networkResources: NetworkResource[] = Array.from(
          networkRequests.values(),
        ).flatMap((request) => {
          const { wallTime, timestamp, end, ...record } = request;
          if (end === undefined) {
            return [];
          }
          return [
            {
              ...record,
              start: Math.max(0, wallTime * SecondsToMs - documentTimeOrigin),
              duration: Math.max(0, end - timestamp) * SecondsToMs,
            },
          ];
        });
        let threshold = 0;
        if (mode === "client-navigation") {
          threshold = data.origin;
        }
        const allResources = data.resources.map((resource) => {
          let type: ReadinessRow["resources"][number]["type"] = "other";
          for (const allowed of [
            "script",
            "link",
            "css",
            "img",
            "fetch",
            "other",
            "navigation",
            "xmlhttprequest",
            "beacon",
          ] as const) {
            if (resource.type === allowed) {
              type = allowed;
            }
          }
          let purpose: "first-load" | "prefetch" | "destination" | "other" =
            "first-load";
          if (mode === "client-navigation") {
            purpose = "destination";
          }
          if (prefetchUrls.has(resource.path)) {
            purpose = "prefetch";
          }
          return {
            ...resource,
            path: safeResource(resource.path),
            type,
            purpose,
          };
        });
        const resources = allResources.filter(
          (resource) => resource.start >= threshold,
        );
        const prefetches = allResources.filter(
          (resource) => resource.purpose === "prefetch",
        );
        let initialSessionWindowCls: number | null = initialCls(data.shifts);
        if (mode === "client-navigation") {
          initialSessionWindowCls = null;
        }
        if (data.primary === null || data.shell === null) {
          throw new Error("Required content or shell not observed");
        }
        const row = {
          ...data,
          captureProtocol: "commit-probe-v5",
          contentCheck: content.check,
          hostLoad,
          state,
          profile,
          name,
          mode,
          sample,
          path: route(path),
          control,
          resources,
          networkResources,
          prefetches,
          activated,
          initialSessionWindowCls,
          transitionAllShiftSum: data.shifts.reduce(
            (sum, shift) => sum + shift.value,
            0,
          ),
        };
        // Parse each result through the same final allowlist, without accepting an incomplete matrix.
        phase = "validate-result";
        rows.push(parseReadinessRow(row));
        phase = "persist-result";
        await writeGzip(options.output, "readiness.json.gz", rows);
        if (tracing) {
          phase = "trace";
          await sanitizedTrace(page, options.output, `${name}.trace.json.gz`);
        }
        await captureMode(modeIndex + 1);
      }
      await captureMode(0);
    } catch (error) {
      await writeFile(
        `${options.output}/failures.json`,
        JSON.stringify(
          {
            state,
            profile,
            name,
            sample,
            mode: activeMode,
            reason: "capture-failed",
            diagnostic: captureFailure(error, phase),
          },
          null,
          2,
        ),
      );
      throw new Error(
        `Audit failed: ${state}/${profile}/${name}/${sample}; partial cohort retained`,
        { cause: error },
      );
    } finally {
      await context.close();
    }
    await captureCell(cellIndex + 1);
  }
  await captureCell(0);
  return validateReadinessRows(
    JSON.parse(
      gunzipSync(
        await readFile(`${options.output}/readiness.json.gz`),
      ).toString("utf8"),
    ),
    options.samples,
    selection,
  );
}
async function openBrowser(path: string): Promise<Browser> {
  const browser = await puppeteer.launch({
    executablePath: path,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=0",
    ],
  });
  if (!(await browser.version()).endsWith("/156.0.8078.4")) {
    await browser.close();
    throw new Error("Audit requires pinned Chrome 156.0.8078.4");
  }
  return browser;
}

export type { CaptureOptions, Fixture };
export {
  captureMatrix,
  openBrowser,
  probe,
  route,
  safeResource,
  stateContent,
  visible,
  writeGzip,
};
