import { expect, test, vi } from "vitest";
import { requestLoginLink } from "@/accounts/login-links.ts";
import { signUpAction } from "@/app/signup/actions.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

vi.mock("@/accounts/login-links.ts", () => ({ requestLoginLink: vi.fn() }));

test.each(["", "former shared code"])(
  "legacy sign-up refuses even a submitted shared code: %s",
  async (inviteCode) => {
    const form = new FormData();
    form.set("email", "learner@example.test");
    form.set("inviteCode", inviteCode);
    expect(await signUpAction({ kind: "idle" }, form)).toEqual({
      kind: "error",
      message: SIGNUP_COPY.intro,
      email: "learner@example.test",
    });
    expect(requestLoginLink).not.toHaveBeenCalled();
  },
);
