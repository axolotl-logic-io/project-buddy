import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import {
  MEMORY_VERSION_NUMBER,
  type MemoryAuthor,
  type MemoryVersion,
} from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { MemoryHistory } from "./memory-history.tsx";

// The restore form posts to a Server Action, which this test never runs.
vi.mock("./actions.ts", () => ({ restoreMemoryAction: vi.fn() }));

// The version a restore over two versions makes.
const RESTORED = 3;

// Version number of the memory, by author, made at a fixed time.
function version(number: number, author: MemoryAuthor): MemoryVersion {
  return {
    version: MEMORY_VERSION_NUMBER.parse(number),
    text: `# Version ${number}`,
    author,
    createdAt: new Date("2026-10-13T00:16:00Z"),
  };
}

// The history's entries, newest first.
function entries(): HTMLElement[] {
  return screen.getAllByRole("listitem");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MemoryHistory", () => {
  test("says who made each version and when, in the browser's zone", () => {
    vi.stubEnv("TZ", "America/New_York");

    render(
      <MemoryHistory
        history={[
          {
            version: MEMORY_VERSION_NUMBER.parse(1),
            text: "# Goals",
            author: "tutor",
            // 20:16 on October 12 in New York (EDT), October 13 in UTC.
            createdAt: new Date("2026-10-13T00:16:00Z"),
          },
        ]}
        projectId={FOX_PROJECT.id}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      MEMORY_COPY.versionMade(MEMORY_COPY.byTutor, "Oct 12, 2026, 08:16 PM"),
    );
  });
});

describe("use_case_tutor_updates_memory", () => {
  test("shows the tutor's change as a version by the tutor", () => {
    render(
      <MemoryHistory
        history={[version(1, "tutor")]}
        projectId={FOX_PROJECT.id}
      />,
    );

    const [entry] = entries();
    expect(entry).toHaveTextContent(MEMORY_COPY.versionHeading(1));
    expect(entry).toHaveTextContent(MEMORY_COPY.byTutor);
  });
});

describe("use_case_undo_memory_change", () => {
  test("marks the newest version, and offers to restore each earlier one", () => {
    const [newest, middle, first] = [RESTORED, RESTORED - 1, 1];
    render(
      <MemoryHistory
        history={[
          version(newest, "user"),
          version(middle, "tutor"),
          version(first, "tutor"),
        ]}
        projectId={FOX_PROJECT.id}
      />,
    );

    expect(entries().map((entry) => entry.textContent)).toEqual([
      expect.stringContaining(
        `${MEMORY_COPY.versionHeading(newest)} ${MEMORY_COPY.newest}`,
      ),
      expect.not.stringContaining(MEMORY_COPY.newest),
      expect.not.stringContaining(MEMORY_COPY.newest),
    ]);
    expect(
      screen.queryByRole("button", { name: MEMORY_COPY.restore(newest) }),
    ).not.toBeInTheDocument();
    for (const earlier of [middle, first]) {
      expect(
        screen.getByRole("button", { name: MEMORY_COPY.restore(earlier) }),
      ).toBeInTheDocument();
    }
  });
});
