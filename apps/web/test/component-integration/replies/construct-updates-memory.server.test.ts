// The construct's Journal updates, in the test database with the mock
// construct: in any activity, a quest's conversation starts a blank Journal
// that later replies read, each save a version by the construct.

import { describe, expect, test } from "vitest";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { readMemory, readMemoryHistory } from "@/memory/memory-store.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructEdits,
  constructPrompt,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

describe("use_case_construct_updates_memory", () => {
  test.each(["open-chat", "brainstorming", "project-breakdown"] as const)(
    "%s initializes a blank Journal that later replies read",
    async (activityId) => {
      const user = await testUser();
      const started = await startProject(
        user.id,
        PROJECT_NAME.parse("Cottage"),
        getConstruct("vellum"),
        { activity: builtInActivity(activityId) },
      );
      if (started.kind !== "started") {
        throw new Error("The quest did not start");
      }
      const { chat } = started;
      await signIn(user);

      expect(await constructEdits(chat.id, "", "- Finished the roof")).toEqual({
        status: "updated",
        version: 1,
        oldText: "",
        newText: "- Finished the roof",
      });

      expect((await readMemory(user.id, chat.project.id)).text).toContain(
        "- Finished the roof",
      );
      const history = await readMemoryHistory(user.id, chat.project.id);
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ version: 1, author: "construct" });
      expect(await constructPrompt(chat.id)).toContain("- Finished the roof");
    },
  );
});
