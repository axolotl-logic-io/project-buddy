// A quest's plan in the test database with the mock construct: the
// construct's change_plan through POST /api/chat, the user's changes from the
// quest's page and from an adventure, the composer's commands, undo, the plan
// in the construct's prompt, who may change it, and the next step Today
// shows. How the plan looks is the browser tests'.
import { describe, expect, test, vi } from "vitest";
import { listMessages, readStoppedReply, saveMessage } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import type { ChatId, ProjectId, UserId } from "@/ids.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { saveMemory } from "@/memory/memory-store.ts";
import { MOST_OPEN_STEPS } from "@/plan/plan.ts";
import {
  changePlanAction,
  type PlanActionResult,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { isPlanMessage } from "@/plan/plan-message.ts";
import { readPlanState } from "@/plan/plan-store.ts";
import { readCurrentQuest } from "@/projects/current-quest-store.ts";
import { PLAN_NOTE_MARK } from "@/replies/plan-message-prompt.ts";
import {
  CHANGE_PLAN_OUTPUT,
  CHANGE_PLAN_TOOL,
} from "@/replies/tools/change-plan-contract.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  constructReply,
  messageText,
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

// A message whose reply fails at once with the mock model.
const FAILING = "/mock-error overloaded_error";

function changeCommand(input: unknown): string {
  return `/mock-tool ${CHANGE_PLAN_TOOL} ${JSON.stringify(input)}`;
}

// The texts of the open steps of the user's project's plan, in order.
async function openTexts(
  owner: UserId,
  projectId: ProjectId,
): Promise<string[]> {
  const state = await readPlanState(owner, projectId);
  return (state?.plan.steps ?? []).flatMap(({ text, done }) => {
    if (done) {
      return [];
    }
    return [text];
  });
}

// The plan's three steps, laid out from the quest's page.
function laidOut(projectId: ProjectId): Promise<PlanActionResult> {
  return changePlanAction({
    projectId,
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

describe("use_case_construct_changes_plan", () => {
  test("the construct lays it out with change_plan, and the adventure keeps the change", async () => {
    const { user, chat } = await signedInChat();
    const reply = await constructReply(
      chat.id,
      changeCommand({
        operations: [
          { op: "add", text: BLOCK_OUT },
          { op: "add", text: SCULPT },
        ],
      }),
    );

    const [part] = reply.parts.filter(
      ({ type }) => type === `tool-${CHANGE_PLAN_TOOL}`,
    );
    const output = CHANGE_PLAN_OUTPUT.parse(
      part !== undefined && "output" in part && part.output,
    );
    expect(output).toMatchObject({ status: "changed", version: 1 });
    expect(await openTexts(user.id, chat.project.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
    ]);
  });

  test("a construct's change naming a step that's gone saves nothing and gives the plan back", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.project.id);
    const reply = await constructReply(
      chat.id,
      changeCommand({
        operations: [
          { op: "complete", step: 1 },
          { op: "remove", step: 9 },
        ],
      }),
    );

    const [part] = reply.parts.filter(
      ({ type }) => type === `tool-${CHANGE_PLAN_TOOL}`,
    );
    expect(
      CHANGE_PLAN_OUTPUT.parse(
        part !== undefined && "output" in part && part.output,
      ),
    ).toMatchObject({ status: "not-changed", reason: "missing-step" });
    expect(await openTexts(user.id, chat.project.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);
  });

  test("the quest's conversation gets the plan, with step numbers, in its prompt; the private Chat doesn't", async () => {
    const user = await testUser();
    await signIn(user);
    const data = testData(user);
    const project = await data.project();
    const [chat, standalone] = await Promise.all([
      data.chat(project),
      privateChat(user.id),
    ]);
    await laidOut(chat.project.id);
    await changePlanAction({
      projectId: chat.project.id,
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
    const added = await laidOut(chat.project.id);
    const moved = await changePlanAction({
      projectId: chat.project.id,
      operations: [{ op: "move", step: 3, before: 1 }],
    });
    expect(moved).toMatchObject({ kind: "changed", version: 2 });
    expect(await openTexts(user.id, chat.project.id)).toEqual([
      RENDER,
      BLOCK_OUT,
      SCULPT,
    ]);

    // Undoing the first change keeps the move made after it.
    expect(added.kind).toBe("changed");
    const undone = await undoPlanChangeAction({
      projectId: chat.project.id,
      version: 1,
    });
    expect(undone).toMatchObject({ kind: "changed", version: 3 });
    expect(await openTexts(user.id, chat.project.id)).toEqual([]);
    const again = await undoPlanChangeAction({
      projectId: chat.project.id,
      version: 1,
    });
    expect(again).toMatchObject({ kind: "failed", reason: "already-undone" });
    expect((await readPlanState(user.id, chat.project.id))?.undone).toEqual([
      1,
    ]);
    // Changes made outside an adventure leave its messages alone.
    expect(await listMessages(user.id, chat.id)).toEqual([]);
  });

  test("commands change the plan, show it and undo, saving each to the adventure with no reply", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.project.id);

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

    expect(await openTexts(user.id, chat.project.id)).toEqual([
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
    const { chat } = await signedInChat();
    await laidOut(chat.project.id);
    await command(chat.id, "/done 1");

    const reply = await constructReply(chat.id, "/mock-recall plan change");
    expect(messageText(reply)).toContain(
      `${PLAN_NOTE_MARK} The user changed the plan, without you: checked off`,
    );
  });

  test("a command with a problem changes nothing and says why", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.project.id);
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

  test("the mock model's own commands still reach it", async () => {
    const { chat } = await signedInChat();
    const reply = await constructReply(chat.id, "/mock-markdown");
    expect(messageText(reply)).toContain("Beveling an edge");
  });

  test("only the quest's owner can change its plan, whatever membership another user kept", async () => {
    const [owner, member, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
    ]);
    const data = testData(owner);
    const project = await data.project();
    const chat = await data.chat(project);

    await signIn(owner);
    await laidOut(project.id);
    expect(await command(chat.id, "/done")).toMatchObject({
      kind: "changed",
    });
    expect(await openTexts(owner.id, project.id)).toEqual([SCULPT, RENDER]);

    await signIn(member);
    expect(
      await changePlanAction({
        projectId: project.id,
        operations: [{ op: "remove", step: 2 }],
      }),
    ).toEqual({ kind: "not-found" });
    expect(await command(chat.id, "/done")).toEqual({ kind: "not-found" });
    expect(await readPlanState(member.id, project.id)).toBeUndefined();

    await signIn(stranger);
    expect(await command(chat.id, "/done")).toEqual({ kind: "not-found" });
    expect(await readPlanState(stranger.id, project.id)).toBeUndefined();
    expect(await openTexts(owner.id, project.id)).toEqual([SCULPT, RENDER]);
  });

  test("Continue's next step is the plan's first open step, or the Journal's line before the plan has had a step", async () => {
    const { user, chat } = await signedInChat();
    await sendChatMessage(chat.id, "Hello");
    await saveMemory(user.id, {
      projectId: chat.project.id,
      text: "Next step: pick a bed layout",
      basedOn: MEMORY_VERSION_NUMBER.parse(0),
      author: "user",
    });
    const before = await readCurrentQuest(user.id);
    expect(before?.nextStep).toBe("pick a bed layout");

    await laidOut(chat.project.id);
    const after = await readCurrentQuest(user.id);
    expect(after?.nextStep).toBe(BLOCK_OUT);

    // An emptied plan has no next step, whatever the Journal still says.
    await changePlanAction({
      projectId: chat.project.id,
      operations: [
        { op: "remove", step: 1 },
        { op: "remove", step: 2 },
        { op: "remove", step: 3 },
      ],
    });
    const emptied = await readCurrentQuest(user.id);
    expect(emptied?.nextStep).toBeUndefined();
  });

  test(`a change may add a step and remove another at the ${MOST_OPEN_STEPS}-step limit`, async () => {
    const { user, chat } = await signedInChat();
    await changePlanAction({
      projectId: chat.project.id,
      operations: Array.from({ length: MOST_OPEN_STEPS }, (_, index) => ({
        op: "add" as const,
        text: `Study ${index + 1}`,
      })),
    });
    expect(
      await changePlanAction({
        projectId: chat.project.id,
        operations: [{ op: "add", text: "One study more" }],
      }),
    ).toMatchObject({ kind: "failed", reason: "too-many-steps" });
    expect(await command(chat.id, "/add Study 31")).toMatchObject({
      kind: "failed",
      reason: "too-many-steps",
    });
    expect(
      await changePlanAction({
        projectId: chat.project.id,
        operations: [
          { op: "add", text: "One study more" },
          { op: "remove", step: 1 },
        ],
      }),
    ).toMatchObject({ kind: "changed" });
    expect(await openTexts(user.id, chat.project.id)).toHaveLength(
      MOST_OPEN_STEPS,
    );
  });

  test("undoing an older change keeps a newer edit of the same step", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.project.id);
    const first = await changePlanAction({
      projectId: chat.project.id,
      operations: [{ op: "change", step: 2, text: "Sculpt the brass plates" }],
    });
    await changePlanAction({
      projectId: chat.project.id,
      operations: [{ op: "change", step: 2, text: "Sculpt the copper plates" }],
    });
    if (first.kind !== "changed") {
      throw new Error("The first edit wasn't saved");
    }

    expect(
      await undoPlanChangeAction({
        projectId: chat.project.id,
        version: first.version,
      }),
    ).toMatchObject({ kind: "failed", reason: "nothing-to-undo" });
    expect(await openTexts(user.id, chat.project.id)).toEqual([
      BLOCK_OUT,
      "Sculpt the copper plates",
      RENDER,
    ]);
  });
});

describe("use_case_plan_commands", () => {
  test("after a failed reply, plan changes in the adventure wait, so the message can still be sent again", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.project.id);
    await sendChatMessage(chat.id, FAILING);
    const failed = (await listMessages(user.id, chat.id)).at(-1);

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
        projectId: chat.project.id,
        chatId: chat.id,
        operations: [{ op: "complete", step: 1 }],
      }),
    ).toMatchObject({ kind: "failed", reason: "awaiting-reply" });

    // Nothing came after the failed message, so it is still the one to send
    // again, and the plan is as it was.
    expect((await listMessages(user.id, chat.id)).at(-1)?.id).toBe(failed?.id);
    expect(await readStoppedReply(user.id, chat.id)).toBe(failed?.id);
    expect(await openTexts(user.id, chat.project.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);

    // The quest's page still changes the plan; once a reply answers, the
    // adventure does too.
    expect(
      await changePlanAction({
        projectId: chat.project.id,
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
    await laidOut(chat.project.id);
    // Saving the message claims its reply, as the route does before it
    // replies.
    await saveMessage(user.id, chat.id, question("Hello", newMessageId()));

    expect(await command(chat.id, "/done")).toMatchObject({
      kind: "failed",
      reason: "awaiting-reply",
    });
    expect(
      await undoPlanChangeAction({
        projectId: chat.project.id,
        chatId: chat.id,
        version: 1,
      }),
    ).toMatchObject({ kind: "failed", reason: "awaiting-reply" });
    expect(await openTexts(user.id, chat.project.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);
  });

  test("/undo passes over a change with nothing left to undo", async () => {
    const { user, chat } = await signedInChat();
    await laidOut(chat.project.id);
    await command(chat.id, "/done 1");
    await command(chat.id, "/add Paint the enamel eyes");
    // The added step is removed from the quest's page.
    await changePlanAction({
      projectId: chat.project.id,
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
    expect(await openTexts(user.id, chat.project.id)).toEqual([
      BLOCK_OUT,
      SCULPT,
      RENDER,
    ]);
  });
});
