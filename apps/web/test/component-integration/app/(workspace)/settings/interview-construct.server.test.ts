import { describe, expect, test, vi } from "vitest";
import { setInterviewConstructAction } from "@/app/(workspace)/settings/interview-construct-action.ts";
import {
  cloneConstruct,
  deleteConstruct,
} from "@/constructs/construct-store.ts";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { retireDefinition } from "@/retirement/retirement-store.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf } from "../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

describe("use_case_set_interview_construct", () => {
  test("saves only the acting user's accessible construct and falls back after deletion", async () => {
    const [user, other] = await Promise.all([testUser(), testUser()]);
    await signIn(user);
    expect((await interviewConstruct(user.id)).id).toBe("vellum");
    expect(
      await setInterviewConstructAction(
        { kind: "idle" },
        formOf({ constructId: "lumen" }),
      ),
    ).toEqual({ kind: "saved" });
    expect((await interviewConstruct(user.id)).id).toBe("lumen");
    expect((await interviewConstruct(other.id)).id).toBe("vellum");
    const own = await cloneConstruct(user.id, "lumen");
    const foreign = await cloneConstruct(other.id, "vellum");
    if (own === undefined || foreign === undefined) {
      throw new Error("No clone was made");
    }
    expect(
      await setInterviewConstructAction(
        { kind: "idle" },
        formOf({ constructId: own.id }),
      ),
    ).toEqual({ kind: "saved" });
    expect((await interviewConstruct(user.id)).id).toBe(own.id);
    const refused = await Promise.all(
      [foreign.id, "missing"].map((constructId) =>
        setInterviewConstructAction({ kind: "idle" }, formOf({ constructId })),
      ),
    );
    expect(refused).toEqual([{ kind: "invalid" }, { kind: "invalid" }]);
    expect((await interviewConstruct(user.id)).id).toBe(own.id);
    await retireDefinition(user.id, "construct", own.id);
    await deleteConstruct(user.id, own.id);
    expect((await interviewConstruct(user.id)).id).toBe("vellum");
  });
});
