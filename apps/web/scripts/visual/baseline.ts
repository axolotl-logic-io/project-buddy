// `mise run visual-baseline`: measures the site before the theme redesign,
// so its effect can be compared. For each view in views.ts marked measure,
// in each appearance at each width, it loads the page in a fresh browser and
// records the bytes transferred by kind, the font files, Largest Contentful
// Paint and Cumulative Layout Shift, and scans it with axe. It brings every
// other view to its state and scans that with axe too. It writes
// baseline.json and summary.md. See "Visual baseline" in README.md.
//
// Runs after npm ci and `mise run review-data`.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import process from "node:process";
import { AxeBuilder } from "@axe-core/playwright";
import {
  type Browser,
  chromium,
  type Page,
  type Request,
} from "@playwright/test";
import type { ThemeMode } from "../../src/themes/themes.ts";
import { closeAppDatabase, WEB_ROOT } from "../development/review-accounts.ts";
import {
  type AxeViolation,
  type BaselineResults,
  baselineSummary,
  type Measured,
  type ResourceKind,
  type Scanned,
  type Transferred,
} from "./baseline-summary.ts";
import {
  inOrder,
  messageOf,
  openView,
  resolvePath,
  settle,
  type ViewTarget,
  viewContext,
  watch,
} from "./capture.ts";
import {
  parseToolOptions,
  SHARED_HELP,
  type ToolOptions,
  takesView,
} from "./options.ts";
import { openSite, type SignedIn, signInReviewAccounts } from "./site.ts";
import { layoutOf, VIEWS, type VisualView, viewName } from "./views.ts";

interface Recorded {
  lcpMs: number;
  lcpElement: string;
  cls: number;
}

const DEFAULT_OUT = join(tmpdir(), "project-buddy-baseline");
const SITE_LOG = join(tmpdir(), "project-buddy-baseline-site.log");
// axe's WCAG 2.2 A and AA rules, and its best practices.
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const AXE_EXAMPLES = 3;
const HTML_LENGTH = 160;
// Layout shifts less than a second apart, in a window of at most five
// seconds, add up, as Core Web Vitals counts them.
// The page keeps what it records in session storage under this key.
const VITALS_KEY = "project-buddy-baseline-vitals";
const SHIFT_SESSION: {
  readonly key: string;
  readonly gapMs: number;
  readonly maxMs: number;
} = { key: VITALS_KEY, gapMs: 1000, maxMs: 5000 };
const REQUEST_TIMEOUT_MS = 120_000;
const HTTP = /^https?:/u;

const HELP = `Usage: mise run visual-baseline -- [OPTIONS]

Measures the page loads of the views marked measure in
apps/web/scripts/visual/views.ts, as the typical review account or signed
out, in each appearance and at each width: bytes transferred by kind, font
files, Largest Contentful Paint and Cumulative Layout Shift, and an axe scan.
Scans every other view in its state with axe. Writes OUT/baseline.json and
OUT/summary.md. Run mise run review-data first.

${SHARED_HELP} (default ${DEFAULT_OUT})`;

// What the page's observers record, read after it settles.
interface Vitals {
  readonly lcpMs: number;
  readonly lcpElement: string;
  readonly cls: number;
  readonly ttfbMs: number;
  readonly loadMs: number;
}

interface Transfer {
  readonly kind: ResourceKind;
  readonly url: string;
  readonly bytes: number;
}

// What every load and scan of a run shares.
interface Run {
  readonly browser: Browser;
  readonly origin: string;
  readonly accounts: Readonly<Record<string, SignedIn>>;
  readonly widths: readonly number[];
  readonly appearances: readonly ThemeMode[];
}

interface Combination {
  readonly appearance: ThemeMode;
  readonly width: number;
}

const KINDS: Readonly<Record<string, ResourceKind>> = {
  document: "document",
  stylesheet: "css",
  script: "js",
  font: "fonts",
  image: "images",
};

// Runs in the page before its own scripts: records the Largest Contentful
// Paint and the largest session of layout shift.
function recordVitals(session: {
  readonly key: string;
  readonly gapMs: number;
  readonly maxMs: number;
}): void {
  interface Shift extends PerformanceEntry {
    readonly value: number;
    readonly hadRecentInput: boolean;
  }
  function isShift(entry: PerformanceEntry): entry is Shift {
    return "value" in entry && "hadRecentInput" in entry;
  }
  const vitals: Recorded = { lcpMs: 0, lcpElement: "", cls: 0 };
  function save(): void {
    sessionStorage.setItem(session.key, JSON.stringify(vitals));
  }
  let sessionValue = 0;
  let sessionStart = 0;
  let lastShift = 0;
  function elementLabel(element: Element | null): string {
    if (element === null) {
      return "";
    }
    const [first] = element.classList;
    if (first === undefined) {
      return element.tagName.toLowerCase();
    }
    return `${element.tagName.toLowerCase()}.${first}`;
  }
  function addShift(shift: Shift): void {
    const time = shift.startTime;
    if (
      time - lastShift > session.gapMs ||
      time - sessionStart > session.maxMs
    ) {
      sessionValue = 0;
      sessionStart = time;
    }
    sessionValue += shift.value;
    lastShift = time;
    vitals.cls = Math.max(vitals.cls, sessionValue);
    save();
  }
  new PerformanceObserver((list: PerformanceObserverEntryList): void => {
    for (const entry of list.getEntries()) {
      if (entry instanceof LargestContentfulPaint) {
        vitals.lcpMs = entry.startTime;
        vitals.lcpElement = elementLabel(entry.element);
        save();
      }
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list: PerformanceObserverEntryList): void => {
    for (const entry of list.getEntries()) {
      if (isShift(entry) && !entry.hadRecentInput) {
        addShift(entry);
      }
    }
  }).observe({ type: "layout-shift", buffered: true });
}

function readVitals(page: Page): Promise<Vitals> {
  return page.evaluate((key: string): Vitals => {
    const none: Recorded = { lcpMs: 0, lcpElement: "", cls: 0 };
    const saved: Recorded | null = JSON.parse(
      sessionStorage.getItem(key) ?? "null",
    );
    const recorded = saved ?? none;
    const navigation = performance
      .getEntriesByType("navigation")
      .find(
        (entry: PerformanceEntry): entry is PerformanceNavigationTiming =>
          entry instanceof PerformanceNavigationTiming,
      );
    return {
      ...recorded,
      ttfbMs: navigation?.responseStart ?? 0,
      loadMs: navigation?.loadEventEnd ?? 0,
    };
  }, VITALS_KEY);
}

function kindOf(request: Request): ResourceKind {
  return KINDS[request.resourceType()] ?? "other";
}

async function transferOf(request: Request): Promise<Transfer> {
  const sizes = await request.sizes();
  return {
    kind: kindOf(request),
    url: request.url(),
    bytes: sizes.responseBodySize + sizes.responseHeadersSize,
  };
}

function emptyTransfer(): Record<ResourceKind, Transferred> {
  const none: Transferred = { bytes: 0, count: 0 };
  return {
    document: none,
    css: none,
    js: none,
    fonts: none,
    images: none,
    other: none,
  };
}

function totalsOf(
  transfers: readonly Transfer[],
): Record<ResourceKind, Transferred> {
  const totals = emptyTransfer();
  for (const { kind, bytes } of transfers) {
    const sum = totals[kind];
    totals[kind] = { bytes: sum.bytes + bytes, count: sum.count + 1 };
  }
  return totals;
}

async function scan(page: Page): Promise<AxeViolation[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations.map(
    (violation: (typeof results.violations)[number]): AxeViolation => ({
      id: violation.id,
      impact: violation.impact ?? "unknown",
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length,
      examples: violation.nodes.slice(0, AXE_EXAMPLES).map(
        (
          node: (typeof violation.nodes)[number],
        ): {
          target: string;
          html: string;
        } => ({
          target: node.target.map(String).join(" "),
          html: node.html.slice(0, HTML_LENGTH),
        }),
      ),
    }),
  );
}

// The widths a view is shown at, with each appearance.
function combinations(run: Run, view: VisualView): Combination[] {
  return run.widths
    .filter(
      (width: number): boolean =>
        view.only === undefined || view.only === layoutOf(width),
    )
    .flatMap((width: number): Combination[] =>
      run.appearances.map(
        (appearance: ThemeMode): Combination => ({ appearance, width }),
      ),
    );
}

function targetOf(
  run: Run,
  view: VisualView,
  combination: Combination,
): ViewTarget {
  return {
    origin: run.origin,
    signedIn: run.accounts[view.account],
    appearance: combination.appearance,
    width: combination.width,
  };
}

// Asks the site for the page once, unmeasured, so the measured loads don't
// pay for the server's first render of it.
async function warmUp(run: Run, view: VisualView): Promise<void> {
  const signedIn = run.accounts[view.account];
  const path = resolvePath(view.path, signedIn?.find);
  const headers = new Headers();
  if (signedIn !== undefined) {
    headers.set("cookie", `${signedIn.cookie.name}=${signedIn.cookie.value}`);
  }
  await fetch(new URL(path, run.origin), {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((): undefined => undefined);
}

// Loads the view's page in a fresh browser and measures it.
async function measureLoad(
  run: Run,
  view: VisualView,
  combination: Combination,
): Promise<Measured> {
  const target = targetOf(run, view, combination);
  const context = await viewContext(run.browser, target, view.docked === true);
  await context.addInitScript(recordVitals, SHIFT_SESSION);
  const page = await context.newPage();
  const watched = watch(page);
  const transfers: Promise<Transfer>[] = [];
  const problems: string[] = [];
  page.on("requestfinished", (request: Request): void => {
    if (HTTP.test(request.url())) {
      transfers.push(transferOf(request));
    }
  });
  page.on("pageerror", (error: Error): void => {
    problems.push(`Page error: ${messageOf(error)}`);
  });
  try {
    const path = resolvePath(view.path, target.signedIn?.find);
    const answer = await page.goto(new URL(path, run.origin).href);
    await settle(watched);
    if (
      target.signedIn !== undefined &&
      new URL(page.url()).pathname === "/login"
    ) {
      problems.push("The page asked to sign in.");
    }
    const vitals = await readVitals(page);
    const loaded = await Promise.all(transfers);
    const violations = await scan(page);
    const transfer = totalsOf(loaded);
    return {
      name: viewName(view),
      account: target.signedIn?.email ?? "signed out",
      appearance: combination.appearance,
      width: combination.width,
      status: answer?.status(),
      transfer,
      totalBytes: loaded.reduce(
        (sum: number, item: Transfer): number => sum + item.bytes,
        0,
      ),
      requests: loaded.length,
      fonts: loaded
        .filter((item: Transfer): boolean => item.kind === "fonts")
        .map((item: Transfer): string => basename(new URL(item.url).pathname)),
      ...vitals,
      violations,
      problems,
    };
  } finally {
    await context.close();
  }
}

// Brings the view to its state and scans it with axe.
async function scanState(
  run: Run,
  view: VisualView,
  combination: Combination,
): Promise<Scanned> {
  const target = targetOf(run, view, combination);
  const opened = await openView(run.browser, view, target);
  const problems = [...opened.problems];
  let violations: AxeViolation[] = [];
  try {
    violations = await scan(opened.watched.page);
  } catch (error) {
    problems.push(`axe: ${messageOf(error)}`);
  } finally {
    await opened.context.close();
  }
  return {
    name: viewName(view),
    account: target.signedIn?.email ?? "signed out",
    appearance: combination.appearance,
    width: combination.width,
    violations,
    problems,
  };
}

// The measured loads, one after another, so none slows another.
function measureAll(
  run: Run,
  views: readonly VisualView[],
): Promise<Measured[][]> {
  return inOrder(views, async (view: VisualView): Promise<Measured[]> => {
    await warmUp(run, view);
    const loads = await inOrder(
      combinations(run, view),
      (combination: Combination): Promise<Measured> =>
        measureLoad(run, view, combination),
    );
    console.log(`  ${viewName(view)}: ${loads.length} loads measured`);
    return loads;
  });
}

// The other views' scans, each view's at once.
function scanAll(run: Run, views: readonly VisualView[]): Promise<Scanned[][]> {
  return inOrder(views, async (view: VisualView): Promise<Scanned[]> => {
    const scans = await Promise.all(
      combinations(run, view).map(
        (combination: Combination): Promise<Scanned> =>
          scanState(run, view, combination),
      ),
    );
    console.log(`  ${viewName(view)}: ${scans.length} states scanned`);
    return scans;
  });
}

function commitOf(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: WEB_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function chosenViews(options: ToolOptions): VisualView[] {
  const views = VIEWS.filter((view: VisualView): boolean =>
    takesView(options, viewName(view)),
  );
  if (views.length === 0) {
    throw new Error(`No view's name contains ${options.only.join(" or ")}.`);
  }
  return views;
}

// Prints the headline figures; answers whether every view reached its state.
function report(results: BaselineResults, out: string): boolean {
  const scans: Scanned[] = [...results.loads, ...results.states];
  const rules = new Set(
    scans.flatMap((item: Scanned): string[] =>
      item.violations.map((violation: AxeViolation): string => violation.id),
    ),
  );
  console.log(
    `Measured ${results.loads.length} page loads; axe made ${scans.length} scans and found ${rules.size} rules violated: ${[...rules].sort().join(", ")}.`,
  );
  const troubled = scans.filter(
    (item: Scanned): boolean => item.problems.length > 0,
  );
  for (const item of troubled) {
    console.log(
      `PROBLEM: ${item.name}, ${item.appearance}, ${item.width} px: ${item.problems.join(" ")}`,
    );
  }
  console.log(`Wrote ${join(out, "summary.md")} and baseline.json.`);
  return troubled.length === 0;
}

async function baseline(args: readonly string[]): Promise<boolean> {
  const options = parseToolOptions(args, DEFAULT_OUT);
  if (options.help) {
    console.log(HELP);
    return true;
  }
  const views = chosenViews(options);
  const out = resolve(options.out);
  mkdirSync(out, { recursive: true });
  const site = await openSite(options.site, SITE_LOG);
  const browser = await chromium.launch();
  try {
    const accounts = await signInReviewAccounts(site.origin, options.email);
    const run: Run = {
      browser,
      origin: site.origin,
      accounts,
      widths: options.widths,
      appearances: options.appearances,
    };
    const measured = views.filter(
      (view: VisualView): boolean => view.measure === true,
    );
    console.log(`Measuring ${measured.length} page loads at ${site.origin}.`);
    const loads = await measureAll(run, measured);
    const others = views.filter(
      (view: VisualView): boolean => view.measure !== true,
    );
    console.log(`Scanning ${others.length} other views with axe.`);
    const states = await scanAll(run, others);
    const results: BaselineResults = {
      site: `${site.origin} (${site.build})`,
      commit: commitOf(),
      takenAt: new Date().toISOString(),
      email: accounts.typical.email,
      widths: options.widths,
      appearances: options.appearances,
      loads: loads.flat(),
      states: states.flat(),
    };
    writeFileSync(
      join(out, "baseline.json"),
      `${JSON.stringify(results, null, 2)}\n`,
    );
    writeFileSync(join(out, "summary.md"), baselineSummary(results));
    return report(results, out);
  } finally {
    await browser.close();
    await site.stop();
    await closeAppDatabase();
  }
}

try {
  const fine = await baseline(process.argv.slice(2));
  if (!fine) {
    process.exitCode = 1;
  }
} catch (error) {
  // The whole message: a failed build's carries the end of its log.
  console.error(String(error));
  process.exitCode = 1;
}
