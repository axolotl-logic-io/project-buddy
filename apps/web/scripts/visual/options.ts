// The command-line options the visual tools (compare.ts and baseline.ts)
// share: which site to use, which review accounts, and which views,
// appearances and widths.
import { parseArgs } from "node:util";
import { THEME_MODES, type ThemeMode } from "../../src/themes/themes.ts";
import type { SiteSource } from "./site.ts";

interface ToolOptions {
  readonly site: SiteSource;
  readonly email: string | undefined;
  readonly widths: readonly number[];
  readonly appearances: readonly ThemeMode[];
  // Parts of view names: a view is taken when its name contains one.
  readonly only: readonly string[];
  readonly out: string;
  readonly mockups: string | undefined;
  readonly help: boolean;
}

// The theme redesign brief's widths. apps/web/AGENTS.md asks for 320 px as
// the phone width; pass --widths 1280,360,320 to include it.
const DEFAULT_WIDTHS = "1280,360";
const WIDTH = /^[1-9]\d{2,3}$/u;
const MODES: readonly string[] = THEME_MODES;

const OPTIONS = {
  site: { type: "string" },
  dev: { type: "boolean", default: false },
  build: { type: "boolean", default: true },
  email: { type: "string" },
  widths: { type: "string", default: DEFAULT_WIDTHS },
  appearances: { type: "string", default: THEME_MODES.join(",") },
  only: { type: "string", default: "" },
  out: { type: "string" },
  mockups: { type: "string" },
  help: { type: "boolean", short: "h", default: false },
} as const;

function listOf(text: string): string[] {
  return text
    .split(",")
    .map((item: string): string => item.trim())
    .filter((item: string): boolean => item !== "");
}

function isThemeMode(text: string): text is ThemeMode {
  return MODES.includes(text);
}

function parseWidths(text: string): number[] {
  return listOf(text).map((item: string): number => {
    if (!WIDTH.test(item)) {
      throw new Error(
        `--widths takes widths in pixels, such as ${DEFAULT_WIDTHS}, not "${item}".`,
      );
    }
    return Number(item);
  });
}

function parseAppearances(text: string): ThemeMode[] {
  return listOf(text).map((item: string): ThemeMode => {
    if (!isThemeMode(item)) {
      throw new Error(
        `--appearances takes ${THEME_MODES.join(", ")}, not "${item}".`,
      );
    }
    return item;
  });
}

function parseSite(values: {
  readonly site?: string;
  readonly dev: boolean;
  readonly build: boolean;
}): SiteSource {
  const { site, dev, build } = values;
  if (site !== undefined && dev) {
    throw new Error("Give --site or --dev, not both.");
  }
  if (site !== undefined) {
    return { kind: "url", url: site };
  }
  if (dev) {
    return { kind: "dev" };
  }
  return { kind: "start", build };
}

// The options in args, with out defaulting to defaultOut.
function parseToolOptions(
  args: readonly string[],
  defaultOut: string,
): ToolOptions {
  const { values } = parseArgs({
    args: [...args],
    options: OPTIONS,
    allowNegative: true,
    strict: true,
  });
  return {
    site: parseSite(values),
    email: values.email,
    widths: parseWidths(values.widths),
    appearances: parseAppearances(values.appearances),
    only: listOf(values.only),
    out: values.out ?? defaultOut,
    mockups: values.mockups,
    help: values.help,
  };
}

// Whether the options take the view named name.
function takesView(options: Pick<ToolOptions, "only">, name: string): boolean {
  return (
    options.only.length === 0 ||
    options.only.some((part: string): boolean => name.includes(part))
  );
}

// The help both tools print for the options they share.
const SHARED_HELP = `Site (default: build this worktree and start it with next start):
  --site URL           use the site already running at URL, on this computer
  --dev                start the development server (next dev) instead
  --no-build           start the last production build without building again
Accounts:
  --email EMAIL        the review accounts' base address, as given to
                       mise run review-data (default review@project-buddy.test)
Views:
  --only PARTS         only views whose name contains one of these
                       comma-separated parts, such as quest--,settings
  --appearances LIST   default ${THEME_MODES.join(",")}
  --widths LIST        default ${DEFAULT_WIDTHS}; add 320, the phone width
                       apps/web/AGENTS.md asks for
  --out DIR            where to write the results`;

export type { ToolOptions };
export { parseToolOptions, SHARED_HELP, takesView };
