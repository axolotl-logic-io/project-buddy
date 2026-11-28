// Sending a message in a performance through the server action, as the composer
// does: what the action answers and what the performance and its list
// then hold, which is all a reload shows (performances.md,
// when-things-go-wrong.md and access.md). How the composer and transcript
// look is the performance browser tests'.

import { expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { AppError } from "@/errors/app-error.ts";
import { newPerformanceId, type PerformanceId } from "@/ids.ts";
import { listItemLimit } from "@/lists/list.ts";
import { readListItems } from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import {
  sendMessageAction,
  startPerformanceAction,
} from "@/performances/performance-actions.ts";
import {
  listPerformances,
  type Performance,
  readPerformanceMessages,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest, getQuest, type Quest } from "@/quests/store.ts";
import {
  type ReplyChoice,
  type RiteDefinition,
  riteReply,
} from "@/rites/rite.ts";
import { saveRite } from "@/rites/rite-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { lapsed, signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/rites/rite.ts", { spy: true });

interface Performing {
  readonly user: User;
  readonly quest: Quest;
  readonly list: List;
  readonly performance: Performance;
}

interface SendMessageRequest {
  readonly questId: Quest["id"];
  readonly performanceId: PerformanceId;
  readonly id: string;
  readonly text: string;
  readonly reply?: ReplyChoice;
}

// A signed-in user with a Brainstorm performance active on the quest's
// first list.
async function performing(
  constructId: Quest["constructId"] = "vellum",
): Promise<Performing> {
  const user = await testUser();
  const quest = await createQuest(user.id, QUEST_NAME.parse("Workshop"), {
    constructId,
  });
  await signIn(user);
  const [list] = await readLists(user.id, quest.id);
  if (list === undefined) {
    throw new Error("The quest has no starting lists");
  }
  await startPerformanceAction({
    id: newPerformanceId(),
    questId: quest.id,
    listId: list.id,
    riteId: "brainstorm",
  });
  const [performance] = await listPerformances(user.id, quest.id);
  if (performance === undefined) {
    throw new Error("The performance was not started");
  }
  return { user, quest, list, performance };
}

function request(
  { quest, performance }: Performing,
  text: string,
): SendMessageRequest {
  return {
    questId: quest.id,
    performanceId: performance.id,
    id: crypto.randomUUID(),
    text,
  };
}

async function listItemTexts({
  user,
  quest,
  list,
}: Performing): Promise<string[]> {
  const listItems = await readListItems(user.id, quest.id, list.id);
  return listItems.map(({ text }) => text);
}

test("use_case_send_message", async () => {
  const setup = await performing();
  const { user, list, performance } = setup;
  const sent = request(setup, "Try a paper prototype");

  expect(await sendMessageAction(sent)).toBeUndefined();

  expect(await readListItems(user.id, setup.quest.id, list.id)).toMatchObject([
    { text: sent.text },
  ]);
  const [entry] = await readPerformanceMessages(user.id, performance.id);
  expect(entry).toMatchObject({ id: sent.id, text: sent.text, added: 1 });
  expect(performance.rite.replies).toContain(entry?.reply);

  expect(await sendMessageAction(request(setup, "   "))).toBe(
    PERFORMANCE_COPY.required,
  );
  expect(await readPerformanceMessages(user.id, performance.id)).toHaveLength(
    1,
  );
});

test("use_case_send_message: a message the list can't hold adds nothing", async () => {
  const setup = await performing();
  const { user, list, performance } = setup;
  const limit = listItemLimit(list.type);
  const tooLong = "x".repeat(limit + 1);

  expect(await sendMessageAction(request(setup, tooLong))).toBeUndefined();

  expect(await listItemTexts(setup)).toEqual([]);
  const [entry] = await readPerformanceMessages(user.id, performance.id);
  expect(entry).toMatchObject({
    added: 0,
    reply: PERFORMANCE_COPY.refused(limit, LISTS_COPY.nouns(list.type).one),
  });
});

test("use_case_leave_during_reply", async () => {
  const setup = await performing();
  const sent = request(setup, "Sketch the frame");

  await Promise.all([sendMessageAction(sent), sendMessageAction(sent)]);
  expect(await sendMessageAction(sent)).toBeUndefined();

  expect(await listItemTexts(setup)).toEqual([sent.text]);
  expect(
    await readPerformanceMessages(setup.user.id, setup.performance.id),
  ).toMatchObject([{ id: sent.id, text: sent.text }]);
});

test("use_case_performance_required", async () => {
  const user = await testUser();
  const quest = await createQuest(user.id, QUEST_NAME.parse("Workshop"), {});
  await signIn(user);

  expect(
    await sendMessageAction({
      questId: quest.id,
      performanceId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      text: "Nothing to send to",
    }),
  ).toBe(PERFORMANCE_COPY.required);

  const lists = await readLists(user.id, quest.id);
  const contents = await Promise.all(
    lists.map(({ id }) => readListItems(user.id, quest.id, id)),
  );
  expect(contents.flat()).toEqual([]);
  expect(await listPerformances(user.id, quest.id)).toEqual([]);
});

test("use_case_continue_performance", async () => {
  const setup = await performing();
  const { user, quest, performance } = setup;
  const first = request(setup, "Sketch the frame");
  await sendMessageAction(first);

  // Reopening the quest: a new visit reads the active performance again.
  await signIn(user);
  const [active] = await listPerformances(user.id, quest.id);
  expect(active).toMatchObject({ id: performance.id, endedAt: null });
  const second = request(setup, "Cut the panels");
  expect(await sendMessageAction(second)).toBeUndefined();

  expect(await readPerformanceMessages(user.id, performance.id)).toMatchObject([
    { id: first.id, text: first.text, reply: expect.any(String) },
    { id: second.id, text: second.text, reply: expect.any(String) },
  ]);
  expect(await listItemTexts(setup)).toEqual([first.text, second.text]);
});

test("use_case_construct_voice_consistent", async () => {
  const setup = await performing("lumen");
  const { user, quest, performance } = setup;
  await sendMessageAction(request(setup, "Sketch the frame"));

  await signIn(user);
  await sendMessageAction(request(setup, "Cut the panels"));

  expect((await getQuest(user.id, quest.id))?.constructId).toBe("lumen");
  const replies = (await readPerformanceMessages(user.id, performance.id)).map(
    ({ reply }) => reply,
  );
  expect(replies).toHaveLength(2);
  for (const reply of replies) {
    expect(performance.rite.replies).toContain(reply);
  }
});

test("use_case_reply_fails", async () => {
  const setup = await performing();
  const { user, performance } = setup;
  const sent = request(setup, "Sketch the frame");
  vi.mocked(riteReply).mockImplementationOnce(() => {
    throw new Error("The reply could not be made");
  });

  expect(await sendMessageAction(sent)).toBe(
    new AppError("unknown", undefined).message,
  );
  expect(await listItemTexts(setup)).toEqual([]);
  expect(await readPerformanceMessages(user.id, performance.id)).toEqual([]);

  // Retry reply sends the same message again.
  expect(await sendMessageAction(sent)).toBeUndefined();
  expect(await listItemTexts(setup)).toEqual([sent.text]);
  expect(await readPerformanceMessages(user.id, performance.id)).toMatchObject([
    { id: sent.id, added: 1 },
  ]);
});

test("use_case_send_while_construct_replies", async () => {
  const setup = await performing();
  const { user, performance } = setup;
  const sent = [
    request(setup, "Sketch the frame"),
    request(setup, "Cut the panels"),
  ];

  const answers = await Promise.all(sent.map(sendMessageAction));

  expect(answers).toEqual([undefined, undefined]);
  const texts = sent.map(({ text }) => text);
  const entries = await readPerformanceMessages(user.id, performance.id);
  expect(entries).toHaveLength(sent.length);
  expect(entries.map(({ text }) => text)).toEqual(
    expect.arrayContaining(texts),
  );
  for (const entry of entries) {
    expect(performance.rite.replies).toContain(entry.reply);
  }
  const listItems = await listItemTexts(setup);
  expect(listItems).toHaveLength(sent.length);
  expect(listItems).toEqual(expect.arrayContaining(texts));
});

test("use_case_session_expired_in_performance", async () => {
  const setup = await performing();
  const { user, performance } = setup;
  await lapsed(user);

  expect(await sendMessageAction(request(setup, "Still there?"))).toBe(
    PERFORMANCE_COPY.signedOut,
  );

  await signIn(user);
  expect(await readPerformanceMessages(user.id, performance.id)).toEqual([]);
  expect(await listItemTexts(setup)).toEqual([]);
});

// A signed-in user performing their own rite on the quest's first list.
async function performingOwn(
  definition: Omit<RiteDefinition, "name" | "firstMessage">,
): Promise<Performing> {
  const user = await testUser();
  const quest = await createQuest(user.id, QUEST_NAME.parse("Workshop"));
  await signIn(user);
  const [list] = await readLists(user.id, quest.id);
  const rite = await saveRite(user.id, {
    ...definition,
    name: "Plan",
    firstMessage: "Plan begins.",
  });
  if (list === undefined || rite === undefined) {
    throw new Error("The performance could not be prepared");
  }
  await startPerformanceAction({
    id: newPerformanceId(),
    questId: quest.id,
    listId: list.id,
    riteId: rite.id,
  });
  const [performance] = await listPerformances(user.id, quest.id);
  if (performance === undefined) {
    throw new Error("The performance was not started");
  }
  return { user, quest, list, performance };
}

test("use_case_reply_order: the browser's choice of reply is saved", async () => {
  const setup = await performingOwn({
    replies: ["First {text}", "Second {text}"],
    order: "random",
    loop: true,
    finalReply: "",
  });

  expect(
    await sendMessageAction({
      ...request(setup, "idea"),
      reply: { kind: "reply", index: 1 },
    }),
  ).toBeUndefined();

  expect(
    await readPerformanceMessages(setup.user.id, setup.performance.id),
  ).toMatchObject([{ reply: "Second idea", replyIndex: 1 }]);
});

test("use_case_conclude_rite", async () => {
  const setup = await performingOwn({
    replies: ["First", "Second"],
    order: "ordered",
    loop: false,
    finalReply: "That is {list} done.",
  });
  const { user, quest, list, performance } = setup;

  const sent = ["One", "Two", "Three"];
  expect(await sendMessageAction(request(setup, "One"))).toBeUndefined();
  expect(await sendMessageAction(request(setup, "Two"))).toBeUndefined();
  expect(await sendMessageAction(request(setup, "Three"))).toBeUndefined();

  expect(await readPerformanceMessages(user.id, performance.id)).toMatchObject([
    { reply: "First", replyIndex: 0 },
    { reply: "Second", replyIndex: 1 },
    { reply: `That is ${list.name} done.`, replyIndex: null },
  ]);
  const [ended] = await listPerformances(user.id, quest.id);
  expect(ended?.endedAt).not.toBeNull();
  expect(ended?.closing).toBe(
    PERFORMANCE_COPY.closing(
      "Plan",
      sent.length,
      LISTS_COPY.nouns(list.type).many,
    ),
  );
  expect(await sendMessageAction(request(setup, "Four"))).toBe(
    PERFORMANCE_COPY.required,
  );
  expect(await listItemTexts(setup)).toEqual(sent);
});
