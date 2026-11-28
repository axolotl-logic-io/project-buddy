import { basename } from "node:path";
import process from "node:process";
import type { Reporter, TestModule } from "vitest/node";
import { literalPattern, printRerun } from "./rerun-command.ts";

function reportModule(module: TestModule): void {
  const failed = Array.from(module.children.allTests("failed"));
  const moduleFailed = module.errors().length > 0;
  if (!moduleFailed && failed.length === 0) {
    return;
  }

  const project = module.project.name;
  const app = `//apps/${basename(process.cwd())}`;
  let command = `mise run ${app}:test`;
  const args = [module.relativeModuleId];
  if (project === "server") {
    command = `mise run ${app}:test:server`;
  } else if (project.startsWith("browser")) {
    command = `mise run ${app}:test:browser`;
    args.push("--project", project);
  } else if (project !== "") {
    command = `mise run ${app}:test:repository`;
    args.push("--project", project);
  }

  if (failed.length > 0) {
    const names = failed.map((test) => literalPattern(test.fullName));
    printRerun(command, [
      ...args,
      "--testNamePattern",
      `^(?:${names.join("|")})$`,
    ]);
  }
  if (moduleFailed) {
    printRerun(command, args);
  }
}

function reportFailedModules(modules: readonly TestModule[]): void {
  for (const module of modules) {
    reportModule(module);
  }
}

class VitestFailures implements Reporter {
  readonly onTestRunEnd = reportFailedModules;
}

export default VitestFailures;
