#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const {
  counterTestReply: reply,
  counterTestRecord: record,
  counterTestExit: exitCode,
}: NodeJS.ProcessEnv = process.env;
if (record === undefined) {
  throw new Error("Missing test record path");
}
writeFileSync(
  record,
  JSON.stringify({
    args: process.argv.slice(2),
    input: readFileSync(0, "utf8"),
  }),
);
process.stdout.write(reply ?? "");
process.stderr.write("fake pi diagnostic\n");
process.exitCode = Number(exitCode ?? "0");
