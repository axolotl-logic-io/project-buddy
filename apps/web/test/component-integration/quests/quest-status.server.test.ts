import { describe, expect, test, vi } from "vitest";
import {
  answerQuestStatusAction,
  changeQuestStatusAction,
  readQuestStatusApprovalAction,
} from "@/app/(workspace)/quests/status-actions.ts";
import { listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { runChatCommandAction } from "@/plan/plan-actions.ts";
import { activeQuests } from "@/quests/active-quests.ts";
import {
  STATUS_APPROVAL_ID,
  type StatusApproval,
  type StatusChange,
} from "@/quests/quest-status.ts";
import {
  answerStatusApproval,
  changeQuestStatus,
  readLatestStatusApproval,
  readStatusApproval,
  requestQuestStatus,
} from "@/quests/quest-status-store.ts";
import { getQuest, listQuests } from "@/quests/store.ts";
import { buildReplyInstructions } from "@/replies/system-prompt.ts";
import { questStatusTool } from "@/replies/tools/quest-status.ts";
import { QUEST_STATUS_OUTPUT } from "@/replies/tools/quest-status-contract.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  formerMemberQuest,
  NOTHING,
  seenBy,
} from "../accounts/former-member-quest-test-kit.ts";
import { newMessageId } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

function form(values: Readonly<Record<string, string | number>>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, String(value));
  }
  return data;
}
function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error("Expected a result");
  }
  return value;
}

async function questFixture(): Promise<{
  user: Awaited<ReturnType<typeof testUser>>;
  quest: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  chat: Awaited<ReturnType<ReturnType<typeof testData>["chat"]>>;
}> {
  const user = await testUser();
  const data = testData(user);
  const quest = await data.quest();
  const chat = await data.chat(quest);
  return { user, quest, chat };
}

describe("quest status commands", () => {
  test.each([
    ["/complete", "completed"],
    ["/abandon", "abandoned"],
  ] as const)(
    "%s changes only the owner's quest and can be restored",
    async (text, status) => {
      const { user, quest, chat } = await questFixture();
      await signIn(user);
      expect(
        await runChatCommandAction({ chatId: chat.id, text }),
      ).toMatchObject({ kind: "quest-status" });
      expect(await getQuest(user.id, quest.id)).toMatchObject({ status });
      expect(
        await runChatCommandAction({ chatId: chat.id, text: "/restore" }),
      ).toMatchObject({ kind: "quest-status" });
      expect(await getQuest(user.id, quest.id)).toMatchObject({
        status: "active",
      });
      expect(await listMessages(user.id, chat.id)).toEqual([]);
      const stranger = await testUser();
      await signIn(stranger);
      expect(await runChatCommandAction({ chatId: chat.id, text })).toEqual({
        kind: "not-found",
      });
      expect(await getQuest(user.id, quest.id)).toMatchObject({
        status: "active",
      });
    },
  );
  test("status commands reject arguments and standalone conversations", async () => {
    const { user, quest, chat } = await questFixture();
    await signIn(user);
    expect(
      await runChatCommandAction({ chatId: chat.id, text: "/complete 1" }),
    ).toMatchObject({ kind: "problem" });
    expect(await getQuest(user.id, quest.id)).toMatchObject({
      status: "active",
    });
    const standalone = await privateChat(user.id);
    expect(
      await runChatCommandAction({ chatId: standalone.id, text: "/abandon" }),
    ).toMatchObject({ kind: "problem" });
  });
});

describe("use_case_change_quest_status", () => {
  test.each(["completed", "abandoned"] as const)(
    "the owner can mark %s and undo without losing quest contents",
    async (target) => {
      const team = await formerMemberQuest();
      const before = await seenBy(team.owner, team);
      expect(await activeQuests(team.owner.id)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: team.quest.id }),
        ]),
      );
      expect(await activeQuests(team.member.id)).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: team.quest.id }),
        ]),
      );
      await signIn(team.owner);
      const result = await changeQuestStatusAction(
        { kind: "idle" },
        form({
          questId: team.quest.id,
          fromStatus: "active",
          toStatus: target,
          revision: 0,
        }),
      );
      expect(result.kind).toBe("saved");
      expect(await seenBy(team.owner, team)).toEqual(before);
      expect(await getQuest(team.owner.id, team.quest.id)).toMatchObject({
        status: target,
      });
      expect(await activeQuests(team.owner.id)).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: team.quest.id }),
        ]),
      );
      const change = required(result.change);
      expect(
        await changeQuestStatus(team.owner.id, {
          ...change,
          fromStatus: target,
          toStatus: "active",
        }),
      ).toMatchObject({ revision: 2 });
      expect(await seenBy(team.owner, team)).toEqual(before);
      expect(await seenBy(team.member, team)).toEqual(NOTHING);
      expect(await activeQuests(team.owner.id)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: team.quest.id }),
        ]),
      );
    },
  );
  test.each(["former member", "outsider"] as const)(
    "a %s cannot change or restore a quest",
    async (role) => {
      const team = await formerMemberQuest();
      const outsider = await testUser();
      const change: StatusChange = {
        questId: team.quest.id,
        fromStatus: "active",
        toStatus: "completed",
        revision: 0,
      };
      let user = team.member;
      if (role === "outsider") {
        user = outsider;
      }
      await signIn(user);
      expect(
        await changeQuestStatusAction({ kind: "idle" }, form({ ...change })),
      ).toMatchObject({ kind: "invalid" });
      expect(
        await requestQuestStatus(
          user.id,
          team.chat.id,
          team.quest.id,
          "completed",
        ),
      ).toBeUndefined();
      expect(await getQuest(team.owner.id, team.quest.id)).toMatchObject({
        status: "active",
        statusRevision: 0,
      });
    },
  );
  test("stale changes and undo cannot overwrite a later change", async () => {
    const { user, quest } = await questFixture();
    const change = required(
      await changeQuestStatus(user.id, {
        questId: quest.id,
        fromStatus: "active",
        toStatus: "completed",
        revision: 0,
      }),
    );
    await changeQuestStatus(user.id, {
      ...change,
      fromStatus: "completed",
      toStatus: "abandoned",
    });
    expect(
      await changeQuestStatus(user.id, {
        ...change,
        fromStatus: "completed",
        toStatus: "active",
      }),
    ).toBeUndefined();
    expect(await getQuest(user.id, quest.id)).toMatchObject({
      status: "abandoned",
    });
  });
});

describe("use_case_construct_changes_quest_status", () => {
  test("the registered tool creates a card without changing status; explicit approval executes once", async () => {
    const { user, quest, chat } = await questFixture();
    await signIn(user);
    const output = await Promise.resolve(
      questStatusTool.execute?.(
        { status: "completed" },
        {
          toolCallId: "status",
          messages: [],
          context: {
            construct: chat.construct,
            answeredId: newMessageId(),
            actingUser: user.id,
            chatId: chat.id,
            questId: quest.id,
          },
        },
      ),
    );
    const { approval } = QUEST_STATUS_OUTPUT.parse(output);
    expect(await getQuest(user.id, quest.id)).toMatchObject({
      status: "active",
    });
    expect(await readQuestStatusApprovalAction(approval.id)).toMatchObject({
      decision: "pending",
    });
    const result = await answerQuestStatusAction(
      { kind: "idle" },
      form({ id: approval.id, decision: "approve", toStatus: "abandoned" }),
    );
    expect(result.change).toMatchObject({ toStatus: "completed", revision: 1 });
    expect(
      await answerStatusApproval(user.id, approval.id, true),
    ).toBeUndefined();
    expect(await getQuest(user.id, quest.id)).toMatchObject({
      status: "completed",
      statusRevision: 1,
    });
    expect(await readStatusApproval(user.id, approval.id)).toMatchObject({
      decision: "approved",
    });
  });
  test("declining persists, and a declined card cannot execute", async () => {
    const { user, quest, chat } = await questFixture();
    const approval = required(
      await requestQuestStatus(user.id, chat.id, quest.id, "abandoned"),
    );
    await answerStatusApproval(user.id, approval.id, false);
    expect(
      await answerStatusApproval(user.id, approval.id, true),
    ).toBeUndefined();
    expect(await readStatusApproval(user.id, approval.id)).toMatchObject({
      decision: "declined",
    });
    expect(await getQuest(user.id, quest.id)).toMatchObject({
      status: "active",
    });
  });
  test("a stale card stays invalid even after the quest returns to the same status", async () => {
    const { user, quest, chat } = await questFixture();
    const approval = required(
      await requestQuestStatus(user.id, chat.id, quest.id, "abandoned"),
    );
    const changed = required(
      await changeQuestStatus(user.id, {
        questId: quest.id,
        fromStatus: "active",
        toStatus: "completed",
        revision: 0,
      }),
    );
    await changeQuestStatus(user.id, {
      ...changed,
      fromStatus: "completed",
      toStatus: "active",
    });
    expect(
      await answerStatusApproval(user.id, approval.id, true),
    ).toBeUndefined();
    expect(await readStatusApproval(user.id, approval.id)).toMatchObject({
      decision: "outdated",
    });
  });
  test("only the requesting owner can read or answer a card; a mismatched adventure cannot propose", async () => {
    const team = await formerMemberQuest();
    const outsider = await testUser();
    const approval = required(
      await requestQuestStatus(
        team.owner.id,
        team.chat.id,
        team.quest.id,
        "abandoned",
      ),
    );
    await Promise.all(
      [team.member, outsider].map(async (user) => {
        expect(await readStatusApproval(user.id, approval.id)).toBeUndefined();
        expect(
          await answerStatusApproval(user.id, approval.id, true),
        ).toBeUndefined();
      }),
    );
    const otherQuest = await testData(team.owner).quest();
    expect(
      await requestQuestStatus(
        team.owner.id,
        team.chat.id,
        otherQuest.id,
        "completed",
      ),
    ).toBeUndefined();
    expect(
      await readStatusApproval(
        team.owner.id,
        STATUS_APPROVAL_ID.parse(crypto.randomUUID()),
      ),
    ).toBeUndefined();
  });
  test("two conflicting approvals apply at most one change", async () => {
    const { user, quest, chat } = await questFixture();
    const first: StatusApproval = required(
      await requestQuestStatus(user.id, chat.id, quest.id, "completed"),
    );
    const second = required(
      await requestQuestStatus(user.id, chat.id, quest.id, "abandoned"),
    );
    const results = await Promise.all([
      answerStatusApproval(user.id, first.id, true),
      answerStatusApproval(user.id, second.id, true),
    ]);
    expect(results.filter((result) => result !== undefined)).toHaveLength(1);
    expect(await getQuest(user.id, quest.id)).toMatchObject({
      statusRevision: 1,
    });
  });
});

describe("use_case_restore_quest", () => {
  test.each(["completed", "abandoned"] as const)(
    "a %s quest stays listed and can be restored later",
    async (status) => {
      const { user, quest, chat } = await questFixture();
      await changeQuestStatus(user.id, {
        questId: quest.id,
        fromStatus: "active",
        toStatus: status,
        revision: 0,
      });
      expect(await listQuests(user.id)).toContainEqual(
        expect.objectContaining({ id: quest.id, status }),
      );
      const approval = required(
        await requestQuestStatus(user.id, chat.id, quest.id, "active"),
      );
      expect(
        await answerStatusApproval(user.id, approval.id, true),
      ).toMatchObject({ toStatus: "active" });
      expect(await getQuest(user.id, quest.id)).toMatchObject({
        status: "active",
      });
    },
  );
});

test.each(["pending", "declined", "approved", "outdated"] as const)(
  "reply context supplies the live %s proposal only to its requesting owner",
  async (decision) => {
    const team = await formerMemberQuest();
    const stranger = await testUser();
    const proposal = required(
      await requestQuestStatus(
        team.owner.id,
        team.chat.id,
        team.quest.id,
        "abandoned",
      ),
    );
    if (decision === "approved" || decision === "declined") {
      await answerStatusApproval(
        team.owner.id,
        proposal.id,
        decision === "approved",
      );
    }
    if (decision === "outdated") {
      await changeQuestStatus(team.owner.id, {
        questId: team.quest.id,
        fromStatus: "active",
        toStatus: "completed",
        revision: 0,
      });
    }
    const before = await getQuest(team.owner.id, team.quest.id);
    const [latest, member, foreign] = await Promise.all([
      readLatestStatusApproval(team.owner.id, team.chat.id),
      readLatestStatusApproval(team.member.id, team.chat.id),
      readLatestStatusApproval(stranger.id, team.chat.id),
    ]);
    expect(latest).toMatchObject({ id: proposal.id, decision });
    expect(member).toBeUndefined();
    expect(foreign).toBeUndefined();
    const prompt = (
      await buildReplyInstructions({
        actingUser: team.owner.id,
        chat: team.chat,
        construct: getConstruct("vellum"),
      })
    )
      .map(({ content }) => content)
      .join("\n");
    expect(prompt).toContain(`decision: ${decision}`);
    expect(prompt).toContain(
      "This live decision supersedes the original tool result",
    );
    expect(prompt).toContain("create a fresh proposal");
    expect(await getQuest(team.owner.id, team.quest.id)).toEqual(before);
  },
);
