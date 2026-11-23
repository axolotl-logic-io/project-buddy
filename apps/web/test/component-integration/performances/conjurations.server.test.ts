// Conjuring in a performance through the server action, as the composer
// does: what the action answers and what the performance and its space
// then hold, which is all a reload shows (performances.md,
// when-things-go-wrong.md and access.md). How the composer and transcript
// look is the performance browser tests'.

import { expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { AppError } from "@/errors/app-error.ts";
import {
  conjureAction,
  startPerformanceAction,
} from "@/performances/performance-actions.ts";
import {
  listPerformances,
  type Performance,
  type PerformanceId,
  readConjurations,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createOrResumeQuest, getQuest, type Quest } from "@/quests/store.ts";
import { riteReply } from "@/rites/rite.ts";
import { listMurmlings } from "@/spaces/murmling-store.ts";
import { murmlingLimit } from "@/spaces/space.ts";
import { listSpaces, type Space } from "@/spaces/space-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { lapsed, signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/rites/rite.ts", { spy: true });

interface Performing {
  readonly user: User;
  readonly quest: Quest;
  readonly space: Space;
  readonly performance: Performance;
}

interface ConjureRequest {
  readonly questId: Quest["id"];
  readonly performanceId: PerformanceId;
  readonly id: string;
  readonly text: string;
}

// A signed-in user with a Brainstorm performance active on the quest's
// first space.
async function performing(
  constructId: Quest["constructId"] = "vellum",
): Promise<Performing> {
  const user = await testUser();
  const { quest } = await createOrResumeQuest(
    user.id,
    QUEST_NAME.parse("Workshop"),
    { constructId },
  );
  await signIn(user);
  const [space] = await listSpaces(user.id, quest.id);
  if (space === undefined) {
    throw new Error("The quest has no starting spaces");
  }
  await startPerformanceAction({
    questId: quest.id,
    spaceId: space.id,
    riteId: "brainstorm",
  });
  const [performance] = await listPerformances(user.id, quest.id);
  if (performance === undefined) {
    throw new Error("The performance was not started");
  }
  return { user, quest, space, performance };
}

function request(
  { quest, performance }: Performing,
  text: string,
): ConjureRequest {
  return {
    questId: quest.id,
    performanceId: performance.id,
    id: crypto.randomUUID(),
    text,
  };
}

async function murmlingTexts({
  user,
  quest,
  space,
}: Performing): Promise<string[]> {
  const murmlings = await listMurmlings(user.id, quest.id, space.id);
  return murmlings.map(({ text }) => text);
}

test("use_case_send_message", async () => {
  const setup = await performing();
  const { user, space, performance } = setup;
  const sent = request(setup, "Try a paper prototype");

  expect(await conjureAction(sent)).toBeUndefined();

  expect(await listMurmlings(user.id, setup.quest.id, space.id)).toMatchObject([
    { text: sent.text, type: space.newType },
  ]);
  const [entry] = await readConjurations(user.id, performance.id);
  expect(entry).toMatchObject({ id: sent.id, text: sent.text, added: 1 });
  expect(performance.rite.replies).toContain(entry?.reply);

  expect(await conjureAction(request(setup, "   "))).toBe(
    PERFORMANCE_COPY.required,
  );
  expect(await readConjurations(user.id, performance.id)).toHaveLength(1);
});

test("use_case_send_message: a conjuration the space can't hold adds nothing", async () => {
  const setup = await performing();
  const { user, space, performance } = setup;
  const limit = murmlingLimit(space.newType);
  const tooLong = "x".repeat(limit + 1);

  expect(await conjureAction(request(setup, tooLong))).toBeUndefined();

  expect(await murmlingTexts(setup)).toEqual([]);
  const [entry] = await readConjurations(user.id, performance.id);
  expect(entry).toMatchObject({
    added: 0,
    reply: PERFORMANCE_COPY.refused(limit, space.singular),
  });
});

test("use_case_leave_during_reply", async () => {
  const setup = await performing();
  const sent = request(setup, "Sketch the frame");

  await Promise.all([conjureAction(sent), conjureAction(sent)]);
  expect(await conjureAction(sent)).toBeUndefined();

  expect(await murmlingTexts(setup)).toEqual([sent.text]);
  expect(
    await readConjurations(setup.user.id, setup.performance.id),
  ).toMatchObject([{ id: sent.id, text: sent.text }]);
});

test("use_case_performance_required", async () => {
  const user = await testUser();
  const { quest } = await createOrResumeQuest(
    user.id,
    QUEST_NAME.parse("Workshop"),
    {},
  );
  await signIn(user);

  expect(
    await conjureAction({
      questId: quest.id,
      performanceId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      text: "Nothing to conjure into",
    }),
  ).toBe(PERFORMANCE_COPY.required);

  const spaces = await listSpaces(user.id, quest.id);
  const contents = await Promise.all(
    spaces.map(({ id }) => listMurmlings(user.id, quest.id, id)),
  );
  expect(contents.flat()).toEqual([]);
  expect(await listPerformances(user.id, quest.id)).toEqual([]);
});

test("use_case_continue_performance", async () => {
  const setup = await performing();
  const { user, quest, performance } = setup;
  const first = request(setup, "Sketch the frame");
  await conjureAction(first);

  // Reopening the quest: a new visit reads the active performance again.
  await signIn(user);
  const [active] = await listPerformances(user.id, quest.id);
  expect(active).toMatchObject({ id: performance.id, endedAt: null });
  const second = request(setup, "Cut the panels");
  expect(await conjureAction(second)).toBeUndefined();

  expect(await readConjurations(user.id, performance.id)).toMatchObject([
    { id: first.id, text: first.text, reply: expect.any(String) },
    { id: second.id, text: second.text, reply: expect.any(String) },
  ]);
  expect(await murmlingTexts(setup)).toEqual([first.text, second.text]);
});

test("use_case_construct_voice_consistent", async () => {
  const setup = await performing("lumen");
  const { user, quest, performance } = setup;
  await conjureAction(request(setup, "Sketch the frame"));

  await signIn(user);
  await conjureAction(request(setup, "Cut the panels"));

  expect((await getQuest(user.id, quest.id))?.constructId).toBe("lumen");
  const replies = (await readConjurations(user.id, performance.id)).map(
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

  expect(await conjureAction(sent)).toBe(
    new AppError("unknown", undefined).message,
  );
  expect(await murmlingTexts(setup)).toEqual([]);
  expect(await readConjurations(user.id, performance.id)).toEqual([]);

  // Retry reply sends the same conjuration again.
  expect(await conjureAction(sent)).toBeUndefined();
  expect(await murmlingTexts(setup)).toEqual([sent.text]);
  expect(await readConjurations(user.id, performance.id)).toMatchObject([
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

  const answers = await Promise.all(sent.map(conjureAction));

  expect(answers).toEqual([undefined, undefined]);
  const texts = sent.map(({ text }) => text);
  const entries = await readConjurations(user.id, performance.id);
  expect(entries).toHaveLength(sent.length);
  expect(entries.map(({ text }) => text)).toEqual(
    expect.arrayContaining(texts),
  );
  for (const entry of entries) {
    expect(performance.rite.replies).toContain(entry.reply);
  }
  const murmlings = await murmlingTexts(setup);
  expect(murmlings).toHaveLength(sent.length);
  expect(murmlings).toEqual(expect.arrayContaining(texts));
});

test("use_case_session_expired_in_performance", async () => {
  const setup = await performing();
  const { user, performance } = setup;
  await lapsed(user);

  expect(await conjureAction(request(setup, "Still there?"))).toBe(
    PERFORMANCE_COPY.signedOut,
  );

  await signIn(user);
  expect(await readConjurations(user.id, performance.id)).toEqual([]);
  expect(await murmlingTexts(setup)).toEqual([]);
});
