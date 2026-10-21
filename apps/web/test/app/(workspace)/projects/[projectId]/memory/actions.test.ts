import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type MemoryFormState,
  restoreMemoryAction,
  saveMemoryAction,
} from "@/app/(workspace)/projects/[projectId]/memory/actions.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import type {
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";
import type { getProject } from "@/projects/store.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../../auth/current-user-test-kit.ts";
import { FOX_PROJECT } from "../../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../../auth/current-user-test-kit.ts"),
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

const THIRD = 3;
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
