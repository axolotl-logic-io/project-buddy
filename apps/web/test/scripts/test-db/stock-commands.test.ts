// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import packageConfig from "../../../package.json" with { type: "json" };
import {
  executeStock,
  stockCommand,
} from "../../../scripts/test-db/run-stock.ts";

const fake = vi.hoisted(() => ({
  statuses: [0, 0],
  preload: vi.fn<() => Promise<void>>(),
  spawn: vi.fn(),
}));
vi.mock("../../../scripts/test-db/run-process.ts", () => ({
  preload: fake.preload,
}));
vi.mock("node:child_process", () => ({ spawn: fake.spawn }));
const TOKEN_LENGTH = 32;
const FAILED = 7;
const protocol = {
  socket: "/fixture-protocol",
  token: "0".repeat(TOKEN_LENGTH),
  entry: "file:///fixture/run.ts",
};
function child(): {
  readonly once: (event: string, listener: (code: number) => void) => void;
} {
  const code = fake.statuses.shift() ?? 0;
  return {
    once: (event: string, listener: (code: number) => void): void => {
      if (event === "exit") {
        queueMicrotask(() => listener(code));
      }
    },
  };
}
fake.spawn.mockImplementation(child);
afterEach(() => {
  fake.spawn.mockClear();
  fake.preload.mockClear();
  fake.statuses = [0, 0];
});

test("each npm command enters one supported allocation, including visual updates", () => {
  const {
    "test:server": server,
    "test:e2e": e2e,
    "test:visual": visual,
    "test:visual:update": update,
  } = packageConfig.scripts;
  expect(server).toContain("run.ts --stock server");
  expect(e2e).toContain("run.ts --stock e2e");
  expect(visual).toContain("run.ts --stock visual");
  expect(update).toContain("test:visual -- --update-snapshots");
  expect(() => stockCommand(["--stock", "unknown"])).toThrow();
});
test("e2e runs server tests before Playwright in the inherited invocation", async () => {
  expect(
    await executeStock(
      ["--execute-stock", "e2e", "--project", "chromium"],
      protocol,
    ),
  ).toBe(0);
  expect(fake.preload).toHaveBeenCalledWith(protocol);
  expect(fake.spawn.mock.calls[0]?.[1]).toContain("vitest.server.config.mts");
  expect(fake.spawn.mock.calls[1]?.[1]).toContain("chromium");
});
test("server failure prevents Playwright execution, without a retry", async () => {
  fake.statuses = [FAILED];
  expect(await executeStock(["--execute-stock", "e2e"], protocol)).toBe(FAILED);
  expect(fake.spawn).toHaveBeenCalledOnce();
});
test("visual selection and snapshot-update arguments reach Playwright", async () => {
  expect(
    await executeStock(
      ["--execute-stock", "visual", "--update-snapshots"],
      protocol,
    ),
  ).toBe(0);
  expect(fake.spawn.mock.calls[1]?.[1]).toEqual(
    expect.arrayContaining(["--project", "visual*", "--update-snapshots"]),
  );
});
