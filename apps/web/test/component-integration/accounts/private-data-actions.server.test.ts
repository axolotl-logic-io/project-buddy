// use_case_private_data in the projects' Server Actions, with two users
// side by side: the other user, signed in as their own account, sends a
// form that names her project. Each action answers exactly as for an
// unknown project, and writes nothing of hers or theirs.
// private-data-chats.server.test.ts covers renaming a chat.
import { describe, expect, test } from "vitest";
import { cloneConstruct } from "@/constructs/construct-store.ts";
import { saveInterviewConstruct } from "@/constructs/interview-construct.ts";
import {
  readQuestConversation,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  readMemory,
  readMemoryHistory,
  saveMemory,
} from "@/memory/memory-store.ts";
import { listProjects } from "@/projects/store.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";
import {
  restoreFromHistory,
  saveFromEditor,
} from "../test-database/memory-form-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const HER_MEMORY = "- [ ] Rig the fox";
const THEIR_MEMORY = "- [ ] Mine now";

describe("use_case_private_data", () => {
  // Over her memory, which the editor showed as its newest version.
  test("saving another user's memory is not found, and saves nothing", async () => {
    const { her, herData, other, otherData } = await twoUsers();
    const hers = await herData.project();
    const theirs = await otherData.project();
    const { memory } = await saveMemory(her.id, {
      projectId: hers.id,
      text: HER_MEMORY,
      basedOn: MEMORY_VERSION_NUMBER.parse(0),
      author: "user",
    });
    const herHistory = await readMemoryHistory(her.id, hers.id);
    await signIn(other);
    const { version } = memory;

    await expectNotFound(() =>
      saveFromEditor(projectIdFixture(), THEIR_MEMORY, version),
    );
    await expectNotFound(() => saveFromEditor(hers.id, THEIR_MEMORY, version));

    expect(await readMemory(her.id, hers.id)).toEqual(memory);
    expect(await readMemoryHistory(her.id, hers.id)).toEqual(herHistory);
    expect((await readMemory(other.id, theirs.id)).text).toBe("");
    expect(await readMemoryHistory(other.id, theirs.id)).toEqual([]);
  });

  test("starting the conversation of another user's quest answers as for an unknown quest, and starts none", async () => {
    const { her, herData, other } = await twoUsers();
    const hers = await herData.project();

    const unknown = await startQuestConversation(other.id, projectIdFixture());

    expect(unknown).toEqual({ kind: "notFound" });
    expect(await startQuestConversation(other.id, hers.id)).toEqual(unknown);
    expect(await readQuestConversation(her.id, hers.id)).toBeUndefined();
  });
});

describe("Memory restore and project construct ownership", () => {
  test("restoring another user's memory is not found and writes nothing", async () => {
    const { her, herData, other } = await twoUsers();
    const project = await herData.project();
    await saveMemory(her.id, {
      projectId: project.id,
      text: HER_MEMORY,
      basedOn: MEMORY_VERSION_NUMBER.parse(0),
      author: "user",
    });
    const before = await readMemoryHistory(her.id, project.id);
    await signIn(other);
    await expectNotFound(() => restoreFromHistory(project.id, 1, 1));
    await expectNotFound(() => restoreFromHistory(projectIdFixture(), 1, 1));
    expect(await readMemoryHistory(her.id, project.id)).toEqual(before);
  });
  test("creating a project with another user's construct refuses it and creates nothing", async () => {
    const { her, other } = await twoUsers();
    const construct = await cloneConstruct(her.id, "vellum");
    if (construct === undefined) {
      throw new Error("No clone was made");
    }
    await signIn(other);
    const form = new FormData();
    form.set("name", "Foreign construct");
    form.set("constructId", construct.id);
    expect(await saveInterviewConstruct(other.id, construct.id)).toBe(false);
    expect(await listProjects(other.id)).toEqual([]);
  });
});
