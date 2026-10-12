import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import type {
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";
import type { getProject } from "@/projects/store.ts";
import {
  type MemoryFormState,
  restoreMemoryAction,
  saveMemoryAction,
} from "./actions.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const memoryStore = vi.hoisted(() => ({
  saveMemory: vi.fn<typeof saveMemory>(),
  restoreMemoryVersion: vi.fn<typeof restoreMemoryVersion>(),
}));
vi.mock("@/memory/memory-store.ts", () => memoryStore);

const projectStore = vi.hoisted(() => ({
  getProject: vi.fn<typeof getProject>(),
}));
vi.mock("@/projects/store.ts", () => projectStore);

const cache = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/cache", () => cache);

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: MemoryFormState = { kind: "idle" };
const SECOND = 2;
const THIRD = 3;
const BASED_ON = MEMORY_VERSION_NUMBER.parse(SECOND);
const NEWER = {
  text: "Newer",
  version: MEMORY_VERSION_NUMBER.parse(THIRD),
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  projectStore.getProject.mockResolvedValue(FOX_PROJECT);
  memoryStore.saveMemory.mockResolvedValue({ kind: "saved", memory: NEWER });
  memoryStore.restoreMemoryVersion.mockResolvedValue({
    kind: "saved",
    memory: NEWER,
  });
});

describe("saveMemoryAction", () => {
  test("saves her text, with plain line breaks, on the version she edited", async () => {
    await expect(
      saveMemoryAction(
        IDLE,
        form({
          projectId: FOX_PROJECT.id.toUpperCase(),
          basedOn: "2",
          text: "# Goals\r\n- Fox",
        }),
      ),
    ).resolves.toEqual({ kind: "saved" });

    expect(projectStore.getProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    expect(memoryStore.saveMemory).toHaveBeenCalledWith(SIGNED_IN_USER.id, {
      projectId: FOX_PROJECT.id,
      basedOn: BASED_ON,
      text: "# Goals\n- Fox",
      author: "user",
    });
    expect(cache.refresh).toHaveBeenCalled();
  });

  test("says when the memory changed since she started, and shows the newer version", async () => {
    memoryStore.saveMemory.mockResolvedValue({
      kind: "outdated",
      memory: NEWER,
    });

    await expect(
      saveMemoryAction(
        IDLE,
        form({ projectId: FOX_PROJECT.id, basedOn: "2", text: "Mine" }),
      ),
    ).resolves.toEqual({ kind: "outdated" });
    expect(cache.refresh).toHaveBeenCalled();
  });

  test("is not found for a malformed project or version", async () => {
    await expect(
      saveMemoryAction(
        IDLE,
        form({ projectId: "fox", basedOn: "2", text: "" }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(memoryStore.saveMemory).not.toHaveBeenCalled();
  });
});

describe("memory actions for a project that is not hers", () => {
  test("are not found for a project that is unknown or another user's, saving nothing", async () => {
    projectStore.getProject.mockResolvedValue(undefined);

    await expect(
      saveMemoryAction(
        IDLE,
        form({ projectId: FOX_PROJECT.id, basedOn: "2", text: "Mine" }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      restoreMemoryAction(
        IDLE,
        form({ projectId: FOX_PROJECT.id, version: "1", basedOn: "2" }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(memoryStore.saveMemory).not.toHaveBeenCalled();
    expect(memoryStore.restoreMemoryVersion).not.toHaveBeenCalled();
    expect(cache.refresh).not.toHaveBeenCalled();
  });
});

describe("memory form versions", () => {
  test.each(["-1", "", " ", "1e0", "0x1", "1.0"])(
    "is not found for the version %j, which is not plain digits",
    async (basedOn) => {
      await expect(
        saveMemoryAction(
          IDLE,
          form({ projectId: FOX_PROJECT.id, basedOn, text: "" }),
        ),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      await expect(
        restoreMemoryAction(
          IDLE,
          form({ projectId: FOX_PROJECT.id, version: basedOn, basedOn: "2" }),
        ),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(memoryStore.saveMemory).not.toHaveBeenCalled();
      expect(memoryStore.restoreMemoryVersion).not.toHaveBeenCalled();
    },
  );
});

describe("restoreMemoryAction", () => {
  test("restores the version she picked on the version she saw", async () => {
    await expect(
      restoreMemoryAction(
        IDLE,
        form({ projectId: FOX_PROJECT.id, version: "1", basedOn: "2" }),
      ),
    ).resolves.toEqual({ kind: "saved" });

    expect(memoryStore.restoreMemoryVersion).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      {
        projectId: FOX_PROJECT.id,
        version: MEMORY_VERSION_NUMBER.parse(1),
        basedOn: BASED_ON,
        author: "user",
      },
    );
    expect(cache.refresh).toHaveBeenCalled();
  });

  test("says when the memory changed since the page loaded", async () => {
    memoryStore.restoreMemoryVersion.mockResolvedValue({
      kind: "outdated",
      memory: NEWER,
    });

    await expect(
      restoreMemoryAction(
        IDLE,
        form({ projectId: FOX_PROJECT.id, version: "1", basedOn: "2" }),
      ),
    ).resolves.toEqual({ kind: "outdated" });
  });

  test("is not found for a version the project lacks", async () => {
    memoryStore.restoreMemoryVersion.mockResolvedValue(undefined);

    await expect(
      restoreMemoryAction(
        IDLE,
        form({ projectId: FOX_PROJECT.id, version: "9", basedOn: "2" }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
