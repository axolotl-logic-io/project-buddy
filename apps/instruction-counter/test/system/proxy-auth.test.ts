import { expect, test } from "vitest";
import { runCounter } from "./cli-test-kit.ts";

const REPLY = JSON.stringify({
  instructions: [],
  descriptiveStatements: [],
  contentLines: [1],
});

test("explicitly loads the installed proxy provider while disabling other extensions", (): void => {
  const result = runCounter("Some context.", REPLY, { proxyInstalled: true });
  expect(result.status).toBe(0);
  expect(result.invocation).toEqual(
    expect.objectContaining({
      args: expect.arrayContaining([
        "--no-extensions",
        "--extension",
        expect.stringContaining(
          "/agent/npm/node_modules/pi-cliproxyapi/index.ts",
        ),
        "--no-tools",
        "--no-mcp",
        "--no-context-files",
      ]),
    }),
  );
});

test("uses ordinary pi credentials when the proxy extension is not installed", (): void => {
  const result = runCounter("Some context.", REPLY);
  expect(result.status).toBe(0);
  expect(result.invocation).toEqual(
    expect.objectContaining({
      args: expect.not.arrayContaining(["--extension"]),
    }),
  );
});
