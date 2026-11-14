// A quest's plan in the test database with the mock construct: the
// construct's change_plan through POST /api/chat, the user's changes from the
// quest's page and from an adventure, the composer's commands, undo, the plan
// in the construct's prompt, who may change it, and the next step Today
// shows. How the plan looks is the browser tests'.

import { convertToModelMessages } from "ai";
import { describe, expect, test, vi } from "vitest";
import {
  listMessages,
  listMessagesForModel,
  readStoppedReply,
  releaseReply,
  saveMessage,
} from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import {
  changePlanAction,
  type PlanActionResult,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { isPlanMessage } from "@/plan/plan-message.ts";
import { readPlanState } from "@/plan/plan-store.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import {
  PLAN_NOTE_MARK,
  planPartForModel,
} from "@/replies/plan-message-prompt.ts";
import { changePlanTool } from "@/replies/tools/change-plan.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  newMessageId,
  question,
  sendChatMessage,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

const BLOCK_OUT = "Block out the body and wings";
const SCULPT = "Sculpt the feather plates";
const RENDER = "Render a turntable";

// How many commands the commands test runs.
const COMMANDS_RUN = 5;

// The texts of the open steps of the user's quest's plan, in order.
async function openTexts(owner: UserId, questId: QuestId): Promise<string[]> {
  const state = await readPlanState(owner, questId);
  return (state?.plan.steps ?? []).flatMap(({ text, done }) => {
    if (done) {
      return [];
    }
    return [text];
  });
}

// The plan's three steps, laid out from the quest's page.
function laidOut(questId: QuestId): Promise<PlanActionResult> {
  return changePlanAction({
    questId,
    operations: [
      { op: "add", text: BLOCK_OUT },
      { op: "add", text: SCULPT },
      { op: "add", text: RENDER },
    ],
  });
}

function command(chatId: ChatId, text: string): Promise<PlanActionResult> {
  return runChatCommandAction({ chatId, text });
}

describe("Plan tool contract", () => {
  test("the construct lays it out with change_plan, and the adventure keeps the change", async () => {
    const { user, chat } = await signedInChat();
    const output = await Promise.resolve(
      changePlanTool.execute?.(
        {
          operations: [
            { op: "add", text: BLOCK_OUT },
            { op: "add", text: SCULPT },
          ],
        },
        {
          toolCallId: "plan",
          messages: [],
          context: {
            construct: chat.construct,
            answeredId: newMessageId(),
            actingUser: user.id,
            chatId: chat.id,
            questId: chat.quest.id,
          },
        },
      ),
    );
    expect(output).toMatchObject({ status: "changed", version: 1 });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
    ]);
  });

  test("a construct's change naming a step that's gone saves nothing and gives the plan back", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    const output = await Promise.resolve(
      changePlanTool.execute?.(
        {
          operations: [
            { op: "complete", step: 1 },
            { op: "remove", step: 9 },
          ],
        },
        {
          toolCallId: "plan",
          messages: [],
          context: {
            construct: chat.construct,
            answeredId: newMessageId(),
            actingUser: user.id,
            chatId: chat.id,
            questId: chat.quest.id,
          },
        },
      ),
    );
    expect(output).toMatchObject({
      status: "not-changed",
      reason: "missing-step",
    });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);
  });

  test("the quest's conversation gets the plan, with step numbers, in its prompt; the private Chat doesn't", async () => {
    const user = await testUser();
    await signIn(user);
    const data = testData(user);
    const quest = await data.quest();
    const [chat, standalone] = await Promise.all([
      data.chat(quest),
      privateChat(user.id),
    ]);
    await laidOut(chat.quest.id);
    await changePlanAction({
      questId: chat.quest.id,
      operations: [{ op: "complete", step: 1 }],
    });

    const prompt = await constructPrompt(chat.id);
    expect(prompt).toContain("<quest_plan>");
    expect(prompt).toContain(`#1 [done] ${BLOCK_OUT}`);
    expect(prompt).toContain(`#2 ${SCULPT}`);
    expect(await constructPrompt(standalone.id)).not.toContain("<quest_plan>");
  });
});

describe("a quest's plan, changed without the construct", () => {
  test("changes from the quest's page and their undo save new versions", async () => {
    const { user, chat } = await signedInChat();
    const added = await laidOut(chat.quest.id);
    const moved = await changePlanAction({
      questId: chat.quest.id,
      operations: [{ op: "move", step: 3, before: 1 }],
    });
    expect(moved).toMatchObject({ kind: "changed", version: 2 });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      RENDER,
      BLOCK_OUT,
      SCULPT,
    ]);

    // Undoing the first change keeps the move made after it.
    expect(added.kind).toBe("changed");
    const undone = await undoPlanChangeAction({
      questId: chat.quest.id,
      version: 1,
    });
    expect(undone).toMatchObject({ kind: "changed", version: 3 });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([]);
    const again = await undoPlanChangeAction({
      questId: chat.quest.id,
      version: 1,
    });
    expect(again).toMatchObject({ kind: "failed", reason: "already-undone" });
    expect((await readPlanState(user.id, chat.quest.id))?.undone).toEqual([1]);
    // Changes made outside an adventure leave its messages alone.
    expect(await listMessages(user.id, chat.id)).toEqual([]);
  });

  test("sidebar edits and Undo update the plan without saving conversation messages", async () => {
    const { user, chat } = await signedInChat();
    await sendChatMessage(chat.id, "Help me with this quest");
    const before = await listMessages(user.id, chat.id);
    const added = await changePlanAction({
      questId: chat.quest.id,
      chatId: chat.id,
      operations: [{ op: "add", text: BLOCK_OUT }],
    });
    expect(added.kind).toBe("changed");
    expect(added).not.toHaveProperty("message");
    expect(await openTexts(user.id, chat.quest.id)).toEqual([BLOCK_OUT]);
    expect(await listMessages(user.id, chat.id)).toEqual(before);
    const edited = await changePlanAction({
      questId: chat.quest.id,
      chatId: chat.id,
      operations: [{ op: "change", step: 1, text: SCULPT }],
    });
    expect(edited).toMatchObject({ kind: "changed", version: 2 });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([SCULPT]);
    expect(await listMessages(user.id, chat.id)).toEqual(before);
    const undone = await undoPlanChangeAction({
      questId: chat.quest.id,
      chatId: chat.id,
      version: 2,
    });
    expect(undone.kind).toBe("changed");
    expect(undone).not.toHaveProperty("message");
    expect(await openTexts(user.id, chat.quest.id)).toEqual([BLOCK_OUT]);
    expect(await listMessages(user.id, chat.id)).toEqual(before);
    expect(await constructPrompt(chat.id)).toContain(BLOCK_OUT);
  });

  test("commands change the plan, show it and undo, saving each to the adventure with no reply", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);

    expect(await command(chat.id, "/done")).toMatchObject({
      kind: "changed",
      lines: [{ kind: "complete", text: BLOCK_OUT }],
    });
    expect(await command(chat.id, "/add Paint the enamel eyes")).toMatchObject({
      kind: "changed",
    });
    expect(await command(chat.id, "/move 4 1")).toMatchObject({
      kind: "changed",
    });
    expect(await command(chat.id, "/plan")).toMatchObject({ kind: "shown" });
    expect(await command(chat.id, "/undo")).toMatchObject({ kind: "changed" });

    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      SCULPT,
      RENDER,
      "Paint the enamel eyes",
    ]);
    const messages = await listMessages(user.id, chat.id);
    expect(messages.every(isPlanMessage)).toBe(true);
    expect(messages).toHaveLength(COMMANDS_RUN);
    expect(messages.at(-1)?.metadata?.author?.id).toBe(user.id);
    expect(await readStoppedReply(user.id, chat.id)).toBeUndefined();
  });

  test("the construct reads a person's plan change in the adventure as a note", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    await command(chat.id, "/done 1");
    const context = await convertToModelMessages(
      await listMessagesForModel(user.id, chat.id),
      { convertDataPart: planPartForModel },
    );
    expect(JSON.stringify(context)).toContain(
      `${PLAN_NOTE_MARK} The user changed the plan, without you: checked off`,
    );
  });

  test("a command with a problem changes nothing and says why", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    const standalone = await privateChat(user.id);

    expect(await command(chat.id, "/frobnicate")).toEqual({
      kind: "problem",
      text: "There's no /frobnicate command. Type / to see the commands.",
    });
    expect(await command(chat.id, "/done 9")).toMatchObject({
      kind: "problem",
    });
    expect(await command(chat.id, "/undo")).toMatchObject({
      kind: "failed",
      reason: "no-such-change",
    });
    expect(await command(standalone.id, "/plan")).toMatchObject({
      kind: "problem",
    });
    expect(await listMessages(user.id, chat.id)).toEqual([]);
  });

  test("only the quest's owner can change its plan, whatever membership another user kept", async () => {
    const [owner, member, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
    ]);
    const data = testData(owner);
    const quest = await data.quest();
    const chat = await data.chat(quest);

    await signIn(owner);
    await laidOut(quest.id);
    expect(await command(chat.id, "/done")).toMatchObject({
      kind: "changed",
    });
    expect(await openTexts(owner.id, quest.id)).toEqual([SCULPT, RENDER]);

    await signIn(member);
    expect(
      await changePlanAction({
        questId: quest.id,
        operations: [{ op: "remove", step: 2 }],
      }),
    ).toEqual({ kind: "not-found" });
    expect(await command(chat.id, "/done")).toEqual({ kind: "not-found" });
    expect(await readPlanState(member.id, quest.id)).toBeUndefined();

    await signIn(stranger);
    expect(await command(chat.id, "/done")).toEqual({ kind: "not-found" });
    expect(await readPlanState(stranger.id, quest.id)).toBeUndefined();
    expect(await openTexts(owner.id, quest.id)).toEqual([SCULPT, RENDER]);
  });

  test("Continue's next step comes only from the plan", async () => {
    const { user, chat } = await signedInChat();
    await sendChatMessage(chat.id, "Hello");
    expect((await readCurrentQuest(user.id))?.nextStep).toBeUndefined();
    await laidOut(chat.quest.id);
    expect((await readCurrentQuest(user.id))?.nextStep).toBe(BLOCK_OUT);
    await changePlanAction({
      questId: chat.quest.id,
      operations: [
        { op: "remove", step: 1 },
        { op: "remove", step: 2 },
        { op: "remove", step: 3 },
      ],
    });
    expect((await readCurrentQuest(user.id))?.nextStep).toBeUndefined();
  });

  test("controls and commands can add beyond the former step limit", async () => {
    const ManySteps = 40;
    const { user, chat } = await signedInChat();
    await changePlanAction({
      questId: chat.quest.id,
      operations: Array.from({ length: ManySteps }, (_, index) => ({
        op: "add" as const,
        text: `Study ${index + 1}`,
      })),
    });
    expect(
      await changePlanAction({
        questId: chat.quest.id,
        operations: [{ op: "add", text: "One more study" }],
      }),
    ).toMatchObject({ kind: "changed" });
    expect(await command(chat.id, "/add Another study")).toMatchObject({
      kind: "changed",
    });
    expect(await openTexts(user.id, chat.quest.id)).toHaveLength(ManySteps + 2);
  });

  test("undoing an older change keeps a newer edit of the same step", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    const first = await changePlanAction({
      questId: chat.quest.id,
      operations: [{ op: "change", step: 2, text: "Sculpt the brass plates" }],
    });
    await changePlanAction({
      questId: chat.quest.id,
      operations: [{ op: "change", step: 2, text: "Sculpt the copper plates" }],
    });
    if (first.kind !== "changed") {
      throw new Error("The first edit wasn't saved");
    }

    expect(
      await undoPlanChangeAction({
        questId: chat.quest.id,
        version: first.version,
      }),
    ).toMatchObject({ kind: "failed", reason: "nothing-to-undo" });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      "Sculpt the copper plates",
      RENDER,
    ]);
  });
});

describe("use_case_plan_commands", () => {
  test("after a failed reply, plan changes in the adventure wait, so the message can still be sent again", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    const unanswered = question("An interrupted message");
    await saveMessage(user.id, chat.id, unanswered);
    await releaseReply(user.id, chat.id, unanswered.id);

    expect(await command(chat.id, "/add Sketch wings")).toMatchObject({
      kind: "failed",
      reason: "awaiting-reply",
    });
    expect(await command(chat.id, "/plan")).toMatchObject({
      kind: "failed",
      reason: "awaiting-reply",
    });
    expect(
      await changePlanAction({
        questId: chat.quest.id,
        chatId: chat.id,
        operations: [{ op: "complete", step: 1 }],
      }),
    ).toMatchObject({ kind: "failed", reason: "awaiting-reply" });

    // Nothing came after the failed message, so it is still the one to send
    // again, and the plan is as it was.
    expect((await listMessages(user.id, chat.id)).at(-1)?.id).toBe(
      unanswered.id,
    );
    expect(await readStoppedReply(user.id, chat.id)).toBe(unanswered.id);
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);

    // The quest's page still changes the plan; once a reply answers, the
    // adventure does too.
    expect(
      await changePlanAction({
        questId: chat.quest.id,
        operations: [{ op: "complete", step: 1 }],
      }),
    ).toMatchObject({ kind: "changed" });
    await sendChatMessage(chat.id, "Still there?");
    expect(await command(chat.id, "/add Sketch wings")).toMatchObject({
      kind: "changed",
    });
  });

  test("while a reply is being made, here or elsewhere, a person's plan change in the adventure waits", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    // Saving the message claims its reply, as the route does before it
    // replies.
    await saveMessage(user.id, chat.id, question("Hello", newMessageId()));

    expect(await command(chat.id, "/done")).toMatchObject({
      kind: "failed",
      reason: "awaiting-reply",
    });
    expect(
      await undoPlanChangeAction({
        questId: chat.quest.id,
        chatId: chat.id,
        version: 1,
      }),
    ).toMatchObject({ kind: "failed", reason: "awaiting-reply" });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);
  });

  test("/undo passes over a change with nothing left to undo", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    await command(chat.id, "/done 1");
    await command(chat.id, "/add Paint the enamel eyes");
    // The added step is removed from the quest's page.
    await changePlanAction({
      questId: chat.quest.id,
      operations: [{ op: "remove", step: 4 }],
    });

    expect(await command(chat.id, "/undo")).toMatchObject({
      kind: "changed",
      lines: [{ kind: "reopen", text: BLOCK_OUT }],
    });
    expect(await command(chat.id, "/undo")).toMatchObject({
      kind: "failed",
      reason: "no-such-change",
    });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);
  });
});
