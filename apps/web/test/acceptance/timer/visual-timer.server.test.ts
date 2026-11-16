// Feature: Visual work and break timer (#987). One test for each of the
// issue's scenarios that the server decides, against the test database.
// visual-timer.browser.test.tsx has the ones the browser shows.
import { describe, expect, test, vi } from "vitest";
import { requireUser } from "@/auth/current-user.ts";
import { getQuest } from "@/quests/store.ts";
import { TIMER_PRESENCE_EXPIRY_MS } from "@/timer/presence.ts";
import { reportTimerPresenceAction } from "@/timer/presence-action.ts";
import { reportTimerPresence } from "@/timer/presence-store.ts";
import { type TimerSchedule, timerPath } from "@/timer/schedule.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

// A schedule no other test reports on: a start of its own.
function ownSchedule(): TimerSchedule {
  const [offset = 0] = crypto.getRandomValues(new Uint32Array(1));
  return { workMinutes: 50, breakMinutes: 10, startMs: Date.now() - offset };
}

// The guest who opened the shared link is the signed-in user.
vi.mock("@/auth/current-user.ts", () => ({ requireUser: vi.fn() }));

describe("Feature: Visual work and break timer", () => {
  test("Scenario: Count only other participants in the same schedule", async () => {
    const [a, b, c, gone] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
      testUser(),
    ]);
    const schedule = ownSchedule();
    const now = new Date();
    const expired = new Date(now.getTime() - TIMER_PRESENCE_EXPIRY_MS - 1);
    await reportTimerPresence(gone.id, schedule, expired);
    await reportTimerPresence(b.id, schedule, now);
    await reportTimerPresence(c.id, { ...schedule, breakMinutes: 15 }, now);

    expect(await reportTimerPresence(a.id, schedule, now)).toBe(1);
  });

  test("Scenario: Keep timer sharing separate from quest access", async () => {
    const [owner, guest] = await Promise.all([testUser(), testUser()]);
    const quest = await testData(owner).quest("Thesis chapter 3");
    const schedule = ownSchedule();
    await reportTimerPresence(owner.id, schedule, new Date());
    const link = timerPath(schedule);

    vi.mocked(requireUser).mockResolvedValue(guest);
    const presence = await reportTimerPresenceAction(schedule);

    expect(link).toBe(
      `/timer/${schedule.workMinutes}/${schedule.breakMinutes}/${schedule.startMs}`,
    );
    expect(link).not.toContain(quest.id);
    expect(presence).toEqual({ kind: "count", others: 1 });
    expect(JSON.stringify(presence)).not.toContain(owner.email);
    expect(await getQuest(guest.id, quest.id)).toBeUndefined();
  });
});
