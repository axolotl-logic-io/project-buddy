import { expect, test, vi } from "vitest";
import { getChat, saveMessage } from "@/chats/store.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import {
  deleteRetiredDefinition,
  getRetiredDefinition,
  restoreDefinition,
  retireDefinition,
} from "@/retirement/retirement-store.ts";
import {
  cloneSpell,
  createSpell,
  getOwnSpell,
  listOwnSpells,
  updateSpell,
} from "@/spells/own-spell-store.ts";
import { spellReply } from "@/spells/spell-reply.ts";
import {
  currentSpell,
  readActiveSpell,
  setSpell,
} from "@/spells/spell-store.ts";
import { TASK_TEXT_MAX_LENGTH } from "@/tasks/tasks.ts";
import { changeTasks, readTasks } from "@/tasks/tasks-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  constructReply,
  messageText,
  question,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

test("use_case_customize_spell", async () => {
  const { user, chat } = await signedInChat();
  const copy = await cloneSpell(user.id, "brainstorm");
  if (copy === undefined) {
    throw new Error("Expected a spell copy");
  }
  const edited = await updateSpell(user.id, copy.id, {
    name: "Small tasks",
    definition: {
      destination: "tasks",
      castReply: "Ready: {{spell}} in {{bucket}}.",
      savedReply: "Kept {{message}}.",
      stopReply: "Until next time.",
      invalidReply: "Try a shorter message.",
    },
  });
  expect(edited?.definition.destination).toBe("tasks");
  expect(messageText(await constructReply(chat.id, "cast Small tasks"))).toBe(
    "Ready: Small tasks in Tasks.",
  );
  expect(await currentSpell(user.id, chat)).toBe(copy.id);
  expect(await constructPrompt(chat.id)).toContain("Active spell: Small tasks");
  expect(messageText(await constructReply(chat.id, "Sketch a fox"))).toBe(
    "Kept Sketch a fox.",
  );
  expect((await readTasks(user.id, chat.quest.id))?.items).toMatchObject([
    { text: "Sketch a fox", done: false },
  ]);
  expect(await listIdeas(user.id, chat.quest.id)).toEqual([]);
  await updateSpell(user.id, copy.id, {
    name: "New ideas",
    definition: {
      destination: "brainstorm",
    },
  });
  expect((await readActiveSpell(user.id, chat))?.name).toBe("Small tasks");
  expect(messageText(await constructReply(chat.id, "Buy clay"))).toBe(
    "Kept Buy clay.",
  );
  expect(
    messageText(
      await constructReply(chat.id, "x".repeat(TASK_TEXT_MAX_LENGTH + 1)),
    ),
  ).toBe("Try a shorter message.");
  expect((await readTasks(user.id, chat.quest.id))?.items).toHaveLength(2);
  expect(messageText(await constructReply(chat.id, "/stop"))).toBe(
    "Until next time.",
  );

  await constructReply(chat.id, "cast New ideas");
  await constructReply(chat.id, "Try origami");
  expect(
    (await listIdeas(user.id, chat.quest.id)).map((idea) => idea.text),
  ).toEqual(["Try origami"]);
  expect((await getChat(user.id, chat.id))?.activeSpell?.name).toBe(
    "New ideas",
  );
});

test("own spells enforce ownership and retirement preserves an active snapshot", async () => {
  const { user, chat } = await signedInChat();
  const other = await testUser();
  const spell = await createSpell(user.id, {
    name: "Possibilities",
    definition: { destination: "brainstorm" },
  });
  expect(await getOwnSpell(other.id, spell.id)).toBeUndefined();
  expect(await listOwnSpells(other.id)).toEqual([]);
  expect(await cloneSpell(other.id, spell.id)).toBeUndefined();
  expect(
    await updateSpell(other.id, spell.id, {
      name: "Stolen",
      definition: spell.definition,
    }),
  ).toBeUndefined();
  expect(await setSpell(other.id, { chatId: chat.id, spell: spell.id })).toBe(
    false,
  );
  const otherData = testData(other);
  const otherQuest = await otherData.quest();
  const otherChat = await otherData.chat(otherQuest);
  expect(
    await setSpell(other.id, { chatId: otherChat.id, spell: spell.id }),
  ).toBe(false);
  expect((await listOwnSpells(user.id)).map((entry) => entry.id)).toContain(
    spell.id,
  );

  expect(await retireDefinition(other.id, "spell", spell.id)).toBe(false);
  expect(await setSpell(user.id, { chatId: chat.id, spell: spell.id })).toBe(
    true,
  );
  expect(await retireDefinition(user.id, "spell", spell.id)).toBe(true);
  expect(await getOwnSpell(user.id, spell.id)).toBeUndefined();
  expect(await setSpell(user.id, { chatId: chat.id, spell: spell.id })).toBe(
    false,
  );
  expect((await readActiveSpell(user.id, chat))?.name).toBe(spell.name);
  expect((await getRetiredDefinition(user.id, spell.id))?.texts).toContainEqual(
    { name: "destination", text: "Ideas" },
  );
  expect(await restoreDefinition(user.id, spell.id)).toBe(true);
  expect((await getOwnSpell(user.id, spell.id))?.definition).toEqual(
    spell.definition,
  );
  await retireDefinition(user.id, "spell", spell.id);
  expect(await deleteRetiredDefinition(user.id, spell.id)).toBe(true);
  expect((await readActiveSpell(user.id, chat))?.definition).toEqual(
    spell.definition,
  );
  await setSpell(user.id, { chatId: chat.id, spell: undefined });
  expect(await currentSpell(user.id, chat)).toBeUndefined();
});

test("spells keep capturing messages beyond the former task limit", async () => {
  const { user, chat } = await signedInChat();
  const ManyTasks = 40;
  const spell = await createSpell(user.id, {
    name: "Keep tasks",
    definition: {
      destination: "tasks",
      savedReply: "Kept {{message}}.",
    },
  });
  await setSpell(user.id, { chatId: chat.id, spell: spell.id });
  await changeTasks(
    user.id,
    { questId: chat.quest.id, author: "person" },
    Array.from({ length: ManyTasks }, (_, index) => ({
      op: "add",
      text: `Task ${index}`,
    })),
  );
  expect(messageText(await constructReply(chat.id, "Buy paint"))).toBe(
    "Kept Buy paint.",
  );
  expect((await readTasks(user.id, chat.quest.id))?.items).toHaveLength(
    ManyTasks + 1,
  );
});

test("a saved random reply is reused on retry while a new message can select another variant", async () => {
  const { user, chat } = await signedInChat();
  const spell = await createSpell(user.id, {
    name: "Varied ideas",
    definition: {
      destination: "brainstorm",
      savedReply: ["First: {{message}}", "Second: {{message}}"],
    },
  });
  await setSpell(user.id, { chatId: chat.id, spell: spell.id });
  const first = question("Try clay");
  await saveMessage(user.id, chat.id, first);
  const LastChoiceRandom = 0.999;
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  try {
    expect(await spellReply(user.id, chat, first)).toBe("First: Try clay");
    random.mockReturnValue(LastChoiceRandom);
    expect(await spellReply(user.id, chat, first)).toBe("First: Try clay");
    const second = question("Try origami");
    await saveMessage(user.id, chat.id, second);
    expect(await spellReply(user.id, chat, second)).toBe("Second: Try origami");
    const ideas = await listIdeas(user.id, chat.quest.id);
    expect(ideas).toHaveLength(2);
    expect(ideas.map((idea) => idea.text)).toEqual(
      expect.arrayContaining(["Try clay", "Try origami"]),
    );
  } finally {
    random.mockRestore();
  }
});

test("casting uses case-insensitive owner-scoped names and refuses ids and ambiguous names", async () => {
  const { user, chat } = await signedInChat();
  const other = await testUser();
  const own = await createSpell(user.id, {
    name: "Alstorm",
    definition: { destination: "brainstorm" },
  });
  await createSpell(other.id, {
    name: "Alstorm",
    definition: { destination: "tasks" },
  });
  await constructReply(chat.id, "cast aLsToRm");
  expect(await currentSpell(user.id, chat)).toBe(own.id);
  await constructReply(chat.id, "cast Tasks");
  await constructReply(chat.id, `cast ${own.id}`);
  expect(await currentSpell(user.id, chat)).toBe("tasks");
  await createSpell(user.id, {
    name: "Alstorm",
    definition: { destination: "tasks" },
  });
  const refused = messageText(await constructReply(chat.id, "cast alstorm"));
  expect(refused).toContain("Several spells share that name");
  expect(await currentSpell(user.id, chat)).toBe("tasks");
  const multiword = await createSpell(user.id, {
    name: "Small experiments",
    definition: { destination: "brainstorm" },
  });
  await constructReply(chat.id, "cast SMALL   experiments");
  expect(await currentSpell(user.id, chat)).toBe(multiword.id);
});
