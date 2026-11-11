import { refresh } from "next/cache";
import { describe, expect, test, vi } from "vitest";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { renameProjectAction } from "@/projects/rename-project-action.ts";
import { getProject } from "@/projects/store.ts";
import { formerMembership } from "../../support/test-database/former-member-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

function form(projectId: string, name: string): FormData {
  const data = new FormData();
  data.set("projectId", projectId);
  data.set("name", name);
  return data;
}

describe("use_case_rename_quest", () => {
  test("the owner saves a trimmed name", async () => {
    const { her, herData } = await twoUsers();
    const project = await herData.project();
    expect(
      await renameProjectAction(
        { kind: "idle" },
        form(project.id, "  Fox den  "),
      ),
    ).toEqual({ kind: "saved", name: "Fox den" });
    expect((await getProject(her.id, project.id))?.name).toBe("Fox den");
    expect(refresh).toHaveBeenCalled();
  });
  test.each(["", "   ", "x".repeat(PROJECT_NAME_MAX_LENGTH + 1)])(
    "refuses an invalid name %s",
    async (name) => {
      const { her, herData } = await twoUsers();
      const project = await herData.project();
      expect(
        await renameProjectAction({ kind: "idle" }, form(project.id, name)),
      ).toMatchObject({ kind: "invalid" });
      expect((await getProject(her.id, project.id))?.name).toBe(project.name);
    },
  );
  test("former members and outsiders cannot rename a quest", async () => {
    const { her, herData, other, otherData } = await twoUsers();
    const project = await herData.project();
    const foreign = await otherData.project();
    await expectNotFound(() =>
      renameProjectAction({ kind: "idle" }, form(foreign.id, "Stolen")),
    );
    await formerMembership(her, other, project.id);
    await signIn(other);
    await expectNotFound(() =>
      renameProjectAction(
        { kind: "idle" },
        form(project.id, "Changed by former member"),
      ),
    );
    expect((await getProject(her.id, project.id))?.name).toBe(project.name);
    expect((await getProject(other.id, foreign.id))?.name).toBe(foreign.name);
  });
});
