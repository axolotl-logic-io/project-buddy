import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectAction } from "@/app/projects/actions";

const store = vi.hoisted(() => ({ createProject: vi.fn() }));
vi.mock("@/projects/store", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("createProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.createProject.mockResolvedValue({ id: "project-1" });
  });

  it("creates the project with a trimmed name and opens it", async () => {
    await expect(
      createProjectAction(form({ name: "  Low-poly fox  " })),
    ).rejects.toThrow("NEXT_REDIRECT /projects/project-1");

    expect(store.createProject).toHaveBeenCalledWith("Low-poly fox");
  });

  it("rejects a blank name", async () => {
    await expect(createProjectAction(form({ name: "   " }))).rejects.toThrow(
      /name/i,
    );

    expect(store.createProject).not.toHaveBeenCalled();
  });
});
