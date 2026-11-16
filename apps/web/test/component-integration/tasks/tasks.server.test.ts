// A quest's tasks in the test database with the local construct engine: the
// construct's change_tasks through POST /api/chat, the user's changes from the
// quest's page and from an adventure, the composer's commands, undo, the tasks
// in the construct's prompt, who may change it, and the next task Today
// shows. How the tasks looks is the browser tests'.

import { convertToModelMessages } from "ai";
import { describe, expect, test, vi } from "vitest";
import {
  listMessages,
  listMessagesForModel,
  readStoppedReply,
  releaseReply,
  saveMessage,
} from "@/chats/store.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import {
  TASKS_NOTE_MARK,
  tasksPartForModel,
} from "@/replies/tasks-message-prompt.ts";
import { changeTasksTool } from "@/replies/tools/change-tasks.ts";
import {
  changeTasksAction,
  runChatCommandAction,
  type TasksActionResult,
  undoTasksChangeAction,
} from "@/tasks/tasks-actions.ts";
import { isTasksMessage } from "@/tasks/tasks-message.ts";
import { readTasksState } from "@/tasks/tasks-store.ts";
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

// The texts of the open tasks of the user's quest's tasks, in order.
async function openTexts(owner: UserId, questId: QuestId): Promise<string[]> {
  const state = await readTasksState(owner, questId);
  return (state?.tasks.items ?? []).flatMap(({ text, done }) => {
    if (done) {
      return [];
    }
    return [text];
  });
}

// The task list's three tasks, laid out from the quest's page.
function laidOut(questId: QuestId): Promise<TasksActionResult> {
  return changeTasksAction({
    questId,
    operations: [
      { op: "add", text: BLOCK_OUT },
      { op: "add", text: SCULPT },
      { op: "add", text: RENDER },
    ],
  });
}

function command(chatId: ChatId, text: string): Promise<TasksActionResult> {
  return runChatCommandAction({ chatId, text });
}

describe("Tasks tool contract", () => {
  test("the construct lays it out with change_tasks, and the adventure keeps the change", async () => {
    const { user, chat } = await signedInChat();
    const output = await Promise.resolve(
      changeTasksTool.execute?.(
        {
          operations: [
            { op: "add", text: BLOCK_OUT },
            { op: "add", text: SCULPT },
          ],
        },
        {
          toolCallId: "tasks",
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

  test("a construct's change naming a task that's gone saves nothing and gives the tasks back", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    const output = await Promise.resolve(
      changeTasksTool.execute?.(
        {
          operations: [
            { op: "complete", task: 1 },
            { op: "remove", task: 9 },
          ],
        },
        {
          toolCallId: "tasks",
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
      reason: "missing-task",
    });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);
  });

  test("the quest's conversation gets the tasks, with task numbers, in its prompt", async () => {
    const user = await testUser();
    await signIn(user);
    const data = testData(user);
    const chat = await data.chat(await data.quest());
    await laidOut(chat.quest.id);
    await changeTasksAction({
      questId: chat.quest.id,
      operations: [{ op: "complete", task: 1 }],
    });

    const prompt = await constructPrompt(chat.id);
    expect(prompt).toContain("<quest_tasks>");
    expect(prompt).toContain(`#1 [done] ${BLOCK_OUT}`);
    expect(prompt).toContain(`#2 ${SCULPT}`);
  });
});

describe("a quest's tasks, changed without the construct", () => {
  test("changes from the quest's page and their undo save new versions", async () => {
    const { user, chat } = await signedInChat();
    const added = await laidOut(chat.quest.id);
    const moved = await changeTasksAction({
      questId: chat.quest.id,
      operations: [{ op: "move", task: 3, before: 1 }],
    });
    expect(moved).toMatchObject({ kind: "changed", version: 2 });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      RENDER,
      BLOCK_OUT,
      SCULPT,
    ]);

    // Undoing the first change keeps the move made after it.
    expect(added.kind).toBe("changed");
    const undone = await undoTasksChangeAction({
      questId: chat.quest.id,
      version: 1,
    });
    expect(undone).toMatchObject({ kind: "changed", version: 3 });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([]);
    const again = await undoTasksChangeAction({
      questId: chat.quest.id,
      version: 1,
    });
    expect(again).toMatchObject({ kind: "failed", reason: "already-undone" });
    expect((await readTasksState(user.id, chat.quest.id))?.undone).toEqual([1]);
    // Changes made outside an adventure leave its messages alone.
    expect(await listMessages(user.id, chat.id)).toEqual([]);
  });

  test("sidebar edits and Undo update the tasks without saving conversation messages", async () => {
    const { user, chat } = await signedInChat();
    await sendChatMessage(chat.id, "Help me with this quest");
    const before = await listMessages(user.id, chat.id);
    const added = await changeTasksAction({
      questId: chat.quest.id,
      chatId: chat.id,
      operations: [{ op: "add", text: BLOCK_OUT }],
    });
    expect(added.kind).toBe("changed");
    expect(added).not.toHaveProperty("message");
    expect(await openTexts(user.id, chat.quest.id)).toEqual([BLOCK_OUT]);
    expect(await listMessages(user.id, chat.id)).toEqual(before);
    const edited = await changeTasksAction({
      questId: chat.quest.id,
      chatId: chat.id,
      operations: [{ op: "change", task: 1, text: SCULPT }],
    });
    expect(edited).toMatchObject({ kind: "changed", version: 2 });
    expect(await openTexts(user.id, chat.quest.id)).toEqual([SCULPT]);
    expect(await listMessages(user.id, chat.id)).toEqual(before);
    const undone = await undoTasksChangeAction({
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

  test("commands change the tasks, show it and undo, saving each to the adventure with no reply", async () => {
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
    expect(await command(chat.id, "/tasks")).toMatchObject({ kind: "shown" });
    expect(await command(chat.id, "/undo")).toMatchObject({ kind: "changed" });

    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      SCULPT,
      RENDER,
      "Paint the enamel eyes",
    ]);
    const messages = await listMessages(user.id, chat.id);
    expect(messages.every(isTasksMessage)).toBe(true);
    expect(messages).toHaveLength(COMMANDS_RUN);
    expect(messages.at(-1)?.metadata?.author?.id).toBe(user.id);
    expect(await readStoppedReply(user.id, chat.id)).toBeUndefined();
  });

  test("the construct reads a person's tasks change in the adventure as a note", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    await command(chat.id, "/done 1");
    const context = await convertToModelMessages(
      await listMessagesForModel(user.id, chat.id),
      { convertDataPart: tasksPartForModel },
    );
    expect(JSON.stringify(context)).toContain(
      `${TASKS_NOTE_MARK} The user changed the tasks, without you: checked off`,
    );
  });

  test("a command with a problem changes nothing and says why", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);

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
    expect(await listMessages(user.id, chat.id)).toEqual([]);
  });

  test("only the quest's owner can change its tasks, whatever membership another user kept", async () => {
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
      await changeTasksAction({
        questId: quest.id,
        operations: [{ op: "remove", task: 2 }],
      }),
    ).toEqual({ kind: "not-found" });
    expect(await command(chat.id, "/done")).toEqual({ kind: "not-found" });
    expect(await readTasksState(member.id, quest.id)).toBeUndefined();

    await signIn(stranger);
    expect(await command(chat.id, "/done")).toEqual({ kind: "not-found" });
    expect(await readTasksState(stranger.id, quest.id)).toBeUndefined();
    expect(await openTexts(owner.id, quest.id)).toEqual([SCULPT, RENDER]);
  });

  test("Continue's next task comes only from the tasks", async () => {
    const { user, chat } = await signedInChat();
    await sendChatMessage(chat.id, "Hello");
    expect((await readCurrentQuest(user.id))?.nextTask).toBeUndefined();
    await laidOut(chat.quest.id);
    expect((await readCurrentQuest(user.id))?.nextTask).toBe(BLOCK_OUT);
    await changeTasksAction({
      questId: chat.quest.id,
      operations: [
        { op: "remove", task: 1 },
        { op: "remove", task: 2 },
        { op: "remove", task: 3 },
      ],
    });
    expect((await readCurrentQuest(user.id))?.nextTask).toBeUndefined();
  });

  test("controls and commands can add beyond the former task limit", async () => {
    const ManyTasks = 40;
    const { user, chat } = await signedInChat();
    await changeTasksAction({
      questId: chat.quest.id,
      operations: Array.from({ length: ManyTasks }, (_, index) => ({
        op: "add" as const,
        text: `Study ${index + 1}`,
      })),
    });
    expect(
      await changeTasksAction({
        questId: chat.quest.id,
        operations: [{ op: "add", text: "One more study" }],
      }),
    ).toMatchObject({ kind: "changed" });
    expect(await command(chat.id, "/add Another study")).toMatchObject({
      kind: "changed",
    });
    expect(await openTexts(user.id, chat.quest.id)).toHaveLength(ManyTasks + 2);
  });

  test("undoing an older change keeps a newer edit of the same task", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    const first = await changeTasksAction({
      questId: chat.quest.id,
      operations: [{ op: "change", task: 2, text: "Sculpt the brass plates" }],
    });
    await changeTasksAction({
      questId: chat.quest.id,
      operations: [{ op: "change", task: 2, text: "Sculpt the copper plates" }],
    });
    if (first.kind !== "changed") {
      throw new Error("The first edit wasn't saved");
    }

    expect(
      await undoTasksChangeAction({
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

describe("use_case_tasks_commands", () => {
  test("after a failed reply, tasks changes in the adventure wait, so the message can still be sent again", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.quest.id);
    const unanswered = question("An interrupted message");
    await saveMessage(user.id, chat.id, unanswered);
    await releaseReply(user.id, chat.id, unanswered.id);

    expect(await command(chat.id, "/add Sketch wings")).toMatchObject({
      kind: "failed",
      reason: "awaiting-reply",
    });
    expect(await command(chat.id, "/tasks")).toMatchObject({
      kind: "failed",
      reason: "awaiting-reply",
    });
    expect(
      await changeTasksAction({
        questId: chat.quest.id,
        chatId: chat.id,
        operations: [{ op: "complete", task: 1 }],
      }),
    ).toMatchObject({ kind: "failed", reason: "awaiting-reply" });

    // Nothing came after the failed message, so it is still the one to send
    // again, and the tasks is as it was.
    expect((await listMessages(user.id, chat.id)).at(-1)?.id).toBe(
      unanswered.id,
    );
    expect(await readStoppedReply(user.id, chat.id)).toBe(unanswered.id);
    expect(await openTexts(user.id, chat.quest.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);

    // The quest's page still changes the tasks; once a reply answers, the
    // adventure does too.
    expect(
      await changeTasksAction({
        questId: chat.quest.id,
        operations: [{ op: "complete", task: 1 }],
      }),
    ).toMatchObject({ kind: "changed" });
    await sendChatMessage(chat.id, "Still there?");
    expect(await command(chat.id, "/add Sketch wings")).toMatchObject({
      kind: "changed",
    });
  });

  test("while a reply is being made, here or elsewhere, a person's tasks change in the adventure waits", async () => {
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
      await undoTasksChangeAction({
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
    // The added task is removed from the quest's page.
    await changeTasksAction({
      questId: chat.quest.id,
      operations: [{ op: "remove", task: 4 }],
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
