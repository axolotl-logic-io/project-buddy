import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { MemoryHistory } from "./memory-history.tsx";

// The restore form posts to a Server Action, which this test never runs.
vi.mock("./actions.ts", () => ({ restoreMemoryAction: vi.fn() }));

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
      MEMORY_COPY.versionMade(MEMORY_COPY.byTutor, "Oct 12, 2026, 8:16 PM"),
    );
  });
});
