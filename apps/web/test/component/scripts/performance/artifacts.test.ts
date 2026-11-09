import { expect, test } from "vitest";
import {
  validateFieldMetric,
  validateTrace,
} from "../../../../scripts/performance/artifacts.ts";

const RELEASE = "0000000000000000000000000000000000000000";
const FIELD_SAMPLE: Record<string, unknown> = {
  metric: "INP",
  value: 135,
  rating: "good",
  release: RELEASE,
  device: "phone",
  route: "/chats/:id",
};

test("accepts only coarse field attribution without identifiers", () => {
  expect(validateFieldMetric(FIELD_SAMPLE)).toEqual(FIELD_SAMPLE);
  for (const forbidden of [
    { route: "/chats/abc" },
    { route: "/home?prompt=private" },
    { release: "private text" },
    { userId: "abc" },
    { questId: "abc" },
    { adventureId: "abc" },
    { session: "private" },
    { selector: "#private" },
    { url: "https://private.test" },
    { prompt: "private" },
    { text: "private" },
    { attribution: { target: "private" } },
    { value: Number.NaN },
    { value: -1 },
  ]) {
    expect(() =>
      validateFieldMetric({ ...FIELD_SAMPLE, ...forbidden }),
    ).toThrow();
  }
});

test("rejects forbidden screenshot events even without arguments", () => {
  for (const event of [
    { name: "Screenshot" },
    { name: "Screenshot", args: { snapshot: "aGVsbG8=" } },
  ]) {
    for (const filename of [
      "editor.trace.json.gz",
      "activities.trace.json.gz",
      "../home.trace.json.gz",
    ]) {
      expect(() => validateTrace({ traceEvents: [event] }, filename)).toThrow(
        "Forbidden screenshot event",
      );
    }
    expect(
      validateTrace({ traceEvents: [event] }, "home.trace.json.gz"),
    ).toEqual([event]);
  }
});

test("rejects trace payloads outside the reduced event schema", () => {
  for (const event of [
    { name: "Layout", args: { snapshot: "aGVsbG8=" } },
    { name: "Layout", url: "/private" },
    { name: "Screenshot", args: { snapshot: "aGVsbG8=", prompt: "private" } },
  ]) {
    expect(() =>
      validateTrace({ traceEvents: [event] }, "home.trace.json.gz"),
    ).toThrow();
  }
});
