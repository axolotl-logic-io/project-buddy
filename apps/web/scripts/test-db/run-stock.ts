// Command definitions for the three supported lifecycles. A server suite and
// its following Playwright suite share one allocation and one registry.
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { TestRunProtocol } from "../../src/env.ts";
import { preload } from "./run-process.ts";

const STOCK = z.enum(["server", "e2e", "visual"]);
const VITEST = fileURLToPath(
  new URL("../../../../node_modules/vitest/vitest.mjs", import.meta.url),
);
const PLAYWRIGHT = fileURLToPath(
  new URL("../../../../node_modules/@playwright/test/cli.js", import.meta.url),
);
function stockCommand(line: readonly string[]): readonly string[] {
  const [, mode] = line;
  STOCK.parse(mode);
  return [
    process.execPath,
    fileURLToPath(new URL("./run.ts", import.meta.url)),
    "--execute-stock",
    ...line.slice(1),
  ];
}
function command(args: readonly string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}
async function executeStock(
  line: readonly string[],
  protocol: TestRunProtocol,
): Promise<number> {
  const [, value, ...args] = line;
  const mode = STOCK.parse(value);
  await preload(protocol);
  if (mode === "server") {
    return command([
      VITEST,
      "run",
      "--config",
      "vitest.server.config.mts",
      ...args,
    ]);
  }
  const code = await command([
    VITEST,
    "run",
    "--config",
    "vitest.server.config.mts",
  ]);
  if (code !== 0) {
    return code;
  }
  if (mode === "visual") {
    return command([PLAYWRIGHT, "test", "--project", "visual*", ...args]);
  }
  return command([PLAYWRIGHT, "test", ...args]);
}

export { executeStock, stockCommand };
