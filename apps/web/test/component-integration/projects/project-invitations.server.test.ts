// Project invitations against the test database: inviting a person with an
// account to a project, the email's sign-in link to the invitation's page,
// joining, declining and revoking, and who may do each.
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { findUserByEmail, type User } from "@/accounts/users-store.ts";
import {
  inviteToProjectAction,
  revokeProjectInvitationAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import ProjectInvitationPage from "@/app/(workspace)/projects/invitations/[token]/page.tsx";
import {
  declineProjectInvitationAction,
  joinProjectAction,
} from "@/app/(workspace)/projects/invitations/actions.ts";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import { currentUser } from "@/auth/current-user.ts";
import { getDb } from "@/db/client.ts";
import { projectInvitations } from "@/db/tables/project-invitations.ts";
import { rateLimits } from "@/db/tables/rate-limits.ts";
import type { EmailMessage } from "@/email/email-message.ts";
import type { ProjectId } from "@/ids.ts";
import {
  addProjectMember,
  listProjectMembers,
} from "@/projects/members-store.ts";
import {
  listProjectInvitations,
  listSentProjectInvitations,
  type ProjectInvitation,
  readProjectInvitation,
} from "@/projects/project-invitations.ts";
import { HOME_PATH } from "@/routes.ts";
import { PROJECT_INVITE_COPY } from "@/ui/copy/project-invitations.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn, signOut } from "../test-database/session-test-kit.ts";

const delivery = vi.hoisted(() => ({
  sendEmail: vi.fn<(message: EmailMessage) => Promise<void>>(),
}));
vi.mock("@/email/send-email.ts", () => delivery);
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
// refresh() needs a request, which a server test has none of.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const IDLE = { kind: "idle" } as const;
const INVITER_BUDGET = 20;
const MINUTE_MS = 60_000;
const SIGN_IN_LINK = /https?:\/\/\S+\/login\/link\?\S+/u;
const LONG_NAME_PADDING = 200;
const LINE_BREAK = /[\r\n]/u;
const SITE_LINK = /<a href="http:\/\/localhost:3494\/login\/link\?/u;
const INVITATION_PATH = /^\/projects\/invitations\/(?<token>[\w-]{43})$/u;

// A project of the owner's, with the owner signed in.
async function ownProject(owner: User): Promise<ProjectId> {
  const project = await testData(owner).project("Sea turtle model");
  await signIn(owner);
  return project.id;
}

// Invites the address to the project as the signed-in user, and gives the
// form's answer once what inviting does after the response is done.
async function invite(
  projectId: string,
  email: string,
): Promise<Awaited<ReturnType<typeof inviteToProjectAction>>> {
  const answer = await inviteToProjectAction(
    IDLE,
    inviteForm(projectId, email),
  );
  await afterTasksDone();
  return answer;
}

function inviteForm(projectId: string, email: string): FormData {
  const data = new FormData();
  data.set("projectId", projectId);
  data.set("email", email);
  return data;
}

function invitationForm(invitationId: string): FormData {
  const data = new FormData();
  data.set("invitationId", invitationId);
  return data;
}

// The last email sent, and its sign-in link's token and destination.
function lastInvitationEmail(): {
  readonly message: EmailMessage | undefined;
  readonly signInToken: string;
  readonly destination: string;
  readonly invitationToken: string;
} {
  const [message] = delivery.sendEmail.mock.lastCall ?? [];
  const [link = "http://localhost/"] =
    SIGN_IN_LINK.exec(message?.text ?? "") ?? [];
  const url = new URL(link);
  const destination = url.searchParams.get("next") ?? "";
  const { token = "" } = INVITATION_PATH.exec(destination)?.groups ?? {};
  return {
    message,
    signInToken: url.searchParams.get("token") ?? "",
    destination,
    invitationToken: token,
  };
}

// The invitee's one pending invitation; throws unless they have just one.
async function onlyInvitation(invitee: User): Promise<ProjectInvitation> {
  const [invitation, ...others] = await listProjectInvitations(invitee.id);
  if (invitation === undefined || others.length > 0) {
    throw new Error("The invitee hasn't exactly one pending invitation");
  }
  return invitation;
}

function invitationRows(projectId: ProjectId): Promise<unknown[]> {
  return getDb()
    .select({ state: projectInvitations.state })
    .from(projectInvitations)
    .where(eq(projectInvitations.projectId, projectId));
}

beforeEach(() => {
  delivery.sendEmail.mockReset().mockResolvedValue();
});

describe("use_case_invite_to_project", () => {
  test("the owner invites an account, which gets one email naming the inviter and project", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    expect(
      await invite(projectId, ` ${invitee.email.toUpperCase()} `),
    ).toMatchObject({ kind: "sent" });
    expect(delivery.sendEmail).toHaveBeenCalledOnce();
    const { message, destination } = lastInvitationEmail();
    expect(message?.to).toBe(invitee.email);
    expect(message?.subject).toContain(owner.email);
    expect(message?.subject).toContain("Sea turtle model");
    expect(destination).toMatch(INVITATION_PATH);
    expect(await listSentProjectInvitations(owner.id, projectId)).toEqual([
      expect.objectContaining({ email: invitee.email }),
    ]);
    expect(await onlyInvitation(invitee)).toMatchObject({
      project: { id: projectId, name: "Sea turtle model" },
      inviter: owner.email,
    });
    // Inviting adds no one.
    expect(await listProjectMembers(owner.id, projectId)).toHaveLength(1);
  });

  test("the email shows a hostile project name short, on one line, escaped and with no link", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const name = `<a href="https://evil.example/login">Security notice</a> &\nYour account closes Friday. Confirm at https://evil.example/login or www.evil.example ${"x".repeat(LONG_NAME_PADDING)}`;
    const project = await testData(owner).project(name);
    await signIn(owner);
    await invite(project.id, invitee.email);
    const { message } = lastInvitationEmail();
    const subject = message?.subject ?? "";
    const html = message?.html ?? "";
    const text = message?.text ?? "";
    expect(subject).not.toMatch(LINE_BREAK);
    expect(subject.length).toBeLessThan(name.length);
    expect(subject).toContain('"<a href');
    expect(subject).toContain('…"');
    expect(html).toContain("&lt;a href=&quot;https[:]//evil[.]example/login");
    expect(html).not.toContain('<a href="https://evil');
    for (const part of [subject, html, text]) {
      expect(part).not.toContain("evil.example");
      expect(part).not.toContain("https://evil");
    }
    // The email's own link is still a link.
    expect(html).toMatch(SITE_LINK);
  });

  test("an unknown address gets the same answer, and creates no account, invitation or email", async () => {
    const owner = await testUser();
    const projectId = await ownProject(owner);
    const unknown = `nobody-${crypto.randomUUID()}@example.test`;
    expect(await invite(projectId, unknown)).toEqual({
      kind: "sent",
      message: PROJECT_INVITE_COPY.sent(unknown),
      email: unknown,
    });
    expect(delivery.sendEmail).not.toHaveBeenCalled();
    expect(await findUserByEmail(unknown)).toBeUndefined();
    expect(await invitationRows(projectId)).toEqual([]);
  });

  test("a known and an unknown address can't be told apart by the answer, its timing or the limits", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    const unknown = `nobody-${crypto.randomUUID()}@example.test`;
    function budget(): Promise<{ count: number }[]> {
      return getDb()
        .select({ count: rateLimits.count })
        .from(rateLimits)
        .where(eq(rateLimits.key, `project-invitation-inviter:${owner.id}`));
    }
    // Each answer comes before anything is emailed or saved, so the known
    // address's work can't make its answer slower.
    const known = await inviteToProjectAction(
      IDLE,
      inviteForm(projectId, invitee.email),
    );
    expect(delivery.sendEmail).not.toHaveBeenCalled();
    expect(await invitationRows(projectId)).toEqual([]);
    expect(await budget()).toEqual([{ count: 1 }]);
    const unknownAnswer = await invite(projectId, unknown);
    expect(await budget()).toEqual([{ count: 2 }]);
    await afterTasksDone();
    // The same answer, but for the address it names.
    expect({
      ...known,
      message: known.message.replace(invitee.email, "A"),
    }).toEqual({
      ...unknownAnswer,
      message: unknownAnswer.message.replace(unknown, "A"),
      email: invitee.email,
    });
    expect(known).toEqual({
      kind: "sent",
      message: PROJECT_INVITE_COPY.sent(invitee.email),
      email: invitee.email,
    });
    // Both addresses wait out the same cooldown, with the same answer.
    const [knownAgain, unknownAgain] = await Promise.all([
      invite(projectId, invitee.email),
      invite(projectId, unknown),
    ]);
    expect(knownAgain).toEqual({ ...unknownAgain, email: invitee.email });
    expect(knownAgain).toMatchObject({
      kind: "error",
      message: PROJECT_INVITE_COPY.limited,
    });
    // Only the known address got an email, and no row names the unknown one.
    expect(delivery.sendEmail).toHaveBeenCalledOnce();
    expect(
      (await listSentProjectInvitations(owner.id, projectId))?.map(
        ({ email }) => email,
      ),
    ).toEqual([invitee.email]);
  });

  test("inviting yourself, a member or a malformed address is refused, sending nothing", async () => {
    const owner = await testUser();
    const member = await testUser();
    const projectId = await ownProject(owner);
    expect(await addProjectMember(member.id, projectId)).toBe(true);
    expect(await invite(projectId, owner.email)).toMatchObject({
      kind: "invalid",
      message: PROJECT_INVITE_COPY.yourself,
    });
    expect(await invite(projectId, member.email)).toMatchObject({
      kind: "invalid",
      message: PROJECT_INVITE_COPY.alreadyMember(member.email),
    });
    expect(await invite(projectId, "not-an-address")).toMatchObject({
      kind: "invalid",
      message: PROJECT_INVITE_COPY.needsEmail,
    });
    expect(delivery.sendEmail).not.toHaveBeenCalled();
    expect(await invitationRows(projectId)).toEqual([]);
  });

  test("only the owner can invite: a member and a stranger get not found", async () => {
    const owner = await testUser();
    const member = await testUser();
    const stranger = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    await addProjectMember(member.id, projectId);
    async function tryToInvite(someone: User): Promise<void> {
      await signIn(someone);
      await expectNotFound(() => invite(projectId, invitee.email));
      expect(
        await listSentProjectInvitations(someone.id, projectId),
      ).toBeUndefined();
    }
    await tryToInvite(member);
    await tryToInvite(stranger);
    expect(delivery.sendEmail).not.toHaveBeenCalled();
    expect(await listProjectInvitations(invitee.id)).toEqual([]);
  });

  test("a newer invitation to the same person replaces the pending one", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    await invite(projectId, invitee.email);
    const first = lastInvitationEmail().invitationToken;
    clock.mockReturnValue(now + MINUTE_MS + 1);
    await invite(projectId, invitee.email);
    const second = lastInvitationEmail().invitationToken;
    clock.mockRestore();
    expect(second).not.toBe(first);
    expect(await readProjectInvitation(invitee.id, first)).toBeUndefined();
    expect(await readProjectInvitation(invitee.id, second)).toBeDefined();
    expect(await listSentProjectInvitations(owner.id, projectId)).toHaveLength(
      1,
    );
    await onlyInvitation(invitee);
  });

  test("a failed email saves no invitation, and the owner can retry at once", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    delivery.sendEmail.mockRejectedValueOnce(new Error("Resend is down"));
    const log = vi.spyOn(console, "error").mockReturnValue();
    // The answer comes before the email is sent, so it can't say it failed.
    expect(await invite(projectId, invitee.email)).toMatchObject({
      kind: "sent",
    });
    expect(log).toHaveBeenCalled();
    expect(await listProjectInvitations(invitee.id)).toEqual([]);
    expect(await invite(projectId, invitee.email)).toMatchObject({
      kind: "sent",
    });
    await onlyInvitation(invitee);
  });

  test("each inviter sends at most 20 project invitations an hour, and one a minute to an address", async () => {
    const owner = await testUser();
    const projectId = await ownProject(owner);
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const invitees = await Promise.all(
      Array.from({ length: INVITER_BUDGET + 1 }, () => testUser()),
    );
    // Sent together, so concurrent sends can't get past the limit either.
    const outcomes = await Promise.all(
      invitees.map((invitee) => invite(projectId, invitee.email)),
    );
    const sent = outcomes.filter(({ kind }) => kind === "sent");
    const refused = outcomes.filter(({ kind }) => kind !== "sent");
    expect(sent).toHaveLength(INVITER_BUDGET);
    expect(refused).toEqual([
      expect.objectContaining({
        kind: "error",
        message: PROJECT_INVITE_COPY.limited,
      }),
    ]);
    expect(delivery.sendEmail).toHaveBeenCalledTimes(INVITER_BUDGET);
    // Another owner has a budget of their own, but an address that was just
    // invited waits a minute.
    const other = await testUser();
    const otherProject = await ownProject(other);
    expect(await invite(otherProject, sent[0]?.email ?? "")).toMatchObject({
      kind: "error",
      message: PROJECT_INVITE_COPY.limited,
    });
    expect(await invite(otherProject, refused[0]?.email ?? "")).toMatchObject({
      kind: "sent",
    });
  });
});

describe("use_case_join_project", () => {
  test("the email's link signs the invitee in on the invitation's page, and Join makes them a member", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    await invite(projectId, invitee.email);
    const { signInToken, destination, invitationToken } = lastInvitationEmail();
    signOut();
    const form = new FormData();
    form.set("token", signInToken);
    form.set("next", destination);
    await expectRedirect(() => continueSignInAction(form), destination);
    expect((await currentUser())?.id).toBe(invitee.id);
    expect(
      await ProjectInvitationPage({
        params: Promise.resolve({ token: invitationToken }),
        searchParams: Promise.resolve({}),
      }),
    ).toBeDefined();
    const invitation = await onlyInvitation(invitee);
    await expectRedirect(
      () => joinProjectAction(invitationForm(invitation.id)),
      `/projects/${projectId}`,
    );
    expect(
      (await listProjectMembers(invitee.id, projectId)).map(({ id }) => id),
    ).toEqual([owner.id, invitee.id]);
    expect(await listProjectInvitations(invitee.id)).toEqual([]);
    expect(await listSentProjectInvitations(owner.id, projectId)).toEqual([]);
    // The answered invitation can't be used again.
    await expectNotFound(() =>
      joinProjectAction(invitationForm(invitation.id)),
    );
    await expectNotFound(() =>
      ProjectInvitationPage({
        params: Promise.resolve({ token: invitationToken }),
        searchParams: Promise.resolve({}),
      }),
    );
  });

  test("only the invitee can see or answer an invitation; anyone else gets not found", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const stranger = await testUser();
    const projectId = await ownProject(owner);
    await invite(projectId, invitee.email);
    const { invitationToken } = lastInvitationEmail();
    const invitation = await onlyInvitation(invitee);
    async function tryToAnswer(someone: User): Promise<void> {
      await signIn(someone);
      expect(await listProjectInvitations(someone.id)).toEqual([]);
      await expectNotFound(() =>
        ProjectInvitationPage({
          params: Promise.resolve({ token: invitationToken }),
          searchParams: Promise.resolve({}),
        }),
      );
      await expectNotFound(() =>
        joinProjectAction(invitationForm(invitation.id)),
      );
      await expectNotFound(() =>
        declineProjectInvitationAction(invitationForm(invitation.id)),
      );
    }
    await tryToAnswer(stranger);
    await tryToAnswer(owner);
    await signIn(invitee);
    await expectNotFound(() =>
      ProjectInvitationPage({
        params: Promise.resolve({ token: "not-a-token" }),
        searchParams: Promise.resolve({}),
      }),
    );
    await expectNotFound(() => joinProjectAction(invitationForm("not-an-id")));
    expect(await listProjectMembers(owner.id, projectId)).toHaveLength(1);
    expect(await onlyInvitation(invitee)).toMatchObject({ id: invitation.id });
  });

  test("a sign-in link leads only to a path on the site", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    await invite(projectId, invitee.email);
    const { signInToken } = lastInvitationEmail();
    await Promise.all(
      [
        "//evil.example/projects",
        "https://evil.example",
        "/\\evil.example",
        "/projects/../login",
      ].map((next) => {
        const form = new FormData();
        form.set("token", signInToken);
        form.set("next", next);
        return expectRedirect(() => continueSignInAction(form), HOME_PATH);
      }),
    );
    expect((await currentUser())?.id).toBe(invitee.id);
  });
});

describe("use_case_decline_project_invitation", () => {
  test("declining removes the invitation and adds no one", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const projectId = await ownProject(owner);
    await invite(projectId, invitee.email);
    await signIn(invitee);
    const invitation = await onlyInvitation(invitee);
    await expectRedirect(
      () => declineProjectInvitationAction(invitationForm(invitation.id)),
      "/projects",
    );
    expect(await listProjectInvitations(invitee.id)).toEqual([]);
    expect(await listSentProjectInvitations(owner.id, projectId)).toEqual([]);
    expect(await listProjectMembers(owner.id, projectId)).toHaveLength(1);
    await expectNotFound(() =>
      joinProjectAction(invitationForm(invitation.id)),
    );
  });
});

describe("use_case_revoke_project_invitation", () => {
  test("the owner revokes a pending invitation, which the invitee can no longer see or join", async () => {
    const owner = await testUser();
    const invitee = await testUser();
    const member = await testUser();
    const projectId = await ownProject(owner);
    await addProjectMember(member.id, projectId);
    await invite(projectId, invitee.email);
    const { invitationToken } = lastInvitationEmail();
    const invitation = await onlyInvitation(invitee);
    // A member and the invitee can't revoke it.
    await signIn(member);
    await revokeProjectInvitationAction(invitationForm(invitation.id));
    await signIn(invitee);
    await revokeProjectInvitationAction(invitationForm(invitation.id));
    await onlyInvitation(invitee);
    await signIn(owner);
    await revokeProjectInvitationAction(invitationForm(invitation.id));
    expect(await listSentProjectInvitations(owner.id, projectId)).toEqual([]);
    expect(await listProjectInvitations(invitee.id)).toEqual([]);
    expect(
      await readProjectInvitation(invitee.id, invitationToken),
    ).toBeUndefined();
    await signIn(invitee);
    await expectNotFound(() =>
      joinProjectAction(invitationForm(invitation.id)),
    );
    expect(await listProjectMembers(owner.id, projectId)).toHaveLength(2);
  });
});
