// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { loginLinkEmail } from "@/email/login-link-email.ts";
import { LOGIN_EMAIL_COPY } from "@/ui/copy/login.ts";

const URL_WITH_AMPERSAND = "https://site.example/a?b=c&d=<e>";
// The plain text ends with Hippy's name, on its own line.
const SIGNED_BY_HIPPY = /\nHippy\n$/u;

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

  test("is written by Hippy, and tells someone who didn't ask to ignore it", () => {
    const { text, html } = loginLinkEmail({
      to: "mabel@example.test",
      url: URL_WITH_AMPERSAND,
      idempotencyKey: "login-link/hash",
    });

    expect(text).toContain(LOGIN_EMAIL_COPY.notRequested);
    expect(text).toMatch(SIGNED_BY_HIPPY);
    const paragraphs = [
      ...new DOMParser()
        .parseFromString(html, "text/html")
        .querySelectorAll("p"),
    ].map((paragraph) => paragraph.textContent);
    expect(paragraphs).toContain(LOGIN_EMAIL_COPY.notRequested);
    expect(paragraphs.at(-1)).toBe(
      `${LOGIN_EMAIL_COPY.signOff}${LOGIN_EMAIL_COPY.signature}`,
    );
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
