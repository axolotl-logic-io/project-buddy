import { describe, expect, test } from "vitest";
import { listProjects } from "@/projects/store.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

describe("the project store, in the test database", () => {
  test("lists a project for the user who made it and for no one else", async () => {
    const owner = await testUser();
    const other = await testUser();

    const project = await testData(owner).project("Low-poly fox");

    expect(await listProjects(owner.id)).toContainEqual(project);
    expect((await listProjects(other.id)).map(({ id }) => id)).not.toContain(
      project.id,
    );
  });
});
