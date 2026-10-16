// The usage log (`log-usage-at-finish` in the wiki's Pipeline-Roles-Shared
// page): what each finished session and job spent, as public records in a
// hidden block of the issue's usage comments. This module alone owns the
// records' fields, the kinds of value they may hold (numbers, booleans,
// times and names from fixed sets, never free text), the comment's format
// and its size limit. It does no I/O.

import { z } from "zod";
import { USAGE_MARK, usageMark } from "../comments.ts";
import type { RoleName } from "../roles/registry.ts";
import { ROLE_NAMES } from "../roles/registry.ts";
import type { JsonSchema } from "../workflow/schemas.ts";
import { isRecord } from "../workflow/stages/reply-guards.ts";
import { STAGE_ORDER } from "../workflow/sweep-config.ts";
import type { ContextLimits } from "./context-watch.ts";
import { turnContext } from "./context-watch.ts";
import type { Usage } from "./raw-results.ts";
import { addUsage, recordFacts, ZERO_USAGE } from "./raw-results.ts";
import type { RunEnd } from "./runner.ts";

// GitHub refuses a comment longer than this.
const COMMENT_LIMIT = 65_536;
const VISIBLE_LINE = "Issue pipeline usage records (hidden; see the wiki)";
const BLOCK_START = "<!--";
const BLOCK_END = "-->";
// A name from a fixed set that pi or a role supplies: one token, with no
// space, `/`, `<` or `>`.
const NAME = /^[A-Za-z0-9][\w.:-]{0,99}$/u;
const REPO = /^[\w.-]+\/[\w.-]+$/u;
const WHITESPACE = /\s/u;
// The name a tool whose name isn't a NAME is counted under.
const OTHER_TOOL = "other";

type Ended = "reply" | "handoff" | "context-stop" | "error" | "aborted";
type Outcome = RunEnd["kind"];

const ENDED: readonly Ended[] = [
  "reply",
  "handoff",
  "context-stop",
  "error",
  "aborted",
];
const OUTCOMES: readonly Outcome[] = [
  "saved",
  "next",
  "stopped",
  "released",
  "held",
  "interrupted",
];

interface ToolUse {
  calls: number;
  outputChars: number;
}

interface ToolOutput {
  tool: string;
  chars: number;
}

// What one launch's sessions (a session and its retry) spent: assistant
// turns with usage, tokens, the first, highest and last turn's context,
// whether a turn passed `soft`, whether the context watch stopped the
// session whose result the launch gives, each tool's calls and output, the
// largest single output, and the seconds it ran.
interface LaunchUsage {
  turns: number;
  tokens: Usage;
  first: number;
  peak: number;
  atFinish: number;
  steered: boolean;
  stopped: boolean;
  tools: Readonly<Record<string, ToolUse>>;
  largest: ToolOutput | null;
  seconds: number;
}

// A launch's tally, fed every record its sessions print and each stop.
interface UsageTally {
  record: (key: string, record: unknown) => void;
  contextStopped: (key: string) => void;
  usage: (seconds: number) => LaunchUsage;
}

// What the runner knows of a finished session.
interface SessionEntry {
  kind: "session";
  at: string;
  stage: string;
  state: string;
  name: string;
  agent: string;
  model: string;
  attempt: number;
  taskChars: number;
  schema: JsonSchema;
  ended: Ended;
  reply: unknown;
  launch: LaunchUsage;
}

// What the runner knows of a finished run.
interface JobEntry {
  kind: "job";
  at: string;
  stages: readonly string[];
  outcome: Outcome;
  seconds: number;
  tokens: Usage;
  issueTokens: number;
}

type UsageEntry = SessionEntry | JobEntry;

// The job's identity and settings a record carries.
interface UsageContext {
  repo: string;
  issue: number;
  job: string;
  role: RoleName;
  limits: ContextLimits;
  budget: number;
}

const COUNT = z.number().nonnegative();
const NAMED = z.string().regex(NAME);
const STAGE = z.enum([...STAGE_ORDER, "done"]);
const RELATIVE_PATH = z
  .string()
  .min(1)
  .refine(
    (file) =>
      !(file.startsWith("/") || file.startsWith("~")) &&
      !file.split("/").includes("..") &&
      !WHITESPACE.test(file),
    "must be a relative path",
  );
const TOKENS = z.strictObject({
  input: COUNT,
  output: COUNT,
  cacheRead: COUNT,
  cacheWrite: COUNT,
});
const IDENTITY = {
  at: z.iso.datetime(),
  repo: z.string().regex(REPO),
  issue: z.number().int().positive(),
  job: z.uuid(),
  role: z.enum(ROLE_NAMES),
};
const SESSION_RECORD = z.strictObject({
  kind: z.literal("session"),
  ...IDENTITY,
  stage: STAGE,
  state: NAMED,
  name: NAMED,
  agent: NAMED,
  model: NAMED,
  attempt: z.number().int().positive(),
  ended: z.enum(ENDED),
  reply: NAMED.nullable(),
  seconds: COUNT,
  turns: COUNT,
  tokens: TOKENS,
  context: z.strictObject({
    first: COUNT,
    peak: COUNT,
    atFinish: COUNT,
    soft: COUNT,
    hard: COUNT,
    window: COUNT.nullable(),
    steered: z.boolean(),
  }),
  task: z.strictObject({ chars: COUNT, files: z.record(RELATIVE_PATH, COUNT) }),
  tools: z.record(NAMED, z.strictObject({ calls: COUNT, outputChars: COUNT })),
  largestToolOutput: z.strictObject({ tool: NAMED, chars: COUNT }).nullable(),
});
const JOB_RECORD = z.strictObject({
  kind: z.literal("job"),
  ...IDENTITY,
  stages: z.array(STAGE),
  outcome: z.enum(OUTCOMES),
  seconds: COUNT,
  tokens: TOKENS,
  issueTokens: COUNT,
  budget: COUNT,
});
const USAGE_RECORD = z.discriminatedUnion("kind", [SESSION_RECORD, JOB_RECORD]);

type UsageRecord = z.infer<typeof USAGE_RECORD>;
type SessionRecord = z.infer<typeof SESSION_RECORD>;

// The record's own fields, before the serializer checks their values.
type Unchecked<T> = {
  [K in keyof T]: T[K] extends string ? string : Unchecked<T[K]>;
};

interface Tally {
  turns: number;
  tokens: Usage;
  first: number | null;
  peak: number;
  atFinish: number;
  steered: boolean;
  last: string | null;
  stops: Set<string>;
  tools: Map<string, ToolUse>;
  largest: ToolOutput | null;
}

function addRecord(tally: Tally, soft: number, record: unknown): void {
  const { usage, toolEnd } = recordFacts(record);
  if (usage !== null) {
    const context = turnContext(usage);
    tally.turns += 1;
    tally.tokens = addUsage(tally.tokens, usage);
    tally.first ??= context;
    tally.peak = Math.max(tally.peak, context);
    tally.atFinish = context;
    tally.steered ||= context > soft;
  }
  if (toolEnd !== null) {
    const { tool, outputChars } = toolEnd;
    const use = tally.tools.get(tool) ?? { calls: 0, outputChars: 0 };
    tally.tools.set(tool, {
      calls: use.calls + 1,
      outputChars: use.outputChars + outputChars,
    });
    if (outputChars > (tally.largest?.chars ?? -1)) {
      tally.largest = { tool, chars: outputChars };
    }
  }
}

// A fresh tally for one launch whose sessions are held to `soft`.
function usageTally(soft: number): UsageTally {
  const tally: Tally = {
    turns: 0,
    tokens: ZERO_USAGE,
    first: null,
    peak: 0,
    atFinish: 0,
    steered: false,
    last: null,
    stops: new Set(),
    tools: new Map(),
    largest: null,
  };
  return {
    record: (key: string, record: unknown): void => {
      tally.last = key;
      addRecord(tally, soft, record);
    },
    contextStopped: (key: string): void => {
      tally.stops.add(key);
    },
    usage: (seconds: number): LaunchUsage => ({
      turns: tally.turns,
      tokens: tally.tokens,
      first: tally.first ?? 0,
      peak: tally.peak,
      atFinish: tally.atFinish,
      steered: tally.steered,
      stopped: tally.last !== null && tally.stops.has(tally.last),
      tools: Object.fromEntries(tally.tools),
      largest: tally.largest,
      seconds,
    }),
  };
}

function toolName(tool: string): string {
  if (NAME.test(tool)) {
    return tool;
  }
  return OTHER_TOOL;
}

function toolsOf(
  tools: Readonly<Record<string, ToolUse>>,
): Record<string, ToolUse> {
  const named = new Map<string, ToolUse>();
  for (const [tool, use] of Object.entries(tools)) {
    const name = toolName(tool);
    const sum = named.get(name) ?? { calls: 0, outputChars: 0 };
    named.set(name, {
      calls: sum.calls + use.calls,
      outputChars: sum.outputChars + use.outputChars,
    });
  }
  return Object.fromEntries(named);
}

// The reply's decision, verdict or status, when its value is one its
// property's enum in `schema` lists.
function replyOf(reply: unknown, schema: JsonSchema): string | null {
  if (!isRecord(reply)) {
    return null;
  }
  const { decision, verdict, status } = reply;
  const { properties = {} } = schema;
  const fields: [unknown, JsonSchema | undefined][] = [
    [decision, properties.decision],
    [verdict, properties.verdict],
    [status, properties.status],
  ];
  for (const [value, property] of fields) {
    if (typeof value === "string" && property?.enum?.includes(value)) {
      return value;
    }
  }
  return null;
}

// The `session` record of a finished session.
function usageRecord(
  launch: SessionEntry,
  context: UsageContext,
): Unchecked<SessionRecord> {
  const { repo, issue, job, role, limits } = context;
  const { launch: used } = launch;
  let largestToolOutput: ToolOutput | null = null;
  if (used.largest !== null) {
    const { tool, chars } = used.largest;
    largestToolOutput = { tool: toolName(tool), chars };
  }
  return {
    kind: "session",
    at: launch.at,
    repo,
    issue,
    job,
    role,
    stage: launch.stage,
    state: launch.state,
    name: launch.name,
    agent: launch.agent,
    model: launch.model,
    attempt: launch.attempt,
    ended: launch.ended,
    reply: replyOf(launch.reply, launch.schema),
    seconds: used.seconds,
    turns: used.turns,
    tokens: used.tokens,
    context: {
      first: used.first,
      peak: used.peak,
      atFinish: used.atFinish,
      soft: limits.soft,
      hard: limits.hard,
      window: null,
      steered: used.steered,
    },
    task: { chars: launch.taskChars, files: {} },
    tools: toolsOf(used.tools),
    largestToolOutput,
  };
}

// The `job` record of a finished run.
function jobRecord(
  job: JobEntry,
  context: UsageContext,
): Unchecked<z.infer<typeof JOB_RECORD>> {
  const { repo, issue, role, budget } = context;
  const { at, outcome, seconds, tokens, issueTokens } = job;
  const stages = [...job.stages];
  return {
    kind: "job",
    at,
    repo,
    issue,
    job: context.job,
    role,
    stages,
    outcome,
    seconds,
    tokens,
    issueTokens,
    budget,
  };
}

// The record as one JSON line. It throws on an unknown key, a value of no
// allowed kind, or a line that would end the comment's hidden block.
function serializeUsage(record: unknown): string {
  const line = JSON.stringify(USAGE_RECORD.parse(record));
  if (line.includes(BLOCK_END)) {
    throw new Error(`usage: a record may not hold ${BLOCK_END}`);
  }
  return line;
}

// The record a line holds, or undefined when it holds none.
function parseUsageLine(line: string): UsageRecord | undefined {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return undefined;
  }
  const parsed = USAGE_RECORD.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}

// The body of issue `issue`'s n-th usage comment, holding `lines`.
function usageBody(issue: number, n: number, lines: readonly string[]): string {
  const records = lines.map((line) => `${line}\n`).join("");
  return `${VISIBLE_LINE}\n${usageMark(issue, n)}\n${BLOCK_START}\n${records}${BLOCK_END}`;
}

// The record lines of a usage comment's body.
function usageLines(body: string): string[] {
  const lines = body.split("\n");
  const start = lines.indexOf(BLOCK_START);
  const end = lines.lastIndexOf(BLOCK_END);
  if (start < 0 || end < start) {
    return [];
  }
  return lines.slice(start + 1, end).filter((line) => line.trim() !== "");
}

// The usage comment `body` with `line` appended, or null when that would
// pass GitHub's limit or `body` carries no usage mark.
function appendedBody(body: string, line: string): string | null {
  const groups = USAGE_MARK.exec(body)?.groups;
  if (groups === undefined) {
    return null;
  }
  const { issue = "", n = "1" } = groups;
  const next = usageBody(Number(issue), Number(n), [...usageLines(body), line]);
  if (next.length > COMMENT_LIMIT) {
    return null;
  }
  return next;
}

export type {
  Ended,
  JobEntry,
  LaunchUsage,
  SessionEntry,
  UsageContext,
  UsageEntry,
  UsageRecord,
  UsageTally,
};
export {
  appendedBody,
  jobRecord,
  parseUsageLine,
  serializeUsage,
  usageBody,
  usageLines,
  usageRecord,
  usageTally,
};
