import { z } from "zod";

const MINIMUM_SAMPLES = 3;
const AFTER_CONTROL_MS = 2000;
const WINDOW_MS = 5000;
const NONNEGATIVE = z.number().finite().nonnegative();
const NUMBER = z.number().finite();
const TAG = z.string().regex(/^[A-Z][A-Z0-9]*$/u);
const ROUTES = [
  "/home",
  "/quests",
  "/quests/:id",
  "/chat",
  "/chats/:id",
  "/activities",
  "/workshop",
  "/constructs/:id",
] as const;
// Archived measurements retain their captured URLs.
const EARLIER_ROUTES = ["/projects", "/projects/:id"] as const;
const JOURNEYS = [
  "home",
  "quests",
  "quest",
  "adventures",
  "long-adventure",
  "activities",
  "workshop",
  "editor",
] as const;
const MODES = ["cold-direct", "warm-direct", "client-navigation"] as const;
// v5 adds a per-state content check after observation; v4 cohorts predate it.
const PROTOCOLS = ["commit-probe-v4", "commit-probe-v5"] as const;
// How the state's own content was confirmed, without retaining that content.
const CONTENT_CHECKS = [
  "fixture-link",
  "message-count",
  "no-owned-entities",
  "built-in-activities-only",
  "edited-prompt",
] as const;
const PROFILES = ["desktop", "phone"] as const;
const RECT = z.strictObject({
  x: NUMBER,
  y: NUMBER,
  width: NONNEGATIVE,
  height: NONNEGATIVE,
  top: NUMBER.optional(),
  right: NUMBER.optional(),
  bottom: NUMBER.optional(),
  left: NUMBER.optional(),
});
const SHIFT = z.strictObject({
  time: NONNEGATIVE,
  value: NONNEGATIVE,
  recentInput: z.boolean(),
  sources: z
    .array(
      z.strictObject({ tag: TAG.optional(), previous: RECT, current: RECT }),
    )
    .optional(),
});
const GEOMETRY = z.strictObject({
  time: NONNEGATIVE,
  parts: z.array(
    z.strictObject({
      region: z.enum(["header", "main", "column", "input"]),
      x: NUMBER,
      y: NUMBER,
      width: NONNEGATIVE,
      height: NONNEGATIVE,
    }),
  ),
});
const RESOURCE = z.strictObject({
  purpose: z
    .enum(["first-load", "prefetch", "destination", "other"])
    .optional(),
  path: z.enum([
    "/_next/static/:asset.js",
    "/_next/static/:asset.woff2",
    "/_next/static/:asset.css",
    "/artwork/:asset",
    "/other",
    ...ROUTES,
    ...EARLIER_ROUTES,
  ]),
  start: NONNEGATIVE,
  duration: NONNEGATIVE,
  bytes: NONNEGATIVE,
  type: z.enum([
    "script",
    "link",
    "css",
    "img",
    "fetch",
    "other",
    "navigation",
    "xmlhttprequest",
    "beacon",
  ]),
});
const NETWORK_RESOURCE = z.strictObject({
  path: RESOURCE.shape.path,
  method: z.enum(["GET", "POST", "other"]),
  resourceType: z.enum([
    "Document",
    "Script",
    "Font",
    "Image",
    "Stylesheet",
    "Fetch",
    "XHR",
    "Other",
  ]),
  initiator: z.enum(["parser", "script", "preload", "other"]),
  prefetch: z.boolean(),
  start: NONNEGATIVE,
  duration: NONNEGATIVE,
  bytes: NONNEGATIVE,
  status: NONNEGATIVE,
  failed: z.boolean(),
});
type NetworkResource = z.infer<typeof NETWORK_RESOURCE>;
const READINESS = z.strictObject({
  hostLoad: z.tuple([NONNEGATIVE, NONNEGATIVE, NONNEGATIVE]),
  captureProtocol: z.enum(PROTOCOLS),
  contentCheck: z.enum(CONTENT_CHECKS).optional(),
  state: z.enum(["populated", "empty", "empty-detail"]),
  profile: z.enum(PROFILES),
  name: z.enum(JOURNEYS),
  mode: z.enum(MODES),
  sample: z.number().int().positive(),
  path: z.enum([...ROUTES, ...EARLIER_ROUTES]),
  control: z.strictObject({
    firstAttempt: NONNEGATIVE,
    confirmed: NONNEGATIVE,
    attempts: z.number().int().positive(),
    method: z.enum([
      "menu-open",
      "status-tab-state",
      "persisted-draft",
      "send-enabled",
      "adventure-dialog-form",
    ]),
  }),
  origin: NONNEGATIVE,
  shell: NONNEGATIVE,
  primary: NONNEGATIVE,
  end: NONNEGATIVE,
  geometry: z.array(GEOMETRY).min(1),
  scroll: z.array(z.strictObject({ time: NONNEGATIVE, y: NUMBER })),
  shifts: z.array(SHIFT),
  longtasks: z.array(
    z.strictObject({ time: NONNEGATIVE, duration: NONNEGATIVE }),
  ),
  lcp: z.array(
    z.strictObject({
      time: NONNEGATIVE,
      size: NONNEGATIVE,
      tag: TAG.optional(),
    }),
  ),
  events: z.array(
    z.strictObject({
      time: NONNEGATIVE,
      duration: NONNEGATIVE,
      interaction: NONNEGATIVE,
      name: z.enum([
        "auxclick",
        "dblclick",
        "mouseenter",
        "mouseleave",
        "pointercancel",
        "gotpointercapture",
        "lostpointercapture",
        "touchcancel",
        "dragstart",
        "dragend",
        "dragenter",
        "dragleave",
        "dragover",
        "drop",
        "pointerover",
        "pointerenter",
        "pointerdown",
        "pointerup",
        "pointerout",
        "pointerleave",
        "mousedown",
        "mouseup",
        "mouseover",
        "mouseout",
        "click",
        "keydown",
        "keyup",
        "keypress",
        "input",
        "beforeinput",
        "touchstart",
        "touchend",
        "contextmenu",
        "compositionstart",
        "compositionend",
        "compositionupdate",
        "change",
      ]),
    }),
  ),
  nav: z.strictObject({
    responseStart: NONNEGATIVE,
    requestStart: NONNEGATIVE,
    start: NONNEGATIVE,
    dom: NONNEGATIVE,
  }),
  resources: z.array(RESOURCE),
  networkResources: z.array(NETWORK_RESOURCE).optional(),
  prefetches: z.array(RESOURCE).optional(),
  activated: z
    .strictObject({ region: z.literal("route-link"), rect: RECT })
    .nullable(),
  initialSessionWindowCls: NONNEGATIVE.nullable(),
  transitionAllShiftSum: NONNEGATIVE,
});
type ReadinessRow = z.infer<typeof READINESS>;
type ContentCheck = (typeof CONTENT_CHECKS)[number];

function journeys(
  state: ReadinessRow["state"],
): readonly ReadinessRow["name"][] {
  if (state === "empty-detail") {
    return ["quest", "long-adventure"];
  }
  if (state === "empty") {
    return ["home", "quests", "adventures", "activities", "workshop"];
  }
  return JOURNEYS;
}

function parseReadinessRow(input: unknown): ReadinessRow {
  return READINESS.parse(input);
}

type ReadinessSelection = Pick<ReadinessRow, "state" | "profile" | "name">;
const SELECTION = READINESS.pick({ state: true, profile: true, name: true });
function parseReadinessSelection(input: unknown): ReadinessSelection {
  const selection = SELECTION.parse(input);
  if (!journeys(selection.state).includes(selection.name)) {
    throw new Error("Inaccessible diagnostic selection");
  }
  return selection;
}

// Validates a complete planned cohort. Full matrix is the default; a focused
// diagnostic must explicitly name its state, profile and journey.
function validateReadinessRows(
  input: unknown,
  samples: number,
  selection?: ReadinessSelection,
): ReadinessRow[] {
  if (!Number.isInteger(samples) || samples < MINIMUM_SAMPLES) {
    throw new Error("At least three samples required");
  }
  const scope = SELECTION.optional().parse(selection);
  if (scope !== undefined) {
    parseReadinessSelection(scope);
  }
  const rows = z.array(READINESS).parse(input);
  if (new Set(rows.map((row) => row.captureProtocol)).size > 1) {
    throw new Error("Mixed capture protocols");
  }
  const keys = new Set<string>();
  for (const row of rows) {
    if (
      (row.captureProtocol === "commit-probe-v5") !==
      (row.contentCheck !== undefined)
    ) {
      throw new Error("State content check missing");
    }
    if (
      scope !== undefined &&
      (row.state !== scope.state ||
        row.profile !== scope.profile ||
        row.name !== scope.name)
    ) {
      throw new Error("Observation outside diagnostic scope");
    }
    const key = JSON.stringify([
      row.state,
      row.profile,
      row.name,
      row.mode,
      row.sample,
    ]);
    if (keys.has(key)) {
      throw new Error("Duplicate observation");
    }
    keys.add(key);
    if (
      !journeys(row.state).includes(row.name) ||
      row.sample > samples ||
      row.path.replace("/projects", "/quests") !==
        ROUTES[JOURNEYS.indexOf(row.name)]
    ) {
      throw new Error("Invalid authenticated destination");
    }
    let origin = row.nav.start;
    if (row.mode === "client-navigation") {
      ({ origin } = row);
    }
    if (
      row.control.confirmed < row.control.firstAttempt ||
      row.control.firstAttempt < origin ||
      row.end < row.control.confirmed + AFTER_CONTROL_MS ||
      row.end < row.origin + WINDOW_MS ||
      row.primary < origin ||
      row.primary > row.control.confirmed
    ) {
      throw new Error("Invalid observation window or readiness");
    }
    const shifts = row.shifts.map((shift) => JSON.stringify(shift));
    if (new Set(shifts).size !== shifts.length) {
      throw new Error("Duplicate layout shift");
    }
    if (
      row.transitionAllShiftSum !==
      row.shifts.reduce((sum, shift) => sum + shift.value, 0)
    ) {
      throw new Error("Inconsistent all-shift diagnostic");
    }
    if (
      row.shifts.some((shift) => shift.time < origin || shift.time > row.end)
    ) {
      throw new Error("Shift outside observation");
    }
    if (row.mode === "client-navigation") {
      if (
        row.initialSessionWindowCls !== null ||
        row.activated === null ||
        row.resources.some((resource) => resource.start < origin)
      ) {
        throw new Error("Source document attributed to transition");
      }
    } else if (row.initialSessionWindowCls === null || row.activated !== null) {
      throw new Error("Initial-load attribution missing");
    }
  }
  for (const state of ["populated", "empty", "empty-detail"] as const) {
    for (const profile of PROFILES) {
      for (const name of journeys(state)) {
        for (const mode of MODES) {
          for (let sample = 1; sample <= samples; sample += 1) {
            const expected =
              scope === undefined ||
              (state === scope.state &&
                profile === scope.profile &&
                name === scope.name);
            if (
              expected &&
              !keys.has(JSON.stringify([state, profile, name, mode, sample]))
            ) {
              throw new Error("Incomplete audit matrix");
            }
          }
        }
      }
    }
  }
  return rows;
}

const TRACE_EVENT = z.strictObject({
  name: z.string().min(1),
  cat: z.string().optional(),
  ph: z.string().optional(),
  ts: NUMBER.optional(),
  dur: NONNEGATIVE.optional(),
  pid: NONNEGATIVE.optional(),
  tid: NONNEGATIVE.optional(),
  args: z
    .strictObject({
      snapshot: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/u),
      expected_display_time: NUMBER.optional(),
      frame_sequence: NUMBER.optional(),
      source_id: NUMBER.optional(),
    })
    .optional(),
});
const SCREENSHOT_FILES = new Set([
  "home.trace.json.gz",
  "stream.trace.json.gz",
]);
function validateTrace(
  input: unknown,
  filename: string,
): z.infer<typeof TRACE_EVENT>[] {
  const { traceEvents } = z
    .strictObject({ traceEvents: z.array(TRACE_EVENT) })
    .parse(input);
  for (const event of traceEvents) {
    if (event.name === "Screenshot" && !SCREENSHOT_FILES.has(filename)) {
      throw new Error("Forbidden screenshot event");
    }
    if (event.args !== undefined && event.name !== "Screenshot") {
      throw new Error("Forbidden event arguments");
    }
  }
  return traceEvents;
}

// Design boundary only: no observer, transport, endpoint or collection is enabled.
const FIELD_METRIC = z.strictObject({
  metric: z.enum(["LCP", "INP", "CLS"]),
  value: NONNEGATIVE,
  rating: z.enum(["good", "needs-improvement", "poor"]),
  release: z.string().regex(/^[0-9a-f]{40}$/u),
  device: z.enum(PROFILES),
  route: z.enum([...ROUTES, ...EARLIER_ROUTES]),
});
function validateFieldMetric(input: unknown): z.infer<typeof FIELD_METRIC> {
  return FIELD_METRIC.parse(input);
}

export type { ContentCheck, NetworkResource, ReadinessRow, ReadinessSelection };
export {
  CONTENT_CHECKS,
  JOURNEYS,
  journeys,
  MODES,
  PROFILES,
  parseReadinessRow,
  parseReadinessSelection,
  validateFieldMetric,
  validateReadinessRows,
  validateTrace,
};
