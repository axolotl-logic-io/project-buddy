// CONSTRUCT_MODEL picks the model constructs run. BUDDY_MODEL, its earlier
// name, still works where CONSTRUCT_MODEL is unset, so environments set up
// before the rename keep the mock.
import { afterEach, expect, test, vi } from "vitest";
import { readConstructModel } from "@/env.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

function stubModels(construct: string, legacy: string): void {
  vi.stubEnv("CONSTRUCT_MODEL", construct);
  vi.stubEnv("BUDDY_MODEL", legacy);
  vi.stubEnv("VERCEL_ENV", "");
}

test("constructs run Claude when neither name is set", () => {
  stubModels("", "");
  expect(readConstructModel()).toBe("claude");
});

test("the legacy BUDDY_MODEL still selects the mock when CONSTRUCT_MODEL is unset", () => {
  stubModels("", "mock");
  expect(readConstructModel()).toBe("mock");
});

test("CONSTRUCT_MODEL takes precedence over the legacy name", () => {
  stubModels("claude", "mock");
  expect(readConstructModel()).toBe("claude");
  stubModels("mock", "claude");
  expect(readConstructModel()).toBe("mock");
});

test("an unknown model, under either name, is refused", () => {
  stubModels("gpt", "");
  expect(readConstructModel).toThrow(
    'CONSTRUCT_MODEL must be unset, "claude" or "mock".',
  );
  stubModels("", "gpt");
  expect(readConstructModel).toThrow(
    'CONSTRUCT_MODEL must be unset, "claude" or "mock".',
  );
});

test("production refuses the mock, under either name", () => {
  stubModels("", "mock");
  vi.stubEnv("VERCEL_ENV", "production");
  expect(readConstructModel).toThrow("in production");
});
