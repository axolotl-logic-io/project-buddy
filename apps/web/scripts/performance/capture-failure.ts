import { TimeoutError } from "puppeteer-core";
import { z } from "zod";

type CapturePhase =
  | "context"
  | "source-navigation"
  | "source-content"
  | "source-control"
  | "route-link"
  | "transition-navigation"
  | "document-navigation"
  | "primary-content"
  | "control-probe"
  | "observation"
  | "state-content"
  | "read-result"
  | "validate-result"
  | "persist-result"
  | "trace";
const SCHEMA_FIELDS = z.enum([
  "events",
  "geometry",
  "resources",
  "networkResources",
  "prefetches",
  "control",
  "lcp",
  "shifts",
  "nav",
  "hostLoad",
  "shell",
  "primary",
  "end",
  "origin",
  "activated",
  "captureProtocol",
  "contentCheck",
]);
const EVENT_PROPERTIES = z.enum(["name", "time", "duration", "interaction"]);
const KNOWN_ERRORS = new Map([
  ["Expected visible control absent", "control-absent"],
  ["Control readiness not confirmed", "control-unconfirmed"],
  ["Client link performed a document navigation", "document-navigation"],
  ["Invalid authenticated source", "source-invalid"],
  ["Intended authenticated destination not reached", "destination-invalid"],
  ["Non-2xx destination", "destination-status"],
  ["State content not observed", "content-absent"],
]);

// Preserve actionable failure categories without serializing exceptions,
// selectors, URLs, schema values or arbitrary error messages.
function captureFailure(
  error: unknown,
  phase: CapturePhase,
): { phase: CapturePhase; kind: string; fields: string[] } {
  if (error instanceof z.ZodError) {
    const fields = error.issues.flatMap((issue) => {
      const [field] = issue.path;
      const parsed = SCHEMA_FIELDS.safeParse(field);
      if (parsed.success) {
        const property = EVENT_PROPERTIES.safeParse(issue.path.at(-1));
        if (issue.path.length > 1 && property.success) {
          return [`${parsed.data}.${property.data}`];
        }
        return [parsed.data];
      }
      return [];
    });
    return { phase, kind: "schema", fields: [...new Set(fields)] };
  }
  if (error instanceof TimeoutError) {
    return { phase, kind: "timeout", fields: [] };
  }
  if (error instanceof Error) {
    return {
      phase,
      kind: KNOWN_ERRORS.get(error.message) ?? "unclassified",
      fields: [],
    };
  }
  return { phase, kind: "unclassified", fields: [] };
}

export type { CapturePhase };
export { captureFailure };
