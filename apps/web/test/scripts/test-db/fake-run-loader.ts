// Substitute exactly the database I/O module, only for the wrapper's own
// imports. Validation below still calls the real checked-in environment guard.
import { type ResolveHookSync, registerHooks } from "node:module";
import process, { argv } from "node:process";

const database: string = new URL(
  "../../../scripts/test-db/test-database.ts",
  import.meta.url,
).href;
const replacement: string = new URL("./fake-run-database.ts", import.meta.url)
  .href;
const resolveDatabase: ResolveHookSync = (
  specifier: string,
  context: Parameters<ResolveHookSync>[1],
  nextResolve: Parameters<ResolveHookSync>[2],
): ReturnType<ResolveHookSync> => {
  if (
    context.parentURL !== replacement &&
    context.parentURL !== undefined &&
    new URL(specifier, context.parentURL).href === database
  ) {
    return { url: replacement, shortCircuit: true };
  }
  return nextResolve(specifier, context);
};
registerHooks({ resolve: resolveDatabase });

if (argv.includes("--unsupported-platform")) {
  Object.defineProperty(process, "platform", { value: "win32" });
}
