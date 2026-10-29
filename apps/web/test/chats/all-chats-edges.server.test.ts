// Query edge cases use isolated users and the test database, never the page.
import { expect, test } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { createChat, type NewChatBuddy } from "@/chats/new-chat-store.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { getChat, renameChat } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { chatIdFixture } from "../id-fixtures.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";
import { chatNameFixture } from "./chat-name-fixtures.ts";

const TIED_AT = new Date("2026-01-02T00:00:00Z");

test("orders fixed tied ids across both chat kinds, not by insertion order or kind", async () => {
  const [user, other] = await Promise.all([testUser(), testUser()]);
  const project = await testData(user).project();
  const foreignProject = await testData(other).project();
  const first = chatIdFixture("10000000-0000-4000-8000-000000000001");
  const second = chatIdFixture("20000000-0000-4000-8000-000000000002");
  const third = chatIdFixture("30000000-0000-4000-8000-000000000003");
  const fourth = chatIdFixture("40000000-0000-4000-8000-000000000004");
  // Seed exact ids and timestamps: neither insertion direction nor grouping
  // by kind yields the required fourth, third, second, first order.
  await getDb()
    .insert(chats)
    .values([
      {
        id: third,
        projectId: project.id,
        buddyId: "hippy",
        createdAt: TIED_AT,
      },
      {
        id: first,
        projectId: project.id,
        buddyId: "hippy",
        createdAt: TIED_AT,
      },
      { id: fourth, userId: user.id, buddyId: "mr-tee", createdAt: TIED_AT },
      { id: second, userId: user.id, buddyId: "mr-tee", createdAt: TIED_AT },
      { projectId: foreignProject.id, buddyId: "hippy", createdAt: TIED_AT },
      { userId: other.id, buddyId: "hippy", createdAt: TIED_AT },
    ]);

  expect((await listAllChats(user.id)).map(({ id }) => id)).toEqual([
    fourth,
    third,
    second,
    first,
  ]);
  expect((await listAllChats(user.id, project.id)).map(({ id }) => id)).toEqual(
    [third, first],
  );
});

test("preserves custom buddy snapshots and renamed details for both chat kinds", async () => {
  const [user, other] = await Promise.all([testUser(), testUser()]);
  const project = await testData(user).project("Snapshot project");
  const buddy: NewChatBuddy = {
    ...getBuddy("hippy"),
    name: "Stored custom buddy",
    parts: { ...getBuddy("hippy").parts, voice: "A stored custom voice" },
  };
  const projectChat = await createChat(user.id, { project, buddy });
  const central = await createStandaloneChat(user.id, buddy);
  await createStandaloneChat(other.id);
  const name = chatNameFixture("A renamed conversation");
  await renameChat(user.id, projectChat.id, name);
  await renameChat(user.id, central.id, name);

  const found = await listAllChats(user.id);

  expect(found).toHaveLength(2);
  expect(found.map(({ id }) => id)).toEqual(
    expect.arrayContaining([central.id, projectChat.id]),
  );
  expect(found).toEqual(
    await Promise.all(found.map(({ id }) => getChat(user.id, id))),
  );
  for (const chat of found) {
    expect(chat).toMatchObject({
      name,
      renamedByHand: true,
      buddy: { name: buddy.name, parts: buddy.parts },
    });
  }
  expect(await listAllChats(user.id, project.id)).toEqual(
    found.filter(({ id }) => id === projectChat.id),
  );
});
