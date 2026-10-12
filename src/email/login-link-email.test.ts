// @vitest-environment node
import { describe, expect, test } from "vitest";
import { loginLinkEmail } from "@/email/login-link-email.ts";
import { LOGIN_EMAIL_COPY } from "@/ui/copy/login.ts";

const URL_WITH_AMPERSAND = "https://site.example/a?b=c&d=<e>";

describe("loginLinkEmail", () => {
  test("holds the link in its text, with the expiry", () => {
    const message = loginLinkEmail({
      to: "mabel@example.test",
      url: URL_WITH_AMPERSAND,
      idempotencyKey: "login-link/hash",
    });

    expect(message).toMatchObject({
      to: "mabel@example.test",
      subject: LOGIN_EMAIL_COPY.subject,
      idempotencyKey: "login-link/hash",
    });
    expect(message.text).toContain(`\n${URL_WITH_AMPERSAND}\n`);
    expect(message.text).toContain(LOGIN_EMAIL_COPY.expiry);
  });

  test("escapes the link in its HTML", () => {
    const { html } = loginLinkEmail({
      to: "mabel@example.test",
      url: URL_WITH_AMPERSAND,
      idempotencyKey: "login-link/hash",
    });

    expect(html).toContain('href="https://site.example/a?b=c&amp;d=&lt;e&gt;"');
    expect(html).not.toContain("<e>");
  });
});
