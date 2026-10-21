import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import MemoryPage from "@/app/(workspace)/projects/[projectId]/memory/page.tsx";
import { MEMORY_VERSION_NUMBER, type MemoryVersion } from "@/memory/memory.ts";
import type { readMemoryHistory } from "@/memory/memory-store.ts";
import type { getProject } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../../auth/current-user-test-kit.ts";
import { FOX_PROJECT } from "../../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../../auth/current-user-test-kit.ts"),
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
vi.mock("@/app/(workspace)/projects/[projectId]/memory/actions.ts", () => ({
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

const NOTHING_SAVED: string = MEMORY_COPY.empty;

// A first version of nothing but whitespace.
const WHITESPACE_ONLY: MemoryVersion = {
  version: MEMORY_VERSION_NUMBER.parse(1),
  text: " \n\n",
  author: "user",
  createdAt: new Date("2026-10-11T09:00:00Z"),
};

function historyEntries(): HTMLElement[] {
  return within(
    screen.getByRole("list", { name: MEMORY_COPY.historyHeading }),
  ).getAllByRole("listitem");
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

describe("use_case_view_memory", () => {
  test("lists history entries in store order", async () => {
    render(await pageFor(FOX_PROJECT.id));
    const entries = historyEntries();
    expect(entries).toHaveLength(HISTORY.length);
    for (const [index, version] of HISTORY.entries()) {
      expect(entries[index]).toHaveTextContent(
        MEMORY_COPY.versionHeading(version.version),
      );
    }
  });
  test("shows the newest memory formatted, and her editor holding its text", async () => {
    render(await pageFor(FOX_PROJECT.id));

    expect(
      screen.getByRole("link", { name: FOX_PROJECT.name }),
    ).toHaveAttribute("href", `/projects/${FOX_PROJECT.id}`);
    const current = screen.getByRole("region", {
      name: MEMORY_COPY.currentLabel,
    });
    expect(
      within(current).getByText("fox", {
        selector: "strong",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: MEMORY_COPY.textLabel }),
    ).toHaveValue(HISTORY[0]?.text);
  });

  test("says when nothing is saved yet, and offers an empty editor", async () => {
    memoryStore.readMemoryHistory.mockResolvedValue([]);

    render(await pageFor(FOX_PROJECT.id));

    expect(screen.getByText(NOTHING_SAVED)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: MEMORY_COPY.textLabel }),
    ).toHaveValue("");
    expect(screen.getByText(MEMORY_COPY.noHistory)).toBeInTheDocument();
  });

  test("says nothing is saved while the newest version is only whitespace", async () => {
    memoryStore.readMemoryHistory.mockResolvedValue([WHITESPACE_ONLY]);

    render(await pageFor(FOX_PROJECT.id));

    expect(screen.getByText(NOTHING_SAVED)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: MEMORY_COPY.textLabel }),
    ).toHaveValue(" \n\n");
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

  test("an unknown project is not found before reading history", async () => {
    projectStore.getProject.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(memoryStore.readMemoryHistory).not.toHaveBeenCalled();
  });
});
