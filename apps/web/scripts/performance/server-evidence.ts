import { z } from "zod";

const NONNEGATIVE = z.number().finite().nonnegative();
const SAMPLE = z.number().int().positive();
const LOAD = z.tuple([NONNEGATIVE, NONNEGATIVE, NONNEGATIVE]);
const SPAN = z.strictObject({
  operation: z.enum([
    "current-user",
    "today",
    "home-summary",
    "workshop-options",
    "construct-metadata",
    "construct-data",
    "activity-metadata",
    "activity-data",
    "spell-metadata",
    "spell-data",
  ]),
  durationMs: NONNEGATIVE,
  queryCount: z.number().int().nonnegative(),
});
const COMMON = z.strictObject({
  sample: SAMPLE,
  phase: z.enum(["initial", "confirmation"]),
  name: z.enum(["home", "editor"]),
  variant: z.enum(["before", "after"]),
  hostLoad: LOAD,
  spans: z.array(SPAN),
  headersMs: NONNEGATIVE,
});
const DOCUMENT_ROW = COMMON.extend({
  shellMarkupMs: NONNEGATIVE.nullable(),
  primaryMarkupMs: NONNEGATIVE.nullable(),
  completeMs: NONNEGATIVE,
});
const BROWSER_ROW = COMMON.extend({
  profile: z.enum(["desktop", "phone"]),
  cache: z.enum(["cold", "warm"]),
  logicalCpus: z.number().int().positive(),
  shellMs: NONNEGATIVE.optional(),
  primaryMs: NONNEGATIVE.optional(),
  requestToHeadersMs: NONNEGATIVE,
  documentCompleteMs: NONNEGATIVE,
  domContentLoadedMs: NONNEGATIVE,
  primaryPresent: z.literal(true),
  resources: z.array(
    z.strictObject({
      kind: z.enum([
        "script",
        "link",
        "fetch",
        "css",
        "img",
        "other",
        "navigation",
        "xmlhttprequest",
        "beacon",
      ]),
      startTime: NONNEGATIVE,
      duration: NONNEGATIVE,
      transferSize: NONNEGATIVE,
    }),
  ),
});
const BROWSER_ARCHIVE = z.strictObject({
  browser: z.string().regex(/^(?:HeadlessChrome|Chrome)\/156\.0\.8078\.4$/u),
  rows: z.array(BROWSER_ROW).min(1),
});

function validateServerSpans(input: unknown): z.infer<typeof SPAN>[] {
  return z.array(SPAN).parse(input);
}
function validateServerEvidence(
  input: unknown,
  kind: "browser" | "documents",
): unknown {
  if (kind === "browser") {
    return BROWSER_ARCHIVE.parse(input);
  }
  return z.array(DOCUMENT_ROW).min(1).parse(input);
}

export { validateServerEvidence, validateServerSpans };
