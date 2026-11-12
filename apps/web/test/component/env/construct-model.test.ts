import { afterEach, expect, test, vi } from "vitest";
import { readConstructModel } from "@/env.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});
test("local rules are the default in development and production", () => {
  vi.stubEnv("CONSTRUCT_MODEL", "");
  vi.stubEnv("BUDDY_MODEL", "claude");
  expect(readConstructModel()).toBe("local");
  vi.stubEnv("VERCEL_ENV", "production");
  expect(readConstructModel()).toBe("local");
});
test("local rules can be selected explicitly", () => {
  vi.stubEnv("CONSTRUCT_MODEL", "local");
  expect(readConstructModel()).toBe("local");
});
test("remote and unknown model settings fail closed", () => {
  for (const setting of ["claude", "gpt"]) {
    vi.stubEnv("CONSTRUCT_MODEL", setting);
    expect(readConstructModel).toThrow("Remote models are disabled");
  }
});
test("test scripts remain available outside production", () => {
  vi.stubEnv("CONSTRUCT_MODEL", "mock");
  vi.stubEnv("VERCEL_ENV", "development");
  expect(readConstructModel()).toBe("mock");
});
test("production refuses test scripts", () => {
  vi.stubEnv("CONSTRUCT_MODEL", "mock");
  vi.stubEnv("VERCEL_ENV", "production");
  expect(readConstructModel).toThrow("in production");
});
