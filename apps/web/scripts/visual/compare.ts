// `mise run visual-compare`: screenshots every view in views.ts, signed in as
// the review accounts, in each appearance and at each width, and, given a
// folder of mockups, screenshots the matching mockups and writes an
// index.html that shows the site and the mockup side by side. See "Visual
// comparison" in README.md.
//
// Runs after npm ci and `mise run review-data`.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { type Browser, chromium } from "@playwright/test";
import type { ThemeMode } from "../../src/themes/themes.ts";
import { closeAppDatabase } from "../development/review-accounts.ts";
import {
  fitFrame,
  inOrder,
  messageOf,
  openView,
  settle,
  watch,
  windowHeight,
} from "./capture.ts";
import {
  type ComparedShot,
  type ComparisonSummary,
  comparisonPage,
  type MockupFolder,
  viewsWithoutMockup,
} from "./index-page.ts";
import {
  parseToolOptions,
  SHARED_HELP,
  type ToolOptions,
  takesView,
} from "./options.ts";
import { openSite, type SignedIn, signInReviewAccounts } from "./site.ts";
import {
  layoutOf,
  VIEWS,
  type ViewFrame,
  type VisualView,
  viewName,
} from "./views.ts";

const DEFAULT_OUT = join(tmpdir(), "project-buddy-visual");
const SITE_FOLDER = "site";
const MOCKUP_FOLDER = "mockups";
const MOCKUP_PAGE = /\.html$/u;

const HELP = `Usage: mise run visual-compare -- [OPTIONS]

Screenshots every view in apps/web/scripts/visual/views.ts as the review
accounts (run mise run review-data first), in each appearance and at each
width, into OUT/site/. With --mockups, also screenshots each view's mockup,
DIR/<view>--<state>.html, into OUT/mockups/, and writes OUT/index.html with
the two side by side.

Mockups:
  --mockups DIR        the folder of mockup pages to compare with
${SHARED_HELP} (default ${DEFAULT_OUT})`;

// What every screenshot of a run shares.
interface Shooting {
  readonly browser: Browser;
  readonly origin: string;
  readonly accounts: Readonly<Record<string, SignedIn>>;
  readonly out: string;
  readonly widths: readonly number[];
  readonly appearances: readonly ThemeMode[];
  readonly mockups: string | undefined;
}

interface Shot {
  readonly view: VisualView;
  readonly appearance: ThemeMode;
  readonly width: number;
}

// The widths a view is shown at.
function widthsFor(view: VisualView, widths: readonly number[]): number[] {
  return widths.filter(
    (width: number): boolean =>
      view.only === undefined || view.only === layoutOf(width),
  );
}

function shotFile(name: string, appearance: string, width: number): string {
  return `${name}--${appearance}--${width}.png`;
}

// Screenshots the view at one appearance and width.
async function shootSite(
  shooting: Shooting,
  shot: Shot,
): Promise<ComparedShot> {
  const { view, appearance, width } = shot;
  const name = viewName(view);
  const opened = await openView(shooting.browser, view, {
    origin: shooting.origin,
    signedIn: shooting.accounts[view.account],
    appearance,
    width,
  });
  const file = shotFile(name, appearance, width);
  const problems = [...opened.problems];
  await opened.watched.page
    .screenshot({ path: join(shooting.out, SITE_FOLDER, file) })
    .catch((error: unknown): void => {
      problems.push(messageOf(error));
    });
  await opened.context.close();
  return {
    name,
    account: view.account,
    appearance,
    width,
    app: `${SITE_FOLDER}/${file}`,
    mockup: undefined,
    problems,
  };
}

// The part of a mockup page to capture for each frame: overlays are captured
// in the window, as on the site; everything else, whole.
const MOCKUP_FRAMES: Readonly<Record<ViewFrame, ViewFrame>> = {
  page: "page",
  window: "window",
  sidebar: "page",
};

// Screenshots the shot's mockup, if there is one. Mockup pages show
// themselves alone, in the appearance and at the width, with ?bare.
async function shootMockup(
  shooting: Shooting,
  view: VisualView,
  shot: ComparedShot,
): Promise<ComparedShot> {
  const { mockups, browser, out } = shooting;
  if (mockups === undefined) {
    return shot;
  }
  const page = join(mockups, `${shot.name}.html`);
  if (!existsSync(page)) {
    return shot;
  }
  const context = await browser.newContext({
    viewport: { width: shot.width, height: windowHeight(shot.width) },
  });
  const file = shotFile(shot.name, shot.appearance, shot.width);
  const problems = [...shot.problems];
  try {
    const tab = await context.newPage();
    const watched = watch(tab);
    const url = pathToFileURL(page);
    url.search = `?bare&appearance=${shot.appearance}&width=${shot.width}`;
    await tab.goto(url.href);
    await settle(watched);
    await fitFrame(watched, MOCKUP_FRAMES[view.frame], shot.width);
    await tab.screenshot({ path: join(out, MOCKUP_FOLDER, file) });
  } catch (error) {
    problems.push(`Mockup: ${messageOf(error)}`);
  } finally {
    await context.close();
  }
  return { ...shot, mockup: `${MOCKUP_FOLDER}/${file}`, problems };
}

// Screenshots one view, and its mockup, in every appearance at every width,
// all at once.
function shootView(
  shooting: Shooting,
  view: VisualView,
): Promise<ComparedShot[]> {
  const shots = widthsFor(view, shooting.widths).flatMap(
    (width: number): Promise<ComparedShot>[] =>
      shooting.appearances.map(
        async (appearance: ThemeMode): Promise<ComparedShot> => {
          const site = await shootSite(shooting, { view, appearance, width });
          return shootMockup(shooting, view, site);
        },
      ),
  );
  return Promise.all(shots);
}

// The mockup pages in folder that match no view.
function unusedMockups(folder: string): string[] {
  const names = new Set(VIEWS.map(viewName));
  return readdirSync(folder)
    .filter((file: string): boolean => MOCKUP_PAGE.test(file))
    .map((file: string): string => basename(file, ".html"))
    .filter((name: string): boolean => !names.has(name))
    .sort();
}

function freshFolder(path: string): void {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function mockupFolderOf(options: ToolOptions): string | undefined {
  if (options.mockups === undefined) {
    return undefined;
  }
  const folder = resolve(options.mockups);
  if (!existsSync(folder)) {
    throw new Error(`There is no mockup folder at ${folder}.`);
  }
  return folder;
}

function mockupSummary(folder: string | undefined): MockupFolder | undefined {
  if (folder === undefined) {
    return undefined;
  }
  return { folder, unused: unusedMockups(folder) };
}

// Prints what was taken and what went wrong; answers whether all went well.
function report(summary: ComparisonSummary, out: string): boolean {
  const { shots } = summary;
  console.log(`Took ${shots.length} screenshots into ${out}.`);
  if (summary.mockups !== undefined) {
    const missing = viewsWithoutMockup(shots);
    if (missing.length === 0) {
      console.log("Every view has a mockup.");
    } else {
      console.log(`No mockup for: ${missing.join(", ")}.`);
    }
    if (summary.mockups.unused.length > 0) {
      console.log(
        `Mockups matching no view: ${summary.mockups.unused.join(", ")}.`,
      );
    }
  }
  const troubled = shots.filter(
    (shot: ComparedShot): boolean => shot.problems.length > 0,
  );
  for (const shot of troubled) {
    console.log(
      `PROBLEM: ${shotFile(shot.name, shot.appearance, shot.width)}: ${shot.problems.join(" ")}`,
    );
  }
  console.log(`Open ${pathToFileURL(join(out, "index.html")).href}`);
  return troubled.length === 0;
}

async function compare(args: readonly string[]): Promise<boolean> {
  const options = parseToolOptions(args, DEFAULT_OUT);
  if (options.help) {
    console.log(HELP);
    return true;
  }
  const views = VIEWS.filter((view: VisualView): boolean =>
    takesView(options, viewName(view)),
  );
  if (views.length === 0) {
    throw new Error(`No view's name contains ${options.only.join(" or ")}.`);
  }
  const mockups = mockupFolderOf(options);
  const out = resolve(options.out);
  freshFolder(join(out, SITE_FOLDER));
  freshFolder(join(out, MOCKUP_FOLDER));
  const site = await openSite(options.site, join(out, "site.log"));
  try {
    const accounts = await signInReviewAccounts(site.origin, options.email);
    await using browser = await chromium.launch();
    const shooting: Shooting = {
      browser,
      origin: site.origin,
      accounts,
      out,
      widths: options.widths,
      appearances: options.appearances,
      mockups,
    };
    console.log(`Screenshotting ${views.length} views from ${site.origin}.`);
    const byView = await inOrder(
      views,
      async (view: VisualView): Promise<ComparedShot[]> => {
        const shots = await shootView(shooting, view);
        console.log(`  ${viewName(view)}: ${shots.length} screenshots`);
        return shots;
      },
    );
    const summary: ComparisonSummary = {
      shots: byView.flat(),
      mockups: mockupSummary(mockups),
      site: `${site.origin} (${site.build})`,
      takenAt: new Date().toISOString(),
    };
    writeFileSync(join(out, "index.html"), comparisonPage(summary));
    writeFileSync(
      join(out, "results.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    return report(summary, out);
  } finally {
    await Promise.all([site.stop(), closeAppDatabase()]);
  }
}

try {
  const fine = await compare(process.argv.slice(2));
  if (!fine) {
    process.exitCode = 1;
  }
} catch (error) {
  // The whole message: a failed build's carries the end of its log.
  console.error(String(error));
  process.exitCode = 1;
}
