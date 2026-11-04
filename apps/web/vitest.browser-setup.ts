// The browser tests (*.browser.test.tsx) render with the site's stylesheet,
// Tailwind utilities included, as the root layout does.
import "./src/app/globals.css";
import type { TestError } from "vitest";
import { beforeEach } from "vitest";

// A WebKit error's stack lists only its frames, without the "Name: message"
// line Chromium's starts with, and reporters that print an error's stack
// rather than its message, such as the JSON reporter, then show a failure as
// a bare frame. Each failed test's errors, and their causes, get that line.
function withMessageInStack(error: TestError): void {
  const heading = `${error.name ?? "Error"}: ${error.message}`;
  if (error.stack !== undefined && !error.stack.startsWith(heading)) {
    error.stack = `${heading}\n${error.stack}`;
  }
  if (error.cause !== undefined) {
    withMessageInStack(error.cause);
  }
}

// Vitest shows each test file's page in an iframe on its own runner page.
// As an inline box, the iframe leaves a few pixels below it, so the runner
// page is that much taller than the window. A test's scrollIntoView() or
// focus() then scrolls the runner page too, and the offset lasts into later
// tests and files, pushing what is pinned to the top of the window above it
// by those pixels (#624). As a block, the iframe fills the runner page
// exactly, which then can't scroll.
const RUNNER_STYLE_ID = "vitest-tester-frame-fills-page";
function keepRunnerPageStill(): void {
  const runner = window.parent.document;
  if (
    runner === document ||
    runner.querySelector(`#${RUNNER_STYLE_ID}`) !== null
  ) {
    return;
  }
  const style = runner.createElement("style");
  style.id = RUNNER_STYLE_ID;
  style.textContent = "iframe[data-vitest] { display: block; }";
  runner.head.append(style);
}

keepRunnerPageStill();

beforeEach(({ onTestFailed }) => {
  localStorage.clear();
  onTestFailed(({ task }) => {
    for (const error of task.result?.errors ?? []) {
      withMessageInStack(error);
    }
  });
});
