// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { EmailFailure, type EmailProblem } from "@/email/email-failure.ts";
import type { EmailMessage } from "@/email/email-message.ts";
import { sendEmail } from "@/email/send-email.ts";
import { logEmailFailure } from "@/errors/error-log.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";

const API_KEY = "re_test_key";
const FROM_ADDRESS = "sender@example.test";
const TOKEN = "SECRET-TOKEN-abc";
const IDEMPOTENCY_KEY = "login-link/first-link";
// Statuses Resend answers with that the site sends no other way.
const UNPROCESSABLE_CONTENT = 422;
const FROM_ADDRESS_NOT_SET = /EMAIL_FROM_ADDRESS is not set/u;
const SERVICE_UNAVAILABLE = 503;
const MESSAGE: EmailMessage = {
  to: "mabel@example.test",
  subject: "Your sign-in link",
  text: `Sign in: https://site.example/login/link?token=${TOKEN}`,
  html: `<a href="https://site.example/login/link?token=${TOKEN}">Sign in</a>`,
  idempotencyKey: IDEMPOTENCY_KEY,
};

function resendAnswering(status: number, body: unknown): typeof fetch {
  return vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json(body, { status })),
  );
}

// The EmailFailure sendEmail threw.
async function failureOf(fetchFn: typeof fetch): Promise<EmailFailure> {
  const error: unknown = await sendEmail(MESSAGE, fetchFn).catch(
    (thrown: unknown) => thrown,
  );
  if (!(error instanceof EmailFailure)) {
    throw new Error("sendEmail didn't throw an EmailFailure");
  }
  return error;
}

beforeEach(() => {
  vi.stubEnv("EMAIL_TRANSPORT", "resend");
  vi.stubEnv("RESEND_API_KEY", API_KEY);
  vi.stubEnv("EMAIL_FROM_ADDRESS", FROM_ADDRESS);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail through Resend", () => {
  test("posts the message from the site's sender, with its idempotency key", async () => {
    const fetchFn = resendAnswering(HTTP_STATUS.ok, { id: "email-1" });

    await sendEmail(MESSAGE, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetchFn).mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers)).toEqual(
      new Headers({
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
        "user-agent": "project-buddy",
        "idempotency-key": IDEMPOTENCY_KEY,
      }),
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      from: `Project Buddy <${FROM_ADDRESS}>`,
      to: [MESSAGE.to],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
  });

  test("fails as our bug when Resend accepts without an id", async () => {
    const failure = await failureOf(resendAnswering(HTTP_STATUS.ok, {}));

    expect(failure.problem).toBe("our-bug");
  });

  test("fails as retryable when Resend can't be reached", async () => {
    const failure = await failureOf(
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError("fetch failed"))),
    );

    expect(failure.problem).toBe("retryable");
    expect(failure.cause).toBeInstanceOf(TypeError);
  });

  test("names EMAIL_FROM_ADDRESS, and calls no one, when it isn't set", async () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", undefined);
    const fetchFn = resendAnswering(HTTP_STATUS.ok, { id: "email-1" });

    const error: unknown = await sendEmail(MESSAGE, fetchFn).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(EmailFailure);
    expect(String(error)).toMatch(FROM_ADDRESS_NOT_SET);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("sendEmail sorting Resend's refusals", () => {
  test.each<[number, string, EmailProblem]>([
    [HTTP_STATUS.tooManyRequests, "rate_limit_exceeded", "retryable"],
    [HTTP_STATUS.internalServerError, "application_error", "retryable"],
    [SERVICE_UNAVAILABLE, "service_unavailable", "retryable"],
    [HTTP_STATUS.conflict, "concurrent_idempotent_requests", "retryable"],
    [HTTP_STATUS.tooManyRequests, "daily_quota_exceeded", "quota"],
    [HTTP_STATUS.tooManyRequests, "monthly_quota_exceeded", "quota"],
    [HTTP_STATUS.unauthorized, "missing_api_key", "configuration"],
    [HTTP_STATUS.forbidden, "invalid_api_key", "configuration"],
    [HTTP_STATUS.unauthorized, "restricted_api_key", "configuration"],
    [HTTP_STATUS.forbidden, "validation_error", "configuration"],
    [UNPROCESSABLE_CONTENT, "invalid_from_address", "configuration"],
    [HTTP_STATUS.badRequest, "validation_error", "our-bug"],
    [UNPROCESSABLE_CONTENT, "missing_required_field", "our-bug"],
    [UNPROCESSABLE_CONTENT, "invalid_parameter", "our-bug"],
    [HTTP_STATUS.conflict, "invalid_idempotent_request", "our-bug"],
    [HTTP_STATUS.badGateway, "unheard_of", "retryable"],
    [HTTP_STATUS.tooManyRequests, "unheard_of", "retryable"],
  ])("%i %s is %s", async (status, name, problem) => {
    const failure = await failureOf(
      resendAnswering(status, { statusCode: status, name, message: "No." }),
    );

    expect(failure.problem).toBe(problem);
    expect(failure.message).toBe(`Resend answered ${status} ${name}: No.`);
  });

  test("sorts an unreadable refusal by its status", async () => {
    const failure = await failureOf(
      resendAnswering(HTTP_STATUS.badRequest, "<html>Bad request</html>"),
    );

    expect(failure.problem).toBe("our-bug");
    expect(failure.message).toBe("Resend answered 400 unreadable: ");
  });

  test("logs a refusal without the address, the link or the idempotency key", async () => {
    const log = spyOnErrorLog();
    const failure = await failureOf(
      resendAnswering(HTTP_STATUS.badRequest, {
        name: "validation_error",
        message: `Invalid \`to\` field: ${MESSAGE.to}`,
      }),
    );

    logEmailFailure(failure.problem, "send login link", failure);

    const line = log.mock.calls[0]?.join(" ") ?? "";
    expect(line).toContain("Invalid `to` field: <to>");
    expect(line).not.toContain(MESSAGE.to);
    expect(line).not.toContain(TOKEN);
    expect(line).not.toContain(IDEMPOTENCY_KEY);
    expect(line).not.toContain(API_KEY);
  });
});
