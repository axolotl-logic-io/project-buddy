// Multi-user quests against the test database: inviting by email, which
// creates an invited account at once; joining by an invitation's link or
// from Pending, one quest at a time; what accepted members may do; and
// removing or leaving.

import { describe, expect, test, vi } from "vitest";
import { endEverySession, findUserByEmail } from "@/accounts/users-store.ts";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import { currentUser } from "@/auth/current-user.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, readStoppedReply, saveMessage } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import {
  answerInvitationAction,
  inviteToQuestAction,
  removeFromQuestAction,
} from "@/quests/membership-actions.ts";
import {
  listPendingQuests,
  listQuestPeople,
  readInvitationLink,
} from "@/quests/membership-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import {
  answerStatusApproval,
  changeQuestStatus,
  readStatusApproval,
  requestQuestStatus,
} from "@/quests/quest-status-store.ts";
import { getQuest, listQuests, renameQuest } from "@/quests/store.ts";
import {
  beginReplyRun,
  cancellationRequested,
  stopReply,
} from "@/replies/reply-runs.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import {
  testAddress,
  testUser,
} from "../../support/test-database/user-test-kit.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { newMessageId, question } from "../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import {
  emailedLoginToken,
  type SendEmail,
} from "../test-database/sign-in-link-test-kit.ts";
import {
  accountOf,
  addInvitee,
  addMember,
  emailedInvitationToken,
  invite,
} from "./quest-members-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/headers", async () => {
  const { sessionCookies } = await import(
    "../test-database/session-test-kit.ts"
  );
  return {
    cookies: sessionCookies,
    headers: (): Promise<Headers> =>
      Promise.resolve(new Headers({ origin: "http://localhost:3494" })),
  };
});

function byText(one: string, other: string): number {
  return one.localeCompare(other);
}

// The invite form's fields for the address and quest.
function inviteForm(questId: string, email: string): FormData {
  const form = new FormData();
  form.set("questId", questId);
  form.set("email", email);
  return form;
}

// The acceptance link's continue form, with a name when given.
function continueForm(token: string, name?: string): FormData {
  const form = new FormData();
  form.set("token", token);
  if (name !== undefined) {
    form.set("name", name);
  }
  return form;
}

// A user who owns two quests, each with its conversation.
async function ownerWithTwoQuests(): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly first: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  readonly second: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  readonly chat: Chat;
}> {
  const owner = await testUser();
  const data = testData(owner);
  const [first, second] = await Promise.all([data.quest(), data.quest()]);
  const [chat] = await Promise.all([data.chat(first), data.chat(second)]);
  return { owner, first, second, chat };
}

describe("use_case_invite_to_quest", () => {
  test("inviting a new address creates an invited account before any link is followed", async () => {
    const { owner, first, second } = await ownerWithTwoQuests();
    const email = testAddress();
    await signIn(owner);

    expect(
      await inviteToQuestAction({ kind: "idle" }, inviteForm(first.id, email)),
    ).toMatchObject({ kind: "done" });
    const invited = await accountOf(email);
    expect(invited.accountState).toBe("invited");
    expect(emailedInvitationToken(sent.sendEmail, email)).not.toBe("");

    expect(
      await inviteToQuestAction(
        { kind: "idle" },
        inviteForm(second.id, email.toUpperCase()),
      ),
    ).toMatchObject({ kind: "done" });
    expect((await accountOf(email)).id).toBe(invited.id);
    expect(
      (await listPendingQuests(invited.id))
        .map(({ name }) => name)
        .toSorted(byText),
    ).toEqual([first.name, second.name].toSorted(byText));
  });

  test("inviting an existing user keeps their account, name and sign-up", async () => {
    const [{ owner, first }, existing] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);

    expect(await invite(owner, first.id, existing.email)).toEqual({
      kind: "invited",
    });
    expect(await findUserByEmail(existing.email)).toEqual(existing);
    expect(await listPendingQuests(existing.id)).toMatchObject([
      { questId: first.id, name: first.name },
    ]);
  });

  test("inviting the owner, a member, or into a Dailies quest changes nothing", async () => {
    const [{ owner, first }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    const dailies = await startDailies(owner.id, {
      name: QUEST_NAME.parse("My day"),
      context: "Make room for creativity",
      construct: getConstruct("vellum"),
    });
    if (dailies.kind === "claudeUnavailable") {
      throw new Error("Dailies did not start");
    }

    expect(await invite(owner, first.id, owner.email)).toEqual({
      kind: "in-quest",
    });
    expect(await invite(member, first.id, member.email)).toEqual({
      kind: "in-quest",
    });
    expect(await invite(owner, dailies.chat.quest.id, testAddress())).toEqual({
      kind: "not-found",
    });
  });

  test("a failed email keeps the invitation pending, logs the failure and resends on the next invite", async () => {
    const [{ owner, first }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    const errorLog = spyOnErrorLog();
    sent.sendEmail.mockRejectedValueOnce(new Error("Mail is down"));

    expect(await invite(owner, first.id, user.email)).toEqual({
      kind: "unsent",
    });
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining("send quest invitation"),
      expect.any(String),
    );
    expect(await listPendingQuests(user.id)).toMatchObject([
      { questId: first.id },
    ]);
    expect(await invite(owner, first.id, user.email)).toEqual({
      kind: "invited",
    });
  });

  test("a stranger and a pending invitee can't invite anyone", async () => {
    const [{ owner, first }, stranger, invitee] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
      testUser(),
    ]);
    await addInvitee(owner, first.id, invitee);

    expect(
      await Promise.all(
        [stranger, invitee].map((user) =>
          invite(user, first.id, testAddress()),
        ),
      ),
    ).toEqual([{ kind: "not-found" }, { kind: "not-found" }]);
  });
});

describe("use_case_join_quest_by_link", () => {
  test("an invited account names itself, completes sign-up and joins only that quest", async () => {
    const { owner, first, second } = await ownerWithTwoQuests();
    const email = testAddress();
    await invite(owner, first.id, email);
    await invite(owner, second.id, email);
    const token = emailedInvitationToken(sent.sendEmail, email);
    const invited = await accountOf(email);

    expect(await readInvitationLink(token, new Date())).toMatchObject({
      questId: second.id,
      needsName: true,
    });
    expect(await continueSignInAction(continueForm(token))).toMatchObject({
      kind: "invalid",
    });
    expect((await accountOf(email)).accountState).toBe("invited");
    expect(await currentUser()).toBeUndefined();

    await expectRedirect(
      () => continueSignInAction(continueForm(token, " Morgan ")),
      `/quests/${second.id}`,
    );
    expect(await currentUser()).toMatchObject({
      id: invited.id,
      name: "Morgan",
      accountState: "signed_up",
    });
    expect(await getQuest(invited.id, second.id)).toBeDefined();
    expect(await getQuest(invited.id, first.id)).toBeUndefined();
    expect(await listPendingQuests(invited.id)).toMatchObject([
      { questId: first.id },
    ]);
  });

  test("an existing user joins without a name and keeps theirs", async () => {
    const [{ owner, first, second }, existing] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await invite(owner, first.id, existing.email);
    const token = emailedInvitationToken(sent.sendEmail, existing.email);
    await invite(owner, second.id, existing.email);

    await expectRedirect(
      () => continueSignInAction(continueForm(token)),
      `/quests/${first.id}`,
    );
    expect(await currentUser()).toEqual(existing);
    expect(await listPendingQuests(existing.id)).toMatchObject([
      { questId: second.id },
    ]);
  });

  test("a link signed in as someone else signs in as the invitee", async () => {
    const [{ owner, first }, other] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    const email = testAddress();
    await invite(owner, first.id, email);
    await signIn(other);

    await expectRedirect(
      () =>
        continueSignInAction(
          continueForm(emailedInvitationToken(sent.sendEmail, email), "Ash"),
        ),
      `/quests/${first.id}`,
    );
    expect((await currentUser())?.email).toBe(email);
    expect(await getQuest(other.id, first.id)).toBeUndefined();
  });

  test("a used, replaced or withdrawn link no longer works", async () => {
    const [{ owner, first, second }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await invite(owner, first.id, user.email);
    const used = emailedInvitationToken(sent.sendEmail, user.email);
    await expectRedirect(
      () => continueSignInAction(continueForm(used)),
      `/quests/${first.id}`,
    );
    await invite(owner, second.id, user.email);
    const replaced = emailedInvitationToken(sent.sendEmail, user.email);
    await invite(owner, second.id, user.email);
    const fresh = emailedInvitationToken(sent.sendEmail, user.email);
    await signIn(owner);
    await removeFromQuestAction({ questId: second.id, person: user.id });

    const tokens = [used, replaced, fresh];
    expect(
      await Promise.all(
        tokens.map((token) => readInvitationLink(token, new Date())),
      ),
    ).toEqual([undefined, undefined, undefined]);
    await Promise.all(
      tokens.map((token) =>
        expectRedirect(
          () => continueSignInAction(continueForm(token)),
          "/login/link",
          { token },
        ),
      ),
    );
    expect(await getQuest(user.id, second.id)).toBeUndefined();
  });

  test("an invited account completes sign-up from an ordinary sign-in link too", async () => {
    const { owner, first } = await ownerWithTwoQuests();
    const email = testAddress();
    await invite(owner, first.id, email);
    const invited = await accountOf(email);
    const token = await emailedLoginToken(invited, sent.sendEmail);

    expect(await continueSignInAction(continueForm(token))).toMatchObject({
      kind: "invalid",
    });
    await expectRedirect(
      () => continueSignInAction(continueForm(token, "Rae")),
      "/quests",
    );
    expect(await currentUser()).toMatchObject({
      name: "Rae",
      accountState: "signed_up",
    });
    expect(await listPendingQuests(invited.id)).toMatchObject([
      { questId: first.id },
    ]);
  });
});

describe("use_case_accept_pending_quest", () => {
  test("accepting one pending quest leaves the others pending", async () => {
    const [{ owner, first, second }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addInvitee(owner, first.id, user);
    await addInvitee(owner, second.id, user);
    await signIn(user);

    expect(
      await answerInvitationAction({ questId: first.id, accept: true }),
    ).toEqual({ kind: "done" });
    expect((await listQuests(user.id)).map(({ id }) => id)).toEqual([first.id]);
    expect(await listPendingQuests(user.id)).toMatchObject([
      { questId: second.id },
    ]);
    expect(
      await answerInvitationAction({ questId: first.id, accept: true }),
    ).toEqual({ kind: "failed" });
  });

  test("declining removes the invitation without opening the quest", async () => {
    const [{ owner, first }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addInvitee(owner, first.id, user);
    await signIn(user);

    expect(
      await answerInvitationAction({ questId: first.id, accept: false }),
    ).toEqual({ kind: "done" });
    expect(await listPendingQuests(user.id)).toEqual([]);
    expect(await getQuest(user.id, first.id)).toBeUndefined();
  });

  test("Pending shows only the quest's name and inviter, and opens nothing", async () => {
    const [{ owner, first }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addInvitee(owner, first.id, user);

    expect(await listPendingQuests(user.id)).toEqual([
      {
        questId: first.id,
        name: first.name,
        invitedBy: owner.email,
        invitedAt: expect.any(Date),
      },
    ]);
    expect(await listQuestPeople(user.id, first.id)).toBeUndefined();
    expect(await listQuests(user.id)).toEqual([]);
  });
});

describe("use_case_quest_member_powers", () => {
  test("a member renames, changes status, invites and removes another member", async () => {
    const [{ owner, first }, member, other] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    await addMember(owner, first.id, other);
    const renamed = QUEST_NAME.parse("Shared voyage");

    expect(await renameQuest(member.id, first.id, renamed)).toBe(true);
    expect(
      await changeQuestStatus(member.id, {
        questId: first.id,
        fromStatus: "active",
        toStatus: "completed",
        revision: first.statusRevision,
      }),
    ).toMatchObject({ toStatus: "completed" });
    expect(await invite(member, first.id, testAddress())).toEqual({
      kind: "invited",
    });
    await signIn(member);
    expect(
      await removeFromQuestAction({ questId: first.id, person: other.id }),
    ).toEqual({ kind: "done" });
    expect(await getQuest(owner.id, first.id)).toMatchObject({
      name: renamed,
      status: "completed",
    });
    expect(await getQuest(other.id, first.id)).toBeUndefined();
  });

  test("anyone in the quest answers a status approval card another asked for", async () => {
    const [{ owner, first, chat }, member, stranger] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    const approval = await requestQuestStatus(
      member.id,
      chat.id,
      first.id,
      "completed",
    );
    if (approval === undefined) {
      throw new Error("The member's request made no card");
    }

    expect(await readStatusApproval(stranger.id, approval.id)).toBeUndefined();
    expect(
      await answerStatusApproval(stranger.id, approval.id, true),
    ).toBeUndefined();
    expect(
      await answerStatusApproval(owner.id, approval.id, true),
    ).toMatchObject({ toStatus: "completed" });
    expect(await readStatusApproval(member.id, approval.id)).toMatchObject({
      decision: "approved",
    });
  });

  test("no one can remove the owner", async () => {
    const [{ owner, first }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    await signIn(member);

    expect(
      await removeFromQuestAction({ questId: first.id, person: owner.id }),
    ).toEqual({ kind: "failed" });
    expect(await getQuest(owner.id, first.id)).toBeDefined();
    expect((await listQuestPeople(member.id, first.id))?.owner.id).toBe(
      owner.id,
    );
  });
});

describe("use_case_remove_quest_member", () => {
  test("a member who leaves loses access and lands on Quests", async () => {
    const [{ owner, first }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    await signIn(member);

    await expectRedirect(
      () => removeFromQuestAction({ questId: first.id, person: member.id }),
      "/quests",
    );
    expect(await getQuest(member.id, first.id)).toBeUndefined();
    expect((await listQuestPeople(owner.id, first.id))?.members).toEqual([]);
  });

  test("a removed member's quest page can't be found", async () => {
    const [{ owner, first }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    await signIn(owner);
    await removeFromQuestAction({ questId: first.id, person: member.id });
    await signIn(member);

    expect(await getQuest(member.id, first.id)).toBeUndefined();
    await expectNotFound(() =>
      QuestPage({
        params: Promise.resolve({ questId: first.id }),
        searchParams: Promise.resolve({}),
      }),
    );
  });

  test("the owner sees members and pending invitations, and a member sees them alike", async () => {
    const [{ owner, first, chat }, member, invitee] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    await addInvitee(owner, first.id, invitee);

    const people = await listQuestPeople(owner.id, first.id);
    expect(people).toMatchObject({
      owner: { id: owner.id },
      members: [{ id: member.id }],
      invited: [{ id: invitee.id }],
    });
    expect(await listQuestPeople(member.id, first.id)).toEqual(people);
    expect((await getChat(member.id, chat.id))?.id).toBe(chat.id);
  });
});

describe("removal and sign-out leave no stuck state", () => {
  test("removing a member stops the reply their message awaits, so anyone left can ask again", async () => {
    const [{ owner, first, chat }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    const messageId = newMessageId();
    expect(
      await saveMessage(member.id, chat.id, {
        ...question("Hi"),
        id: messageId,
      }),
    ).toBe("inserted");
    const runId = await beginReplyRun(member.id, chat.id, messageId);
    expect(await readStoppedReply(owner.id, chat.id)).toBeUndefined();
    await signIn(owner);

    await removeFromQuestAction({ questId: first.id, person: member.id });

    expect(await readStoppedReply(owner.id, chat.id)).toBe(messageId);
    expect(await cancellationRequested(member.id, runId)).toBe(true);
    expect(await stopReply(owner.id, chat.id, messageId)).toBe("cancelled");
  });

  test("signing out everywhere stops invitation links but leaves invitations pending", async () => {
    const [{ owner, first }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await invite(owner, first.id, user.email);
    const token = emailedInvitationToken(sent.sendEmail, user.email);

    await endEverySession(user.id);

    expect(await readInvitationLink(token, new Date())).toBeUndefined();
    expect(await listPendingQuests(user.id)).toMatchObject([
      { questId: first.id },
    ]);
  });
});
