import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { AppError } from "@/errors/app-error.ts";
import type { createProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const store = vi.hoisted(() => ({
  createProject: vi.fn<typeof createProject>(),
}));
vi.mock("@/projects/store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: CreateProjectState = { kind: "idle" };
const NEEDS_NAME: CreateProjectState = {
  kind: "invalid",
  message: COPY.projects.needsName,
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("createProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.createProject.mockResolvedValue(FOX_PROJECT);
  });

  test("creates the project with a trimmed name and opens it", async () => {
    await expect(
      createProjectAction(IDLE, form({ name: "  Low-poly fox  " })),
    ).rejects.toThrow(`NEXT_REDIRECT /projects/${FOX_PROJECT.id}`);

    expect(store.createProject).toHaveBeenCalledWith("Low-poly fox");
  });

  test("asks for a name when it is blank", async () => {
    expect(await createProjectAction(IDLE, form({ name: "   " }))).toEqual(
      NEEDS_NAME,
    );

    expect(store.createProject).not.toHaveBeenCalled();
  });

  test("asks for a name when the form has none, or a file for it", async () => {
    const withFile = new FormData();
    withFile.set("name", new File(["fox"], "fox.txt"));

    expect(await createProjectAction(IDLE, form({}))).toEqual(NEEDS_NAME);
    expect(await createProjectAction(IDLE, withFile)).toEqual(NEEDS_NAME);

    expect(store.createProject).not.toHaveBeenCalled();
  });

  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    store.createProject.mockRejectedValue(failure);

    await expect(
      createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).rejects.toBe(failure);
  });
});
