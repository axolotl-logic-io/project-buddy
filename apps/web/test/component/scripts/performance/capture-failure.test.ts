import { TimeoutError } from "puppeteer-core";
import { expect, test } from "vitest";
import { z } from "zod";
import { captureFailure } from "../../../../scripts/performance/capture-failure.ts";

test("reports capture phase and static category without arbitrary exception payloads", () => {
  expect(
    captureFailure(new TimeoutError("private URL and selector"), "route-link"),
  ).toEqual({ phase: "route-link", kind: "timeout", fields: [] });
  expect(
    captureFailure(new Error("private prompt and session"), "source-control"),
  ).toEqual({ phase: "source-control", kind: "unclassified", fields: [] });
  expect(
    captureFailure(
      new Error("Client link performed a document navigation"),
      "transition-navigation",
    ).kind,
  ).toBe("document-navigation");
});

test("schema failures reveal only allowlisted top-level fields", () => {
  const result = z
    .strictObject({ events: z.number() })
    .safeParse({ events: "private text", privateId: "private" });
  expect(captureFailure(result.error, "validate-result")).toEqual({
    phase: "validate-result",
    kind: "schema",
    fields: ["events"],
  });
});
