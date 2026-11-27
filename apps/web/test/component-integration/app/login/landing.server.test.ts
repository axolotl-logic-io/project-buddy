import { describe, expect, test, vi } from "vitest";
import { newToken } from "@/accounts/emailed-link.ts";
import { continueSignInAction } from "@/app/(site)/login/link/actions.ts";
import { currentUser } from "@/auth/current-user.ts";
import { HOME_PATH } from "@/routes.ts";
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
  ])("opens Home when the return destination is %s", async (destination) => {
    const user = await testUser();
    const form = new FormData();
    form.set("token", await emailedLoginToken(user, sent.sendEmail));
    if (destination !== undefined) {
      form.set("next", destination);
    }
    await expectRedirect(() => continueSignInAction(form), HOME_PATH);
    expect((await currentUser())?.id).toBe(user.id);
  });

  test("preserves an explicit return to an authorized quest", async () => {
    const user = await testUser();
    const quest = await testData(user).quest();
    const destination = `/quests/${quest.id}`;
    const form = new FormData();
    form.set("token", await emailedLoginToken(user, sent.sendEmail));
    form.set("next", destination);
    await expectRedirect(() => continueSignInAction(form), destination);
    expect((await currentUser())?.id).toBe(user.id);
  });

  test.each(["invalid", newToken()])(
    "an unrecognized sign-in token cannot open a return destination or create a session",
    async (token) => {
      const form = new FormData();
      form.set("token", token);
      form.set("next", "/quests");
      await expectRedirect(() => continueSignInAction(form), "/login/link", {
        token,
      });
      expect(await currentUser()).toBeUndefined();
    },
  );
});
