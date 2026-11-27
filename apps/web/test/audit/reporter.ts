import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import type {
  FullResult,
  Reporter,
  TestCase,
  TestError,
  TestResult,
} from "@playwright/test/reporter";
import { z } from "zod";
import { type Case, SAMPLE, type Sample } from "./results.ts";
import { auditRun } from "./run-options.ts";

const DISPLAY_DECIMALS = 3;
const TOP_DIAGNOSTICS = 3;

const RANGE = z.object({
  median: z.number(),
  min: z.number(),
  max: z.number(),
  count: z.number(),
});
const ROW = z.object({
  page: z.string(),
  profile: z.string(),
  case: z.string(),
  numbers: z.record(z.string(), RANGE.nullable()),
});
const SUMMARY = z.object({ rows: z.array(ROW) });

type Range = z.infer<typeof RANGE>;
type Row = z.infer<typeof ROW>;

const HEADLINES = [
  "lcpMs",
  "tbtMs",
  "cls",
  "speedIndexMs",
  "feedbackMs",
  "swapMs",
  "singleSwap",
  "layoutShifts",
  "jsBytes",
  "fontBytes",
  "imageBytes",
  "prefetchBytes",
  "accessibilityScore",
  "best-practicesScore",
];

function range(values: number[]): Range | null {
  const sorted = values.toSorted((a, b) => a - b);
  const count = sorted.length;
  const min = sorted.at(0);
  const max = sorted.at(-1);
  const lower = sorted.at(Math.floor((count - 1) / 2));
  const upper = sorted.at(Math.floor(count / 2));
  if (
    min === undefined ||
    max === undefined ||
    lower === undefined ||
    upper === undefined
  ) {
    return null;
  }
  return { median: (lower + upper) / 2, min, max, count };
}

function valuesOf(sample: Case): [string, number][] {
  const values = Object.entries(sample.numbers);
  for (const [audit, savings] of Object.entries(sample.diagnostics ?? {})) {
    for (const [name, value] of Object.entries(savings)) {
      values.push([`${audit}.${name}`, value]);
    }
  }
  return values;
}

function rowsOf(samples: Sample[]): Row[] {
  const cases = new Map<string, { row: Row; values: Map<string, number[]> }>();
  for (const { page, profile, cases: results, failures } of samples) {
    for (const result of results) {
      const key = `${page}/${profile}/${result.name}`;
      let group = cases.get(key);
      if (group === undefined) {
        group = {
          row: { page, profile, case: result.name, numbers: {} },
          values: new Map(),
        };
        if (result.name === "change") {
          Object.assign(group.row.numbers, { feedbackMs: null });
        }
        cases.set(key, group);
      }
      for (const [name, number] of valuesOf(result)) {
        const values = group.values.get(name) ?? [];
        if (failures.length === 0 && result.failures.length === 0) {
          values.push(number);
        }
        group.values.set(name, values);
      }
    }
  }
  return Array.from(cases.values(), ({ row, values }) => {
    for (const [name, numbers] of values) {
      row.numbers[name] = range(numbers);
    }
    return row;
  });
}

function display(value: number): string {
  return String(Number(value.toFixed(DISPLAY_DECIMALS)));
}

function printSummary(rows: Row[]): void {
  for (const row of rows) {
    const entries = HEADLINES.flatMap((name) => {
      const { [name]: stats } = row.numbers;
      if (stats === undefined) {
        return [];
      }
      if (stats === null) {
        return [`${name}=—`];
      }
      return [
        `${name}=${display(stats.median)} [${display(stats.min)}–${display(stats.max)}]`,
      ];
    });
    process.stdout.write(
      `${row.page} ${row.profile} ${row.case}  ${entries.join("  ")}\n`,
    );
  }
  const diagnostics = new Map<string, number>();
  for (const { numbers } of rows) {
    for (const [name, stats] of Object.entries(numbers)) {
      if (
        name.includes(".") &&
        stats !== null &&
        stats.median > (diagnostics.get(name) ?? 0)
      ) {
        diagnostics.set(name, stats.median);
      }
    }
  }
  for (const suffix of ["Ms", "Bytes"]) {
    const top = Array.from(diagnostics)
      .filter(([name]) => name.endsWith(suffix))
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_DIAGNOSTICS)
      .map(([name, number]) => `${name}=${display(number)}`);
    if (top.length > 0) {
      process.stdout.write(`Top estimated savings  ${top.join("  ")}\n`);
    }
  }
}

function formatDelta(
  name: string,
  current: Range | null | undefined,
  baseline: Range | null | undefined,
): string {
  if (
    current === undefined ||
    current === null ||
    baseline === undefined ||
    baseline === null
  ) {
    return `${name}=—`;
  }
  const delta = current.median - baseline.median;
  let noise = "";
  if (Math.abs(delta) < baseline.max - baseline.min) {
    noise = " (noise)";
  }
  let sign = "";
  if (delta > 0) {
    sign = "+";
  }
  return `${name}=${sign}${display(delta)}${noise}`;
}

async function compareRows(rows: Row[], directory: string): Promise<void> {
  const previous = SUMMARY.parse(
    JSON.parse(await readFile(join(directory, "summary.json"), "utf8")),
  );
  process.stdout.write(`\nChange from ${directory}\n`);
  for (const row of rows) {
    const earlier = previous.rows.find(
      (old) =>
        old.page === row.page &&
        old.profile === row.profile &&
        old.case === row.case,
    );
    const deltas: string[] = [];
    const names = new Set([
      ...Object.keys(row.numbers),
      ...Object.keys(earlier?.numbers ?? {}),
    ]);
    for (const name of names) {
      const { [name]: current } = row.numbers;
      const { [name]: baseline } = earlier?.numbers ?? {};
      deltas.push(formatDelta(name, current, baseline));
    }
    process.stdout.write(
      `${row.page} ${row.profile} ${row.case}  ${deltas.join("  ")}\n`,
    );
  }
}

class AuditReporter implements Reporter {
  private readonly samples: Sample[] = [];
  private readonly failures: { test?: string; messages: string[] }[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    const sample = result.attachments.find(
      ({ name }) => name === "audit-sample",
    );
    if (sample?.body !== undefined) {
      this.samples.push(SAMPLE.parse(JSON.parse(sample.body.toString())));
    }
    if (result.status !== "passed") {
      this.failures.push({
        test: test.title,
        messages: result.errors.map(({ message }) => message ?? result.status),
      });
    }
  }

  onError(error: TestError): void {
    this.failures.push({
      messages: [
        error.message ?? "Playwright reported an error without a message",
      ],
    });
  }

  async onEnd(result: FullResult): Promise<undefined | { status: "failed" }> {
    const { directory, compare } = auditRun();
    const rows = rowsOf(this.samples);
    const summary = {
      status: result.status,
      browser: [
        ...new Set(this.samples.flatMap(({ browser }) => browser ?? [])),
      ],
      lighthouse: [
        ...new Set(
          this.samples.flatMap(({ cases }) =>
            cases.flatMap(({ lighthouse }) => lighthouse ?? []),
          ),
        ),
      ],
      rows,
      samples: this.samples,
      failures: this.failures,
    };
    await writeFile(join(directory, "summary.json"), JSON.stringify(summary));
    printSummary(rows);
    process.stdout.write(`\nAudit JSON  ${directory}\n`);
    if (compare !== undefined) {
      try {
        await compareRows(rows, compare);
      } catch (error) {
        if (error instanceof Error) {
          process.stderr.write(`Comparison failed: ${error.message}\n`);
        } else {
          process.stderr.write(
            "Comparison failed: unable to read the earlier run\n",
          );
        }
        return { status: "failed" };
      }
    }
    return undefined;
  }
}

export default AuditReporter;
