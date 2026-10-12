import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { MEMORY_VERSION_NUMBER, type MemoryVersion } from "@/memory/memory.ts";
import type { readMemoryHistory } from "@/memory/memory-store.ts";
import type { getProject } from "@/projects/store.ts";
import MemoryPage from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const projectStore = vi.hoisted(() => ({
  getProject: vi.fn<typeof getProject>(),
}));
vi.mock("@/projects/store.ts", () => projectStore);

const memoryStore = vi.hoisted(() => ({
  readMemoryHistory: vi.fn<typeof readMemoryHistory>(),
}));
vi.mock("@/memory/memory-store.ts", () => memoryStore);

// The page's forms post to Server Actions, which the page test never runs.
vi.mock("./actions.ts", () => ({
  saveMemoryAction: vi.fn(),
  restoreMemoryAction: vi.fn(),
}));

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

const HISTORY: MemoryVersion[] = [
  {
    version: MEMORY_VERSION_NUMBER.parse(2),
    text: "# Goals\n\n- Model a **fox**",
    author: "tutor",
    createdAt: new Date("2026-10-11T10:00:00Z"),
  },
  {
    version: MEMORY_VERSION_NUMBER.parse(1),
    text: "# Goals",
    author: "user",
    createdAt: new Date("2026-10-11T09:00:00Z"),
  },
];

const NOTHING_SAVED = /Nothing is saved in this project's memory yet/u;

function historyEntries(): HTMLElement[] {
  return within(screen.getByRole("list", { name: "History" })).getAllByRole(
    "listitem",
  );
}

// The history's entry at index, newest first.
function historyEntry(index: number): HTMLElement {
  const entry = historyEntries()[index];
  if (entry === undefined) {
    throw new Error(`The history has no entry ${index}`);
  }
  return entry;
}

function pageFor(projectId: string): ReturnType<typeof MemoryPage> {
  return MemoryPage({
    params: Promise.resolve({ projectId }),
    searchParams: Promise.resolve({}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  projectStore.getProject.mockResolvedValue(FOX_PROJECT);
  memoryStore.readMemoryHistory.mockResolvedValue(HISTORY);
});

describe("Memory page", () => {
  test("shows the newest memory formatted, and her editor holding its text", async () => {
    render(await pageFor(FOX_PROJECT.id));

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      `/projects/${FOX_PROJECT.id}`,
    );
    const current = screen.getByRole("region", { name: "Current memory" });
    expect(
      within(current).getByText("fox", {
        selector: "[data-streamdown=strong]",
      }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Memory" })).toHaveValue(
      HISTORY[0]?.text,
    );
  });

  test("says when nothing is saved yet, and offers an empty editor", async () => {
    memoryStore.readMemoryHistory.mockResolvedValue([]);

    render(await pageFor(FOX_PROJECT.id));

    expect(screen.getByText(NOTHING_SAVED)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Memory" })).toHaveValue("");
    expect(screen.getByText("No versions yet.")).toBeInTheDocument();
  });

  test("says nothing is saved while the newest version is only whitespace", async () => {
    memoryStore.readMemoryHistory.mockResolvedValue([
      {
        version: MEMORY_VERSION_NUMBER.parse(1),
        text: " \n\n",
        author: "user",
        createdAt: new Date("2026-10-11T09:00:00Z"),
      },
    ]);

    render(await pageFor(FOX_PROJECT.id));

    expect(screen.getByText(NOTHING_SAVED)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Memory" })).toHaveValue(
      " \n\n",
    );
  });
});

describe("Memory page lookups", () => {
  test("reads the signed-in user's project and its memory", async () => {
    render(await pageFor(FOX_PROJECT.id));

    expect(projectStore.getProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    expect(memoryStore.readMemoryHistory).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
  });

  test("is not found for a project that is unknown or another user's", async () => {
    projectStore.getProject.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(memoryStore.readMemoryHistory).not.toHaveBeenCalled();
  });
});

describe("Memory page history", () => {
  test("lists every version newest first, with who made it, and restores only earlier ones", async () => {
    render(await pageFor(FOX_PROJECT.id));

    const newest = historyEntry(0);
    const earlier = historyEntry(1);
    expect(historyEntries()).toHaveLength(HISTORY.length);
    expect(newest).toHaveTextContent("Version 2 (current)");
    expect(newest).toHaveTextContent("by the tutor");
    expect(within(newest).queryByRole("button")).toBeNull();
    expect(earlier).toHaveTextContent("Version 1");
    expect(earlier).toHaveTextContent("by you");
    expect(
      within(earlier).getByRole("button", { name: "Restore version 1" }),
    ).toBeInTheDocument();
  });
});
