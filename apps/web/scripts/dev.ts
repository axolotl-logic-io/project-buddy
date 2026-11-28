// `mise run dev`: serves the site with Next's development server on this
// branch's own development database, which the task migrates first. Any
// arguments go to `next dev`.
import { spawn } from "node:child_process";
import process from "node:process";
import { localDatabase } from "./db/database-names.ts";

const server = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: localDatabase("dev").url },
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
