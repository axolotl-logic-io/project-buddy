// The baseline's results (baseline.ts) and the readable summary written
// beside them: page weight, font files, Largest Contentful Paint and layout
// shift for each measured page load, and axe's accessibility violations for
// every view, with what stands out.

// The kinds of resource a page load's transfer is counted by.
type ResourceKind = "document" | "css" | "js" | "fonts" | "images" | "other";

interface Transferred {
  readonly bytes: number;
  readonly count: number;
}

interface AxeExample {
  readonly target: string;
  readonly html: string;
}

interface AxeViolation {
  readonly id: string;
  readonly impact: string;
  readonly help: string;
  readonly helpUrl: string;
  readonly nodes: number;
  readonly examples: readonly AxeExample[];
}

// One view in one appearance at one width.
interface Scanned {
  readonly name: string;
  readonly account: string;
  readonly appearance: string;
  readonly width: number;
  readonly violations: readonly AxeViolation[];
  readonly problems: readonly string[];
}

// A measured page load.
interface Measured extends Scanned {
  readonly status: number | undefined;
  readonly transfer: Readonly<Record<ResourceKind, Transferred>>;
  readonly totalBytes: number;
  readonly requests: number;
  readonly fonts: readonly string[];
  readonly lcpMs: number;
  readonly lcpElement: string;
  readonly cls: number;
  readonly ttfbMs: number;
  readonly loadMs: number;
}

interface BaselineResults {
  readonly site: string;
  readonly commit: string;
  readonly takenAt: string;
  readonly email: string;
  readonly widths: readonly number[];
  readonly appearances: readonly string[];
  // The measured page loads.
  readonly loads: readonly Measured[];
  // The other views, brought to their states and scanned with axe.
  readonly states: readonly Scanned[];
}

const KIB = 1024;
const HEAVIEST = 5;
// Layout shift this large or more is listed; 0.1 is the "needs improvement"
// line of Core Web Vitals.
const SHIFT_NOTED = 0.01;
const SHIFT_POOR = 0.1;
const LCP_POOR_MS = 2500;
const CLS_DIGITS = 3;
const EXAMPLES = 2;
const IMPACTS: readonly string[] = ["critical", "serious", "moderate", "minor"];

function kib(bytes: number): string {
  return (bytes / KIB).toFixed(1);
}

function loadLabel(load: Scanned): string {
  return `${load.name}, ${load.appearance}, ${load.width} px`;
}

function row(cells: readonly (number | string)[]): string {
  return `| ${cells.join(" | ")} |`;
}

function header(cells: readonly string[]): string[] {
  return [row(cells), row(cells.map((): string => "---"))];
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function loadRows(loads: readonly Measured[]): string[] {
  const lines = header([
    "View",
    "Width",
    "Appearance",
    "Total KiB",
    "Document",
    "CSS",
    "JS",
    "Fonts (files)",
    "Images",
    "Other",
    "Requests",
    "LCP ms",
    "LCP element",
    "CLS",
  ]);
  for (const load of loads) {
    const { transfer } = load;
    lines.push(
      row([
        load.name,
        load.width,
        load.appearance,
        kib(load.totalBytes),
        kib(transfer.document.bytes),
        kib(transfer.css.bytes),
        kib(transfer.js.bytes),
        `${kib(transfer.fonts.bytes)} (${transfer.fonts.count})`,
        kib(transfer.images.bytes),
        kib(transfer.other.bytes),
        load.requests,
        Math.round(load.lcpMs),
        `\`${load.lcpElement}\``,
        load.cls.toFixed(CLS_DIGITS),
      ]),
    );
  }
  return lines;
}

function fontLines(loads: readonly Measured[]): string[] {
  const fonts = unique(
    loads.flatMap((load: Measured): string[] => [...load.fonts]),
  );
  const counts = loads.map((load: Measured): number => load.fonts.length);
  const least = Math.min(...counts);
  const most = Math.max(...counts);
  let fetched = `${least} to ${most}`;
  if (least === most) {
    fetched = `${least}`;
  }
  const lines = [
    `Each load fetches ${fetched} font files, ${fonts.length} different files in all:`,
    "",
  ];
  for (const font of fonts.sort((a: string, b: string): number =>
    a.localeCompare(b),
  )) {
    const using = loads.filter((load: Measured): boolean =>
      load.fonts.includes(font),
    );
    lines.push(`- \`${font}\`: ${using.length} of ${loads.length} loads`);
  }
  return lines;
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return (
    values.reduce((sum: number, value: number): number => sum + value, 0) /
    values.length
  );
}

function notableLines(results: BaselineResults): string[] {
  const { loads } = results;
  const lines: string[] = ["Heaviest loads:", ""];
  const heaviest = [...loads]
    .sort((a: Measured, b: Measured): number => b.totalBytes - a.totalBytes)
    .slice(0, HEAVIEST);
  for (const load of heaviest) {
    lines.push(
      `- ${loadLabel(load)}: ${kib(load.totalBytes)} KiB, of which images ${kib(load.transfer.images.bytes)}, JS ${kib(load.transfer.js.bytes)} and fonts ${kib(load.transfer.fonts.bytes)}.`,
    );
  }
  lines.push("", "Average transfer by appearance:", "");
  for (const appearance of results.appearances) {
    const own = loads.filter(
      (load: Measured): boolean => load.appearance === appearance,
    );
    const total = average(own.map((load: Measured): number => load.totalBytes));
    const images = average(
      own.map((load: Measured): number => load.transfer.images.bytes),
    );
    lines.push(
      `- ${appearance}: ${kib(total)} KiB a load, ${kib(images)} KiB of it images.`,
    );
  }
  const shifted = loads.filter(
    (load: Measured): boolean => load.cls >= SHIFT_NOTED,
  );
  lines.push("");
  if (shifted.length === 0) {
    lines.push(`No load shifted its layout by ${SHIFT_NOTED} or more.`);
  } else {
    lines.push(
      `Loads with layout shift of ${SHIFT_NOTED} or more (${SHIFT_POOR} is poor):`,
      "",
    );
    for (const load of shifted) {
      lines.push(`- ${loadLabel(load)}: CLS ${load.cls.toFixed(CLS_DIGITS)}.`);
    }
  }
  const slow = loads.filter(
    (load: Measured): boolean => load.lcpMs >= LCP_POOR_MS,
  );
  lines.push("");
  if (slow.length === 0) {
    lines.push(
      `No load's Largest Contentful Paint took ${LCP_POOR_MS} ms or more.`,
    );
  } else {
    lines.push(
      `Loads whose Largest Contentful Paint took ${LCP_POOR_MS} ms or more:`,
      "",
    );
    for (const load of slow) {
      lines.push(
        `- ${loadLabel(load)}: ${Math.round(load.lcpMs)} ms (\`${load.lcpElement}\`).`,
      );
    }
  }
  return lines;
}

function impactRank(impact: string): number {
  const rank = IMPACTS.indexOf(impact);
  if (rank === -1) {
    return IMPACTS.length;
  }
  return rank;
}

// Each violated rule, with every scan that found it.
function byRule(
  scans: readonly Scanned[],
): Map<string, { violation: AxeViolation; scans: Scanned[]; nodes: number }> {
  const rules = new Map<
    string,
    { violation: AxeViolation; scans: Scanned[]; nodes: number }
  >();
  for (const scan of scans) {
    for (const violation of scan.violations) {
      const found = rules.get(violation.id) ?? {
        violation,
        scans: [],
        nodes: 0,
      };
      found.scans.push(scan);
      found.nodes += violation.nodes;
      rules.set(violation.id, found);
    }
  }
  return rules;
}

function axeLines(results: BaselineResults): string[] {
  const scans: Scanned[] = [...results.loads, ...results.states];
  const rules = [...byRule(scans).values()].sort(
    (a, b): number =>
      impactRank(a.violation.impact) - impactRank(b.violation.impact) ||
      b.scans.length - a.scans.length,
  );
  const views = unique(scans.map((scan: Scanned): string => scan.name));
  const lines = [
    `axe made ${scans.length} scans of ${views.length} views, one in each appearance at each width, for WCAG 2.2 A and AA and best practice.`,
    "",
  ];
  if (rules.length === 0) {
    lines.push("It found no violations.");
    return lines;
  }
  lines.push(
    ...header([
      "Rule",
      "Impact",
      "What it checks",
      "Views",
      "Scans",
      "Elements",
    ]),
  );
  for (const rule of rules) {
    const { violation } = rule;
    lines.push(
      row([
        `[${violation.id}](${violation.helpUrl})`,
        violation.impact,
        violation.help,
        unique(rule.scans.map((scan: Scanned): string => scan.name)).length,
        rule.scans.length,
        rule.nodes,
      ]),
    );
  }
  for (const rule of rules) {
    const { violation } = rule;
    const names = unique(rule.scans.map((scan: Scanned): string => scan.name));
    lines.push(
      "",
      `### ${violation.id}`,
      "",
      `${violation.help} (${violation.impact}).`,
      "",
    );
    for (const name of names) {
      const own = rule.scans.filter(
        (scan: Scanned): boolean => scan.name === name,
      );
      const where = unique(
        own.map((scan: Scanned): string => `${scan.appearance} ${scan.width}`),
      );
      lines.push(`- ${name}: ${where.join(", ")}`);
    }
    lines.push("", "For example:", "");
    for (const example of violation.examples.slice(0, EXAMPLES)) {
      lines.push(`- \`${example.target}\`: \`${example.html}\``);
    }
  }
  return lines;
}

function problemLines(results: BaselineResults): string[] {
  const troubled = [...results.loads, ...results.states].filter(
    (scan: Scanned): boolean => scan.problems.length > 0,
  );
  if (troubled.length === 0) {
    return ["Every view reached its state."];
  }
  return [
    "These views didn't reach their state, so their figures may be wrong:",
    "",
    ...troubled.map(
      (scan: Scanned): string =>
        `- ${loadLabel(scan)}: ${scan.problems.join(" ")}`,
    ),
  ];
}

function baselineSummary(results: BaselineResults): string {
  const lines = [
    "# Baseline before the theme redesign",
    "",
    `Taken ${results.takenAt} from ${results.site}, at commit ${results.commit}, as ${results.email} or signed out. The results are in \`baseline.json\`; \`mise run visual-baseline\` takes them again.`,
    "",
    "Each page was loaded in a fresh browser with an empty cache, on this computer, without network or CPU throttling. Transfer sizes are compressed bytes on the wire, headers included. LCP and CLS are this computer's: compare them between runs, not with field data.",
    "",
    "## Notable",
    "",
    ...notableLines(results),
    "",
    "## Accessibility",
    "",
    ...axeLines(results),
    "",
    "## Page loads",
    "",
    "Sizes are in KiB.",
    "",
    ...loadRows(results.loads),
    "",
    "## Fonts",
    "",
    ...fontLines(results.loads),
    "",
    "## Problems",
    "",
    ...problemLines(results),
    "",
  ];
  return lines.join("\n");
}

export type {
  AxeExample,
  AxeViolation,
  BaselineResults,
  Measured,
  ResourceKind,
  Scanned,
  Transferred,
};
export { baselineSummary };
