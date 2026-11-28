import process from "node:process";
import { RUN } from "./options.ts";

function auditRun(): ReturnType<typeof RUN.parse> {
  const { BUDDY_AUDIT: run } = process.env;
  if (run === undefined) {
    throw new Error("Start the audit with mise run //apps/web:audit.");
  }
  return RUN.parse(JSON.parse(run));
}

export { auditRun };
