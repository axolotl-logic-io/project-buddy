// The browser tests (*.browser.test.tsx) render with the site's stylesheet,
// Tailwind utilities included, as the root layout does.
import type { TestError } from "vitest";
import { beforeEach, vi } from "vitest";
import "./src/app/globals.css";

// Server Actions are RPC boundaries in the site. Keep their server imports
// out of browser component tests; tests exercising these actions supply
// their own result-specific mocks. Unexpected mutations fail loudly.
vi.mock("@/app/(workspace)/quests/status-actions.ts", () => ({
  changeQuestStatusAction: vi.fn(() => {
    throw new Error("Mock the quest status action in this test");
  }),
}));

// The quest start (src/components/quest-start.tsx) reaches this action from
// Quest and Grimoire actions run on the server.
vi.mock("@/app/(workspace)/quests/actions.ts", () => ({
  startQuestAction: vi.fn(() => {
    throw new Error("Mock the quest start action in this test");
  }),
}));

vi.mock("@/quests/rename-quest-action.ts", () => ({
  renameQuestAction: vi.fn(() => {
    throw new Error("Mock the quest rename action in this test");
  }),
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
  sessionStorage.clear();
  onTestFailed(({ task }) => {
    for (const error of task.result?.errors ?? []) {
      withMessageInStack(error);
    }
  });
});

// The site panel's Quick Note dialog and a quest's Quick Notes tab reach these
// from every signed-in page. Tests of those flows supply their own results.

// A running timer reports its presence as it opens. Tests of the count
// supply their own answers; by default no one else follows the schedule.
vi.mock("@/timer/presence-action.ts", () => ({
  reportTimerPresenceAction: vi.fn(() =>
    Promise.resolve({ kind: "count", others: 0 }),
  ),
}));

// Quests and a quest's Members tab reach these. Tests of membership flows
// supply their own results; by default a quest shows no Members tab, the
// user has no pending invitations, and no emailed link is an invitation's.
vi.mock("@/quests/membership-actions.ts", () => ({
  inviteToQuestAction: vi.fn(() => {
    throw new Error("Mock the quest invitation action in this test");
  }),
  removeFromQuestAction: vi.fn(() => {
    throw new Error("Mock the quest removal action in this test");
  }),
  answerInvitationAction: vi.fn(() => {
    throw new Error("Mock the invitation answer action in this test");
  }),
}));

vi.mock("@/quests/membership-store.ts", () => ({
  listQuestPeople: vi.fn(() => Promise.resolve(undefined)),
  listPendingQuests: vi.fn(() => Promise.resolve([])),
  readInvitationLink: vi.fn(() => Promise.resolve(undefined)),
}));

// Signed-in pages report visible visits. Feature tests override the result.
vi.mock("@/visits/record-visit-action.ts", () => ({
  recordVisitAction: vi.fn(() => Promise.resolve("known")),
}));

vi.mock("@/spaces/space-store.ts", () => ({
  listSpaces: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/spaces/space-actions.ts", () => ({
  saveSpaceAction: vi.fn(() => {
    throw new Error("Mock the space settings action in this test");
  }),
}));

vi.mock("@/spaces/murmling-store.ts", () => ({
  listMurmlings: vi.fn(() => Promise.resolve([])),
  readNextMurmling: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock("@/spaces/murmling-actions.ts", () => ({
  changeMurmlingAction: vi.fn(() => {
    throw new Error("Mock the murmling action in this test");
  }),
}));

vi.mock("@/performances/performance-store.ts", () => ({
  listPerformances: vi.fn(() => Promise.resolve([])),
  readConjurations: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/rites/rite-store.ts", () => ({
  listRites: vi.fn(() => Promise.resolve([])),
  readRite: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock("@/performances/performance-actions.ts", () => ({
  startPerformanceAction: vi.fn(),
  stopPerformanceAction: vi.fn(),
  conjureAction: vi.fn(),
}));

vi.mock("@/rites/rite-actions.ts", () => ({
  saveRiteAction: vi.fn(),
  copyRiteAction: vi.fn(),
  changeRiteAction: vi.fn(),
}));

vi.mock("@/spaces/quick-note-actions.ts", () => ({
  listQuickNoteQuests: vi.fn(() => Promise.resolve([])),
  saveQuickNote: vi.fn(),
}));

vi.mock("@/dailies/quest-day-actions.ts", () => ({
  changeQuestDay: vi.fn(),
}));
vi.mock("@/dailies/quest-day-store.ts", () => ({
  readQuestDays: vi.fn(() => Promise.resolve({ days: [], undoable: false })),
  readRecurringTasks: vi.fn(() => Promise.resolve({ items: [] })),
}));
