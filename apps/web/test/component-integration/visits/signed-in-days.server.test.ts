import { afterEach, describe, expect, test, vi } from "vitest";
import { endEverySession, readSessionUser } from "@/accounts/users-store.ts";
import { currentUser } from "@/auth/current-user.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { recordVisitAction } from "@/visits/record-visit-action.ts";
import {
  readSignedInDays,
  recordSignedInDay,
} from "@/visits/signed-in-days-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "../quests/quest-members-test-kit.ts";
import { lapsed, signIn, signOut } from "../test-database/session-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";
import { deleteAccount } from "../test-database/two-users-test-kit.ts";

const DISTINCT_BOUNDARY_DATES = 8;

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

afterEach(() => vi.useRealTimers());

describe("use_case_days_signed_in", () => {
  test("reads and old account activity do not invent visiting history", async () => {
    const user = await testUser();
    await testData(user).quest();
    await signIn(user);
    await currentUser();
    await readSessionUser(user.id, user.sessionEpoch);
    expect(await readSignedInDays(user.id)).toEqual({
      total: 0,
      trackedSince: null,
    });
    expect(await readSignedInDays(user.id)).toEqual({
      total: 0,
      trackedSince: null,
    });
  });

  test("the same session returns after UTC midnight, without gaining experience", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T23:59:59.999Z"));
    const user = await testUser();
    await signIn(user);
    expect(await recordVisitAction()).toBe("added");
    expect(await recordVisitAction()).toBe("known");
    vi.setSystemTime(new Date("2026-11-02T00:00:00.000Z"));
    expect(await recordVisitAction()).toBe("added");
    expect(await readSignedInDays(user.id)).toEqual({
      total: 2,
      trackedSince: "2026-11-01",
    });
    signOut();
    await signIn(user);
    expect(await recordVisitAction()).toBe("known");
    expect((await readExperience(user.id)).experience).toBe(0);
  });

  test("simultaneous reports across tabs and devices add one date", async () => {
    const user = await testUser();
    const now = new Date("2026-11-01T12:00:00Z");
    const reports = await Promise.all(
      Array.from({ length: 12 }, () => recordSignedInDay(user.id, now)),
    );
    expect(reports.filter(Boolean)).toHaveLength(1);
    expect(await readSignedInDays(user.id)).toEqual({
      total: 1,
      trackedSince: "2026-11-01",
    });
  });

  test("UTC dates survive DST repeats, offset dates, leap day and year boundaries", async () => {
    const user = await testUser();
    const instants = [
      "2024-02-28T23:59:59.999Z",
      "2024-02-29T00:00:00Z",
      "2024-02-29T23:59:59.999Z",
      "2024-03-01T00:00:00Z",
      "2024-12-31T23:59:59.999Z",
      "2025-01-01T00:00:00Z",
      "2026-03-08T01:59:59-05:00",
      "2026-03-08T03:00:00-04:00",
      "2026-11-01T01:30:00-04:00",
      "2026-11-01T01:30:00-05:00",
      "2026-11-02T08:59:59+09:00",
      "2026-11-01T19:00:00-05:00",
    ];
    const added = await Promise.all(
      instants.map((instant) => recordSignedInDay(user.id, new Date(instant))),
    );
    expect(added.filter(Boolean)).toHaveLength(DISTINCT_BOUNDARY_DATES);
    expect(await readSignedInDays(user.id)).toEqual({
      total: 8,
      trackedSince: "2024-02-28",
    });
  });

  test("signed-out, lapsed and revoked sessions create no date", async () => {
    const user = await testUser();
    expect(await recordVisitAction()).toBe("unavailable");
    await lapsed(user);
    expect(await recordVisitAction()).toBe("unavailable");
    await signIn(user);
    await endEverySession(user.id);
    expect(await recordVisitAction()).toBe("unavailable");
    expect(await readSignedInDays(user.id)).toEqual({
      total: 0,
      trackedSince: null,
    });
  });

  test("changing signed-in accounts records only the current account and keeps prior totals", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const [first, second] = await Promise.all([testUser(), testUser()]);
    await signIn(first);
    expect(await recordVisitAction()).toBe("added");
    signOut();
    vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
    await signIn(second);
    expect(await recordVisitAction()).toBe("added");
    expect(await readSignedInDays(first.id)).toEqual({
      total: 1,
      trackedSince: "2026-11-01",
    });
    expect(await readSignedInDays(second.id)).toEqual({
      total: 1,
      trackedSince: "2026-11-02",
    });
  });

  test("quest relationships never expose or change another account's total", async () => {
    const [owner, member, invitee, removed, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
      testUser(),
      testUser(),
    ]);
    const quest = await testData(owner).quest();
    await addMember(owner, quest.id, member);
    await addInvitee(owner, quest.id, invitee);
    await addRemovedMember(owner, quest.id, removed);
    await recordSignedInDay(owner.id, new Date("2026-11-01T12:00:00Z"));
    await Promise.all(
      [member, invitee, removed, stranger].map(async (user) => {
        expect(await readSignedInDays(user.id)).toEqual({
          total: 0,
          trackedSince: null,
        });
        await recordSignedInDay(user.id, new Date("2026-11-02T12:00:00Z"));
        expect(await readSignedInDays(user.id)).toEqual({
          total: 1,
          trackedSince: "2026-11-02",
        });
      }),
    );
    expect(await readSignedInDays(owner.id)).toEqual({
      total: 1,
      trackedSince: "2026-11-01",
    });
    await deleteAccount(owner);
    expect(await readSignedInDays(owner.id)).toEqual({
      total: 0,
      trackedSince: null,
    });
    expect((await readSignedInDays(member.id)).total).toBe(1);
  });
});
