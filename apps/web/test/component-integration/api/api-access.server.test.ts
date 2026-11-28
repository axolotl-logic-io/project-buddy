// Who the quest API and a Server Action still answer, in the test database,
// now that pages read the session from the browser's App Shell: each
// request checks the session again, so one signed out everywhere is refused
// by both, and a member removed or a person only invited finds nothing.

import { describe, expect, test, vi } from "vitest";
import { endEverySession } from "@/accounts/users-store.ts";
import { startQuestAction } from "@/app/(stream)/(site)/(workspace)/quests/actions.ts";
import { GET as getQuest } from "@/app/api/v1/quests/[questId]/route.ts";
import { GET as listQuests } from "@/app/api/v1/quests/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { removeFromQuest } from "@/quests/membership-store.ts";
import { listQuests as questsOf } from "@/quests/store.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addInvitee, addMember } from "../quests/quest-members-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";
import { callApi } from "./api-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

describe("a session signed out everywhere", () => {
  test("is refused by the API and by a Server Action", async () => {
    const user = await testUser();
    await signIn(user);
    expect((await callApi(listQuests, { params: {} })).status).toBe(
      HTTP_STATUS.ok,
    );

    await endEverySession(user.id);

    expect(await callApi(listQuests, { params: {} })).toEqual({
      status: HTTP_STATUS.unauthorized,
      body: {
        error: expect.objectContaining({ code: "authorization_required" }),
      },
    });
    await expect(
      expectRedirect(
        () => startQuestAction({ id: crypto.randomUUID(), name: "Mine" }),
        SIGN_IN_PATH,
      ),
    ).resolves.toBeUndefined();
    expect(await questsOf(user.id)).toEqual([]);
  });
});

describe("a shared quest's API", () => {
  test("a removed member finds the quest no longer", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);
    await signIn(member);
    const params = { questId: quest.id };
    expect((await callApi(getQuest, { params })).status).toBe(HTTP_STATUS.ok);

    await removeFromQuest(owner.id, { questId: quest.id, person: member.id });

    expect(await callApi(getQuest, { params })).toEqual({
      status: HTTP_STATUS.notFound,
      body: { error: expect.objectContaining({ code: "not_found" }) },
    });
  });

  test("a person only invited finds the quest not yet", async () => {
    const [owner, invitee] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addInvitee(owner, quest.id, invitee);
    await signIn(invitee);

    expect(await callApi(getQuest, { params: { questId: quest.id } })).toEqual({
      status: HTTP_STATUS.notFound,
      body: { error: expect.objectContaining({ code: "not_found" }) },
    });
  });
});
