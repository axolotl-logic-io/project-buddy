// use_case_private_data in the projects' Server Actions, with two users
// side by side: the other user, signed in as their own account, sends a
// form that names her project. Each action answers exactly as for an
// unknown project, and writes nothing of hers or theirs.
// private-data-chats.server.test.ts covers renaming a chat.
import { describe, expect, test } from "vitest";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { cloneBuddy } from "@/buddies/buddy-store.ts";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { listChats } from "@/chats/store.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  readMemory,
  readMemoryHistory,
  saveMemory,
} from "@/memory/memory-store.ts";
import { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
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

// What the signed-in user's New Chat form answers for the project with
// this id and the default buddy.
function startChatIn(projectId: string): Promise<unknown> {
  const form = new FormData();
  form.set("projectId", projectId);
  form.set("buddyId", DEFAULT_BUDDY_ID);
  return startChatAction({ kind: "idle" }, form);
}

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

  test("starting a chat in another user's project answers as for an unknown project, and starts none", async () => {
    const { her, herData, other } = await twoUsers();
    const hers = await herData.project();
    const herChats = await listChats(her.id, hers.id);
    await signIn(other);

    const unknown = await startChatIn(projectIdFixture());

    expect(unknown).toEqual({
      kind: "invalid",
      message: NEW_CHAT_COPY.chooseProject,
    });
    expect(await startChatIn(hers.id)).toEqual(unknown);
    expect(await listChats(her.id, hers.id)).toEqual(herChats);
  });
});

describe("Memory restore and project buddy ownership", () => {
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
  test("creating a project with another user's buddy refuses it and creates nothing", async () => {
    const { her, other } = await twoUsers();
    const buddy = await cloneBuddy(her.id, "hippy");
    if (buddy === undefined) {
      throw new Error("No clone was made");
    }
    await signIn(other);
    const form = new FormData();
    form.set("name", "Foreign buddy");
    form.set("buddyId", buddy.id);
    expect(await createProjectAction({ kind: "idle" }, form)).toEqual({
      kind: "invalid",
      message: PROJECTS_COPY.chooseBuddy,
    });
    expect(await listProjects(other.id)).toEqual([]);
  });
});
