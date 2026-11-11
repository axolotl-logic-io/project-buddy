// "use_case_start_without_claude" in use-cases/: starting a quest while Claude
// can't write its opening saves nothing. Only a construct or an activity of
// the user's own that has been edited has no prepared opening, so this starts
// with an edited construct. The mock construct fails an opening whose prompt
// holds `/mock-error <type>` (mock-opening.ts), which a quest's name puts
// there. What the start form keeps is its own test's.
import { describe, expect, test } from "vitest";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

describe("use_case_start_without_claude", () => {
  test("a new quest says Claude is unavailable and saves nothing", async () => {
    const user = await testUser();
    const edited = await testData(user).editedConstruct();
    const chosen = await chosenConstruct(user.id, edited.id);
    if (chosen === undefined) {
      throw new Error("Her construct is not hers");
    }

    const result = await startProject(
      user.id,
      PROJECT_NAME.parse("Fox /mock-error overloaded_error"),
      chosen.construct,
      { motivation: "Make a gift for a friend" },
    );

    expect(result).toEqual({ kind: "claudeUnavailable" });
    expect(await listProjects(user.id)).toEqual([]);
  });
});
