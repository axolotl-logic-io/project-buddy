import { relative } from "node:path";
import process from "node:process";
import type {
  FullConfig,
  Reporter,
  Suite,
  TestError,
} from "@playwright/test/reporter";
import { literalPattern, printRerun } from "./rerun-command.ts";

const COMMAND = "npm run --workspace @project-buddy/web test:system --";

function reportFileError(error: TestError): void {
  if (error.location !== undefined) {
    const file = relative(process.cwd(), error.location.file);
    if (file.startsWith("test/system/")) {
      printRerun(COMMAND, [literalPattern(file)]);
    }
  }
}
class PlaywrightFailures implements Reporter {
  private suite: Suite | undefined;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite;
  }

  readonly onError = reportFileError;

  onEnd(): void {
    const byProject = new Map<string, Set<string>>();
    const failed =
      this.suite
        ?.allTests()
        .filter((test) => test.outcome() === "unexpected") ?? [];
    for (const test of failed) {
      const project = test.parent.project()?.name ?? "";
      const file = relative(process.cwd(), test.location.file);
      const filter = `${literalPattern(file)}:${test.location.line}`;
      const files = byProject.get(project) ?? new Set<string>();
      files.add(filter);
      byProject.set(project, files);
    }
    for (const [project, filters] of byProject) {
      printRerun(COMMAND, [`--project=${project}`, ...filters]);
    }
  }
}

export default PlaywrightFailures;
