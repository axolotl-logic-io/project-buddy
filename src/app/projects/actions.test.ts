import { beforeEach, describe, expect, test, vi } from "vitest";
import { createProjectAction } from "@/app/projects/actions.ts";

const store = vi.hoisted(() => ({ createProject: vi.fn() }));
vi.mock("@/projects/store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

const PROJECT_ID = "0b6f3c2e-8d4a-4f1b-9c7e-5a2d1e3f4b6c";
const NEEDS_NAME = "A project needs a name.";

describe("createProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.createProject.mockResolvedValue({ id: PROJECT_ID });
  });

  test("creates the project with a trimmed name and opens it", async () => {
    await expect(
      createProjectAction(form({ name: "  Low-poly fox  " })),
    ).rejects.toThrow(`NEXT_REDIRECT /projects/${PROJECT_ID}`);

    expect(store.createProject).toHaveBeenCalledWith("Low-poly fox");
  });

  test("rejects a blank name", async () => {
    await expect(createProjectAction(form({ name: "   " }))).rejects.toThrow(
      NEEDS_NAME,
    );

    expect(store.createProject).not.toHaveBeenCalled();
  });

  test("rejects a form without a name or with a file for it", async () => {
    const withFile = new FormData();
    withFile.set("name", new File(["fox"], "fox.txt"));

    await expect(createProjectAction(form({}))).rejects.toThrow(NEEDS_NAME);
    await expect(createProjectAction(withFile)).rejects.toThrow(NEEDS_NAME);

    expect(store.createProject).not.toHaveBeenCalled();
  });
});
