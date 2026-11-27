import type { BrowserContext, Page } from "@playwright/test";

// Records each error page logs to its console or throws uncaught.
function watchForProblems(page: Page, problems: string[]): void {
  page.on("pageerror", (error) => {
    problems.push(`${page.url()} threw: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      problems.push(`${page.url()} logged: ${message.text()}`);
    }
  });
}

// Returns the live record of errors from every page in the context.
function watchPageProblems(context: BrowserContext): readonly string[] {
  const problems: string[] = [];
  for (const page of context.pages()) {
    watchForProblems(page, problems);
  }
  context.on("page", (page) => watchForProblems(page, problems));
  return problems;
}

export { watchPageProblems };
