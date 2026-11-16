// Who else follows a timer schedule, against the test database: each
// account's reports, counted for others on the same schedule until they
// expire.
import { describe, expect, test } from "vitest";
import { TIMER_PRESENCE_EXPIRY_MS } from "@/timer/presence.ts";
import { reportTimerPresenceAction } from "@/timer/presence-action.ts";
import { reportTimerPresence } from "@/timer/presence-store.ts";
import type { TimerSchedule } from "@/timer/schedule.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// How far back a test's own schedule may start: about 11 days.
const START_SPREAD_MS = 1_000_000_000;

// A schedule no other test reports on, so counts are this test's alone.
function ownSchedule(
  durations: Pick<TimerSchedule, "workMinutes" | "breakMinutes"> = {
    workMinutes: 50,
    breakMinutes: 10,
  },
): TimerSchedule {
  return {
    ...durations,
    startMs: Date.now() - Math.floor(Math.random() * START_SPREAD_MS),
  };
}

const NOW = new Date();

// now, moved by ms.
function later(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

describe("use_case_timer_see_others", () => {
  test("counts other accounts on the same schedule, once each, but not the caller or another schedule", async () => {
    const [a, b, c] = await Promise.all([testUser(), testUser(), testUser()]);
    const schedule = ownSchedule();
    const otherDurations = { ...schedule, breakMinutes: 15 } as const;
    const otherStart = { ...schedule, startMs: schedule.startMs + 1 };

    expect(await reportTimerPresence(a.id, schedule, NOW)).toBe(0);
    expect(await reportTimerPresence(b.id, schedule, NOW)).toBe(1);
    // B's second tab counts once.
    expect(await reportTimerPresence(b.id, schedule, NOW)).toBe(1);
    expect(await reportTimerPresence(c.id, otherDurations, NOW)).toBe(0);
    expect(await reportTimerPresence(c.id, otherStart, NOW)).toBe(0);

    expect(await reportTimerPresence(a.id, schedule, later(1))).toBe(1);
  });

  test("stops counting a report once it expires, and counts it again after a new one", async () => {
    const [a, b] = await Promise.all([testUser(), testUser()]);
    const schedule = ownSchedule();
    await reportTimerPresence(b.id, schedule, NOW);
    const expired = later(TIMER_PRESENCE_EXPIRY_MS + 1);
    const renewed = later(TIMER_PRESENCE_EXPIRY_MS + 2);

    expect(
      await reportTimerPresence(
        a.id,
        schedule,
        later(TIMER_PRESENCE_EXPIRY_MS),
      ),
    ).toBe(1);
    expect(await reportTimerPresence(a.id, schedule, expired)).toBe(0);

    await reportTimerPresence(b.id, schedule, renewed);
    expect(await reportTimerPresence(a.id, schedule, renewed)).toBe(1);
  });

  test("the signed-in user's report answers the count, or unavailable for a request that names no schedule", async () => {
    const [a, b] = await Promise.all([testUser(), testUser()]);
    const schedule = ownSchedule({ workMinutes: 25, breakMinutes: 15 });
    await reportTimerPresence(b.id, schedule, new Date());
    await signIn(a);

    expect(await reportTimerPresenceAction(schedule)).toEqual({
      kind: "count",
      others: 1,
    });
    expect(
      await reportTimerPresenceAction({ ...schedule, workMinutes: 0 }),
    ).toEqual({ kind: "unavailable" });
    expect(await reportTimerPresenceAction("quest")).toEqual({
      kind: "unavailable",
    });
  });
});
