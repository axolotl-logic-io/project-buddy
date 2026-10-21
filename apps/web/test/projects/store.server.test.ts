// The project store against the test database: her project is found by
// its id in any case, and another user's reads as not found.
import { describe, expect, test } from "vitest";
import { getProject } from "@/projects/store.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

describe("the project store, in the test database", () => {
  test("her project is found by its id in capitals", async () => {
    const { her, herData } = await twoUsers();
    const project = await herData.project("Low-poly fox");

    expect(await getProject(her.id, project.id.toUpperCase())).toEqual(project);
  });

  test("another user's project reads as not found", async () => {
    const { her, otherData } = await twoUsers();
    const theirs = await otherData.project("Low-poly fox");

    expect(await getProject(her.id, theirs.id)).toBeUndefined();
  });
});
