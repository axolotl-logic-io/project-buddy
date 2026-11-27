import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TestInfo } from "@playwright/test";
import type lighthouse from "lighthouse";
import { z } from "zod";
import { ACTION, PAGE, PROFILE } from "./options.ts";
import { auditRun } from "./run-options.ts";

const PERCENT = 100;

type Report = NonNullable<Awaited<ReturnType<typeof lighthouse>>>;
type Result = Report["lhr"];

const CASE = z.enum(["cold", "warm", "change", "snapshot", ...ACTION.options]);
const NUMBERS = z.record(z.string(), z.number());
const SAMPLE = z.object({
  page: PAGE,
  profile: PROFILE,
  sample: z.number().int().positive(),
  browser: z.string().optional(),
  cases: z.array(
    z.object({
      name: CASE,
      numbers: NUMBERS,
      lighthouse: z.string().optional(),
      report: z.string().optional(),
      failures: z.array(z.string()),
      change: z.object({ from: z.string(), to: z.string() }).optional(),
      diagnostics: z.record(z.string(), NUMBERS).optional(),
      failedAudits: z.record(z.string(), z.array(z.string())).optional(),
    }),
  ),
  failures: z.array(z.string()),
});

const METRICS = {
  "largest-contentful-paint": "lcpMs",
  "interaction-to-next-paint": "inpMs",
  "total-blocking-time": "tbtMs",
  "cumulative-layout-shift": "cls",
  "speed-index": "speedIndexMs",
  "mainthread-work-breakdown": "mainThreadMs",
  "bootup-time": "jsExecutionMs",
};
const DIAGNOSTICS = [
  "unused-javascript",
  "unused-css-rules",
  "render-blocking-insight",
  "image-delivery-insight",
  "font-display-insight",
  "cache-insight",
  "network-dependency-tree-insight",
  "mainthread-work-breakdown",
  "bootup-time",
  "long-tasks",
];
type Sample = z.infer<typeof SAMPLE>;
type Case = Sample["cases"][number];

function estimatedSavings(
  audit: Result["audits"][string],
): Record<string, number> {
  const savings: Record<string, number> = {};
  for (const [metric, value] of Object.entries(audit.metricSavings ?? {})) {
    if (value !== undefined) {
      savings[`${metric}Ms`] = value;
    }
  }
  if (audit.details?.type === "opportunity") {
    const { overallSavingsMs, overallSavingsBytes } = audit.details;
    if (overallSavingsMs !== undefined) {
      Object.assign(savings, { savingsMs: overallSavingsMs });
    }
    if (overallSavingsBytes !== undefined) {
      Object.assign(savings, { savingsBytes: overallSavingsBytes });
    }
  } else if (audit.numericUnit === "byte" && audit.numericValue !== undefined) {
    Object.assign(savings, { savingsBytes: audit.numericValue });
  }
  return savings;
}

function lighthouseNumbers(lhr: Result, result: Case): void {
  result.lighthouse = lhr.lighthouseVersion;
  for (const [id, name] of Object.entries(METRICS)) {
    const { [id]: audit } = lhr.audits;
    if (audit?.numericValue !== undefined) {
      result.numbers[name] = audit.numericValue;
    }
  }
  const { "long-tasks": longTasks } = lhr.audits;
  if (longTasks?.details?.type === "table") {
    Object.assign(result.numbers, {
      longTasks: longTasks.details.items.length,
    });
  }
  result.diagnostics = {};
  for (const [id, audit] of Object.entries(lhr.audits)) {
    if (DIAGNOSTICS.includes(id)) {
      result.diagnostics[id] = estimatedSavings(audit);
    }
  }
  result.failedAudits = {};
  for (const [id, category] of Object.entries(lhr.categories)) {
    if (category.score !== null) {
      result.numbers[`${id}Score`] = category.score * PERCENT;
    }
    if (id !== "performance") {
      result.failedAudits[id] = category.auditRefs
        .map(({ id: auditId }) => lhr.audits[auditId])
        .filter((audit) => audit?.score !== null && (audit?.score ?? 1) < 1)
        .map((audit) => audit?.id ?? "");
    }
  }
}

function lighthouseProblems(lhr: Result, url: string): string[] {
  const failures = lhr.runWarnings.map(
    (warning) => `Lighthouse warning: ${warning}`,
  );
  if (
    lhr.finalDisplayedUrl !== url ||
    (lhr.gatherMode === "navigation" &&
      (lhr.requestedUrl !== url || lhr.mainDocumentUrl !== url))
  ) {
    failures.push(
      `Lighthouse address check: expected ${url}, requested ${lhr.requestedUrl ?? "—"}, document ${lhr.mainDocumentUrl ?? "—"}, displayed ${lhr.finalDisplayedUrl}`,
    );
  }
  if (lhr.runtimeError !== undefined) {
    failures.push(`Lighthouse run error: ${lhr.runtimeError.message}`);
  }
  for (const audit of Object.values(lhr.audits)) {
    if (
      audit.scoreDisplayMode === "error" ||
      audit.errorMessage !== undefined
    ) {
      failures.push(
        `Lighthouse audit error (${audit.id}): ${audit.errorMessage ?? "unknown error"}`,
      );
    }
    for (const warning of audit.warnings ?? []) {
      failures.push(`Lighthouse audit warning (${audit.id}): ${warning}`);
    }
  }
  return failures;
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
  result.report = `${sample.page}-${sample.profile}-${sample.sample}-${result.name}.json`;
  await writeFile(
    join(auditRun().directory, result.report),
    JSON.stringify(lhr),
  );
  lighthouseNumbers(lhr, result);
  result.failures.push(...lighthouseProblems(lhr, url));
}

async function reportSample(
  sample: Sample,
  testInfo: TestInfo,
): Promise<string[]> {
  await testInfo.attach("audit-sample", {
    body: JSON.stringify(sample),
    contentType: "application/json",
  });
  return [
    ...sample.failures,
    ...sample.cases.flatMap(({ name, failures }) =>
      failures.map((failure) => `${name}: ${failure}`),
    ),
  ];
}

export type { Case, Sample };
export { keepReport, reportSample, SAMPLE };
