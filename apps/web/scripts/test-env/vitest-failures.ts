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
  const workspace = `apps/${basename(process.cwd())}`;
  let command = `npm exec --workspace ${workspace} -- vitest run`;
  const args = [module.relativeModuleId];
  if (project === "server") {
    command = "npm run --workspace @project-buddy/web test:server --";
  } else if (project !== "") {
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
