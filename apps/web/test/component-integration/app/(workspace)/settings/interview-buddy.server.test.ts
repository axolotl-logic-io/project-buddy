import { describe, expect, test, vi } from "vitest";
import { setInterviewBuddyAction } from "@/app/(workspace)/settings/actions.ts";
import { cloneBuddy, deleteBuddy } from "@/buddies/buddy-store.ts";
import { interviewBuddy } from "@/buddies/interview-buddy.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf } from "../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

describe("use_case_set_interview_buddy", () => {
  test("saves only the acting user's accessible buddy and falls back after deletion", async () => {
    const [user, other] = await Promise.all([testUser(), testUser()]);
    await signIn(user);
    expect((await interviewBuddy(user.id)).id).toBe("vellum");
    expect(
      await setInterviewBuddyAction(
        { kind: "idle" },
        formOf({ buddyId: "lumen" }),
      ),
    ).toEqual({ kind: "saved" });
    expect((await interviewBuddy(user.id)).id).toBe("lumen");
    expect((await interviewBuddy(other.id)).id).toBe("vellum");
    const own = await cloneBuddy(user.id, "lumen");
    const foreign = await cloneBuddy(other.id, "vellum");
    if (own === undefined || foreign === undefined) {
      throw new Error("No clone was made");
    }
    expect(
      await setInterviewBuddyAction(
        { kind: "idle" },
        formOf({ buddyId: own.id }),
      ),
    ).toEqual({ kind: "saved" });
    expect((await interviewBuddy(user.id)).id).toBe(own.id);
    const refused = await Promise.all(
      [foreign.id, "missing"].map((buddyId) =>
        setInterviewBuddyAction({ kind: "idle" }, formOf({ buddyId })),
      ),
    );
    expect(refused).toEqual([{ kind: "invalid" }, { kind: "invalid" }]);
    expect((await interviewBuddy(user.id)).id).toBe(own.id);
    await deleteBuddy(user.id, own.id);
    expect((await interviewBuddy(user.id)).id).toBe("vellum");
  });
});
