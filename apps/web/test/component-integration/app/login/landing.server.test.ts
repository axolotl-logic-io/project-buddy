import { describe, expect, test, vi } from "vitest";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import { currentUser } from "@/auth/current-user.ts";
import { testData } from "../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../../test-database/navigation-test-kit.ts";
import {
  emailedLoginToken,
  type SendEmail,
} from "../../test-database/sign-in-link-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

describe("sign-in landing destination", () => {
  test.each([
    undefined,
    "https://example.test",
    "//example.test",
    "/../account",
  ])("opens Quests when the return destination is %s", async (destination) => {
    const user = await testUser();
    const form = new FormData();
    form.set("token", await emailedLoginToken(user, sent.sendEmail));
    if (destination !== undefined) {
      form.set("next", destination);
    }
    await expectRedirect(() => continueSignInAction(form), "/projects");
    expect((await currentUser())?.id).toBe(user.id);
  });

  test("preserves an explicit return to an authorized quest", async () => {
    const user = await testUser();
    const project = await testData(user).project();
    const destination = `/projects/${project.id}`;
    const form = new FormData();
    form.set("token", await emailedLoginToken(user, sent.sendEmail));
    form.set("next", destination);
    await expectRedirect(() => continueSignInAction(form), destination);
    expect((await currentUser())?.id).toBe(user.id);
  });

  test("an invalid sign-in link cannot open a return destination or create a session", async () => {
    const form = new FormData();
    form.set("token", "invalid");
    form.set("next", "/projects");
    await expectRedirect(() => continueSignInAction(form), "/login/link", {
      token: "invalid",
    });
    expect(await currentUser()).toBeUndefined();
  });
});
