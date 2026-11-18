// Multi-user quests against the test database: inviting by email, which
// creates an invited account at once; joining by an invitation's link or
// from Pending, one quest at a time; what accepted members may do; and
// removing or leaving.

import { refresh } from "next/cache";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import {
  endEverySession,
  findUserByEmail,
  saveUserName,
} from "@/accounts/users-store.ts";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import SignInLinkPage from "@/app/login/link/page.tsx";
import { currentUser } from "@/auth/current-user.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, readStoppedReply, saveMessage } from "@/chats/store.ts";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import { INVITATIONS_PER_HOUR } from "@/quests/membership.ts";
import { answerInvitationAction } from "@/quests/membership-actions.ts";
import {
  answerInvitation,
  listPendingQuests,
  listQuestPeople,
  readInvitationLink,
  removeFromQuest,
} from "@/quests/membership-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import {
  answerStatusApproval,
  changeQuestStatus,
  readStatusApproval,
  requestQuestStatus,
} from "@/quests/quest-status-store.ts";
import {
  getQuest,
  listQuests,
  type Quest,
  renameQuest,
} from "@/quests/store.ts";
import {
  beginReplyRun,
  cancellationRequested,
  stopReply,
} from "@/replies/reply-runs.ts";
import { HOME_PATH } from "@/routes.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";
import {
  QUEST_INVITATION_EMAIL_COPY,
  QUEST_MEMBERS_COPY,
} from "@/ui/copy/quest-members.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import {
  testAddress,
  testUser,
} from "../../support/test-database/user-test-kit.ts";
import { commandNotes, runCommand } from "../commands/command-test-kit.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { newMessageId, question } from "../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn, signOut } from "../test-database/session-test-kit.ts";
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

// The acceptance link's continue form, with a name when given.
function continueForm(token: string, name?: string): FormData {
  const form = new FormData();
  form.set("token", token);
  if (name !== undefined) {
    form.set("name", name);
  }
  return form;
}

// The page an emailed link opens, as the browser's session sees it.
async function linkPageHtml(token: string): Promise<string> {
  return renderToStaticMarkup(
    await SignInLinkPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ token }),
    }),
  );
}

// The last email sent to the address.
function lastEmailTo(email: string): { subject: string; text: string } {
  const message = sent.sendEmail.mock.calls
    .map(([one]) => one)
    .findLast((one) => one.to === email);
  if (message === undefined) {
    throw new Error(`Nothing was emailed to ${email}`);
  }
  return message;
}

// How the quest with the id is shared, in a list of quests.
function sharingOf(quests: readonly Quest[], id: string): unknown {
  return quests.find((quest) => quest.id === id)?.sharing;
}

// A user who owns two quests, each with its conversation: chat is the
// first's, secondChat the second's.
async function ownerWithTwoQuests(): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly first: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  readonly second: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  readonly chat: Chat;
  readonly secondChat: Chat;
}> {
  const owner = await testUser();
  const data = testData(owner);
  const [first, second] = await Promise.all([data.quest(), data.quest()]);
  const [chat, secondChat] = await Promise.all([
    data.chat(first),
    data.chat(second),
  ]);
  return { owner, first, second, chat, secondChat };
}

describe("use_case_invite_to_quest", () => {
  test("/invite with a new address creates an invited account before any link is followed, and notes it in the conversation", async () => {
    const { owner, first, second, chat, secondChat } =
      await ownerWithTwoQuests();
    const email = testAddress();
    await signIn(owner);

    expect(
      await runCommand(chat.id, PANEL_COMMAND.invite(email)),
    ).toMatchObject({
      kind: "noted",
      note: PANEL_COMMANDS_COPY.notes.invited(email),
    });
    const invited = await accountOf(email);
    expect(invited.accountState).toBe("invited");
    expect(emailedInvitationToken(sent.sendEmail, email)).not.toBe("");
    expect(await commandNotes(owner.id, chat.id)).toEqual([
      {
        command: PANEL_COMMAND.invite(email),
        note: PANEL_COMMANDS_COPY.notes.invited(email),
      },
    ]);

    expect(
      await runCommand(
        secondChat.id,
        PANEL_COMMAND.invite(email.toUpperCase()),
      ),
    ).toMatchObject({ kind: "noted" });
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

  test("/invite refuses an address that isn't one, the owner or a member, and Dailies, saying why", async () => {
    const [{ owner, first, chat }, member] = await Promise.all([
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
    await signIn(owner);
    const people = await listQuestPeople(owner.id, first.id);

    expect(await runCommand(chat.id, "/invite not-an-address")).toEqual({
      kind: "problem",
      text: PANEL_COMMANDS_COPY.problems.noEmail,
    });
    expect(await runCommand(chat.id, "/invite")).toEqual({
      kind: "problem",
      text: PANEL_COMMANDS_COPY.problems.noEmail,
    });
    expect(
      await runCommand(chat.id, PANEL_COMMAND.invite(member.email)),
    ).toEqual({
      kind: "problem",
      text: QUEST_MEMBERS_COPY.inQuest(member.email),
    });
    expect(
      await runCommand(dailies.chat.id, PANEL_COMMAND.invite(testAddress())),
    ).toEqual({ kind: "problem", text: PANEL_COMMANDS_COPY.problems.dailies });

    expect(await listQuestPeople(owner.id, first.id)).toEqual(people);
    expect(await commandNotes(owner.id, chat.id)).toEqual([]);
  });

  test("an /invite whose email fails is noted as unsent", async () => {
    const { owner, chat } = await ownerWithTwoQuests();
    const email = testAddress();
    spyOnErrorLog();
    sent.sendEmail.mockRejectedValueOnce(new Error("Mail is down"));
    await signIn(owner);

    expect(
      await runCommand(chat.id, PANEL_COMMAND.invite(email)),
    ).toMatchObject({
      kind: "noted",
      note: PANEL_COMMANDS_COPY.notes.unsent(email),
    });
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

  test("a pending invitation shows its address, never the account's name, until it is accepted", async () => {
    const [{ owner, first }, named] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await saveUserName(named.id, "Pat Pending");
    await addInvitee(owner, first.id, named);

    const people = await listQuestPeople(owner.id, first.id);
    expect(people?.invited).toEqual([
      { id: named.id, displayName: named.email, invitedAt: expect.any(Date) },
    ]);
    expect(JSON.stringify(people)).not.toContain("Pat Pending");

    expect(await answerInvitation(named.id, first.id, true)).toBe(true);
    expect((await listQuestPeople(owner.id, first.id))?.members).toEqual([
      { id: named.id, displayName: "Pat Pending", joinedAt: expect.any(Date) },
    ]);
  });

  test("only invitations that go out count against the hourly limit", async () => {
    const [{ owner, first, second }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);

    expect(await invite(member, second.id, testAddress())).toEqual({
      kind: "not-found",
    });
    expect(await invite(member, first.id, owner.email)).toEqual({
      kind: "in-quest",
    });
    const addresses = Array.from({ length: INVITATIONS_PER_HOUR }, () =>
      testAddress(),
    );
    expect(
      await Promise.all(
        addresses.map((address) => invite(member, first.id, address)),
      ),
    ).toEqual(addresses.map(() => ({ kind: "invited" })));

    const late = testAddress();
    expect(await invite(member, first.id, late)).toEqual({ kind: "limited" });
    expect(await findUserByEmail(late)).toBeUndefined();
  });

  test("the email names the quest and, from a member, its owner, lists what is shared and says when an account was set aside", async () => {
    const [{ owner, first }, member, existing] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
      testUser(),
    ]);
    await Promise.all([
      saveUserName(owner.id, "Rowan Owner"),
      saveUserName(member.id, "Mika Member"),
    ]);
    await addMember(owner, first.id, member);
    const address = testAddress();

    await invite(member, first.id, address);
    const fromMember = lastEmailTo(address);
    expect(fromMember.subject).toBe(
      QUEST_INVITATION_EMAIL_COPY.subject(first.name),
    );
    expect(fromMember.text).toContain(
      `Mika Member invited you to join Rowan Owner's quest "${first.name}"`,
    );
    expect(fromMember.text).toContain(
      "conversation, Tasks, Ideas, Quick Notes and milestones",
    );
    expect(fromMember.text).toContain(QUEST_INVITATION_EMAIL_COPY.notExpected);
    expect(fromMember.text).not.toContain("their quest");
    expect(fromMember.text).not.toContain("Nothing changes");

    await invite(owner, first.id, existing.email);
    const fromOwner = lastEmailTo(existing.email);
    expect(fromOwner.text).toContain(
      `Rowan Owner invited you to join the quest "${first.name}"`,
    );
    expect(fromOwner.text).toContain(
      QUEST_INVITATION_EMAIL_COPY.notExpectedMember,
    );
    expect(fromOwner.text).not.toContain(
      QUEST_INVITATION_EMAIL_COPY.notExpected,
    );
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
    await removeFromQuest(owner.id, { questId: second.id, person: user.id });

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

  test("a link reopened after joining says it no longer works, points to Pending only if pending, and names nothing", async () => {
    const [{ owner, first }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await invite(owner, first.id, user.email);
    const token = emailedInvitationToken(sent.sendEmail, user.email);
    await expectRedirect(
      () => continueSignInAction(continueForm(token)),
      `/quests/${first.id}`,
    );

    const signedIn = await linkPageHtml(token);
    expect(signedIn).toContain(LINK_PAGE_COPY.expired);
    expect(signedIn).toContain(
      "If your invitation is still pending, it&#x27;s under Pending in Quests.",
    );
    expect(signedIn).toContain(
      `href="/quests">${LINK_PAGE_COPY.openQuests}</a>`,
    );
    expect(signedIn).not.toContain(first.name);
    expect(signedIn).not.toContain("Ask for a new link");

    signOut();
    const signedOut = await linkPageHtml(token);
    expect(signedOut).toContain(LINK_PAGE_COPY.expired);
    expect(signedOut).toContain(`href="/login">${LINK_PAGE_COPY.logIn}</a>`);
    expect(signedOut).not.toContain(LINK_PAGE_COPY.openQuests);
    expect(signedOut).not.toContain(first.name);
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

  test("answering an invitation withdrawn meanwhile fails and refreshes Pending", async () => {
    const [{ owner, first }, user] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addInvitee(owner, first.id, user);
    expect(
      await removeFromQuest(owner.id, { questId: first.id, person: user.id }),
    ).toBe(true);
    await signIn(user);
    vi.mocked(refresh).mockClear();

    expect(
      await answerInvitationAction({ questId: first.id, accept: true }),
    ).toEqual({ kind: "failed" });
    expect(refresh).toHaveBeenCalled();
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
        status: "active",
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
    const [{ owner, first, chat }, member, other] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
      testUser(),
    ]);
    await saveUserName(other.id, "Otto Other");
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
      await runCommand(chat.id, PANEL_COMMAND.remove("Otto Other")),
    ).toMatchObject({
      kind: "noted",
      note: PANEL_COMMANDS_COPY.notes.removed("Otto Other"),
    });
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
    const [{ owner, first, chat }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await saveUserName(owner.id, "Rowan Owner");
    await addMember(owner, first.id, member);
    await signIn(member);

    expect(
      await runCommand(chat.id, PANEL_COMMAND.remove("Rowan Owner")),
    ).toEqual({ kind: "problem", text: PANEL_COMMANDS_COPY.problems.owner });
    expect(
      await removeFromQuest(member.id, {
        questId: first.id,
        person: owner.id,
      }),
    ).toBe(false);
    await signIn(owner);
    expect(await runCommand(chat.id, PANEL_COMMAND.leave)).toEqual({
      kind: "problem",
      text: PANEL_COMMANDS_COPY.problems.owner,
    });
    expect(await getQuest(owner.id, first.id)).toBeDefined();
    expect((await listQuestPeople(member.id, first.id))?.owner.id).toBe(
      owner.id,
    );
  });
});

describe("use_case_remove_quest_member", () => {
  test("a member who sends /leave loses access, and the page opens Quests, naming the quest", async () => {
    const [{ owner, first, chat }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    await signIn(member);

    expect(await runCommand(chat.id, PANEL_COMMAND.leave)).toMatchObject({
      kind: "noted",
      note: PANEL_COMMANDS_COPY.notes.left,
      navigate: HOME_PATH,
      leftQuest: first.name,
    });
    expect(await getQuest(member.id, first.id)).toBeUndefined();
    expect((await listQuestPeople(owner.id, first.id))?.members).toEqual([]);
    expect(await runCommand(chat.id, PANEL_COMMAND.leave)).toEqual({
      kind: "not-found",
    });
    expect(await commandNotes(owner.id, chat.id)).toEqual([
      { command: PANEL_COMMAND.leave, note: PANEL_COMMANDS_COPY.notes.left },
    ]);
  });

  test("/remove and /withdraw take out a member and an invitation by name, and say why when no one matches", async () => {
    const [{ owner, first, chat }, member, invitee] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
      testUser(),
    ]);
    await saveUserName(member.id, "Mika Member");
    await addMember(owner, first.id, member);
    await addInvitee(owner, first.id, invitee);
    await signIn(owner);

    expect(await runCommand(chat.id, PANEL_COMMAND.remove("Nobody"))).toEqual({
      kind: "problem",
      text: PANEL_COMMANDS_COPY.problems.noMember("Nobody"),
    });
    expect(
      await runCommand(chat.id, PANEL_COMMAND.withdraw(testAddress())),
    ).toMatchObject({ kind: "problem" });
    expect(
      await runCommand(chat.id, PANEL_COMMAND.remove("mika member")),
    ).toMatchObject({
      kind: "noted",
      note: PANEL_COMMANDS_COPY.notes.removed("Mika Member"),
    });
    expect(
      await runCommand(chat.id, PANEL_COMMAND.withdraw(invitee.email)),
    ).toMatchObject({
      kind: "noted",
      note: PANEL_COMMANDS_COPY.notes.withdrawn(invitee.email),
    });

    expect(await listQuestPeople(owner.id, first.id)).toMatchObject({
      members: [],
      invited: [],
    });
    expect(await listPendingQuests(invitee.id)).toEqual([]);
    expect(
      (await commandNotes(owner.id, chat.id)).map(({ note }) => note),
    ).toEqual([
      PANEL_COMMANDS_COPY.notes.removed("Mika Member"),
      PANEL_COMMANDS_COPY.notes.withdrawn(invitee.email),
    ]);
  });

  test("a removed member's quest page can't be found", async () => {
    const [{ owner, first }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await addMember(owner, first.id, member);
    await removeFromQuest(owner.id, { questId: first.id, person: member.id });
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

describe("how a quest is shared, wherever quests are listed", () => {
  test("the owner's quest with members is shared, a member sees its owner, and personal quests stay unmarked", async () => {
    const [{ owner, first, second }, member] = await Promise.all([
      ownerWithTwoQuests(),
      testUser(),
    ]);
    await saveUserName(owner.id, "Rowan Owner");
    await addMember(owner, first.id, member);
    const own = await testData(member).quest();

    const [ownerQuests, memberQuests, continued] = await Promise.all([
      listQuests(owner.id),
      listQuests(member.id),
      readCurrentQuest(member.id),
    ]);
    expect(sharingOf(ownerQuests, first.id)).toEqual({ kind: "shared" });
    expect(sharingOf(ownerQuests, second.id)).toEqual({ kind: "personal" });
    expect(sharingOf(memberQuests, first.id)).toEqual({
      kind: "joined",
      owner: "Rowan Owner",
    });
    expect(sharingOf(memberQuests, own.id)).toEqual({ kind: "personal" });
    expect(continued).toMatchObject({
      quest: { id: first.id },
      sharing: { kind: "joined", owner: "Rowan Owner" },
    });
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

    await removeFromQuest(owner.id, { questId: first.id, person: member.id });

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
