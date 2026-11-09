// The browser tests (*.browser.test.tsx) render with the site's stylesheet,
// Tailwind utilities included, as the root layout does.
import "./src/app/globals.css";
import type { TestError } from "vitest";
import { beforeEach, vi } from "vitest";

// Server-only audit context is not available in a browser. The database and
// authentication boundaries remain mocked by each feature-entrypoint test.
vi.mock("@/performance/server-spans.ts", () => ({
  measureServerOperation: <T>(
    _operation: string,
    work: () => Promise<T>,
  ): Promise<T> => work(),
}));

// Server Actions are RPC boundaries in the site. Keep their server imports
// out of browser component tests; tests exercising these actions supply
// their own result-specific mocks. Unexpected mutations fail loudly.
vi.mock("@/app/(workspace)/projects/status-actions.ts", () => ({
  changeQuestStatusAction: vi.fn(() => {
    throw new Error("Mock the quest status action in this test");
  }),
  answerQuestStatusAction: vi.fn(() => {
    throw new Error("Mock the quest approval action in this test");
  }),
  readQuestStatusApprovalAction: vi.fn(() => Promise.resolve(undefined)),
}));

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

vi.mock("@/constructs/restore-visual-action.ts", () => ({
  restoreVisualAction: vi.fn(),
}));
vi.mock("@/replies/stop-reply-action.ts", () => ({
  stopReplyAction: vi.fn(),
}));
vi.mock("@/replies/reply-gold-action.ts", () => ({
  replyGoldAction: vi.fn(() => Promise.resolve(undefined)),
}));
vi.mock("@/chats/quest-transfer-action.ts", () => ({
  confirmQuestTransferAction: vi.fn(),
  readQuestTransferAction: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock("@/accounts/refresh-preferences-action.ts", () => ({
  refreshPreferencesAction: vi.fn(() => Promise.resolve(undefined)),
}));

// The header reads its balance on the server. Keep component fixtures out of
// Postgres and server logging/payment imports; tests needing a balance set it.
vi.mock("@/gold/gold-store.ts", () => ({
  readGoldBalance: vi.fn(() =>
    Promise.reject(new Error("Mock the balance reader in this test")),
  ),
}));
