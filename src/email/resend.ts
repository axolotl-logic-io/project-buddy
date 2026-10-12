// Sending an email through Resend's HTTP API, with plain fetch. Each request
// carries the message's idempotency key, which Resend remembers for 24
// hours, so a repeated request sends no second email.
import { z } from "zod";
import { EmailFailure, type EmailProblem } from "@/email/email-failure.ts";
import { EMAIL_SENDER, type EmailMessage } from "@/email/email-message.ts";
import { HTTP_STATUS } from "@/http-status.ts";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
// Resend refuses a request without a User-Agent.
const USER_AGENT = "project-buddy";

// What Resend answers when it accepts an email, and when it refuses one.
const SENT = z.object({ id: z.string().min(1) });
const REFUSED = z.object({ name: z.string(), message: z.string() });

// Resend's error names, by problem. Anything else is sorted by its status.
const QUOTA_ERRORS: ReadonlySet<string> = new Set([
  "daily_quota_exceeded",
  "monthly_quota_exceeded",
]);
const RETRYABLE_ERRORS: ReadonlySet<string> = new Set([
  "rate_limit_exceeded",
  "application_error",
  "internal_server_error",
  "service_unavailable",
  "concurrent_idempotent_requests",
]);
const CONFIGURATION_ERRORS: ReadonlySet<string> = new Set([
  "missing_api_key",
  "invalid_api_key",
  "restricted_api_key",
  "suspended_api_key",
  "invalid_from_address",
]);

// What to do about Resend's refusal. A 403 `validation_error` means the
// sending domain isn't verified, so it is a configuration problem, unlike
// a 400 or 422 one.
function resendProblem(status: number, name: string): EmailProblem {
  if (QUOTA_ERRORS.has(name)) {
    return "quota";
  }
  if (RETRYABLE_ERRORS.has(name)) {
    return "retryable";
  }
  if (
    CONFIGURATION_ERRORS.has(name) ||
    status === HTTP_STATUS.unauthorized ||
    status === HTTP_STATUS.forbidden
  ) {
    return "configuration";
  }
  if (
    status === HTTP_STATUS.tooManyRequests ||
    status >= HTTP_STATUS.internalServerError
  ) {
    return "retryable";
  }
  return "our-bug";
}

// The failure that Resend's refusal stands for, its message without the
// recipient's address, which Resend may quote.
async function refusal(
  response: Response,
  message: EmailMessage,
): Promise<EmailFailure> {
  const body = REFUSED.safeParse(await response.json().catch(() => null));
  const name = body.data?.name ?? "unreadable";
  const said = (body.data?.message ?? "").replaceAll(message.to, "<to>");
  return new EmailFailure(
    `Resend answered ${response.status} ${name}: ${said}`,
    {
      problem: resendProblem(response.status, name),
    },
  );
}

// Sends the message from EMAIL_SENDER, with apiKey. Throws an EmailFailure
// when Resend can't be reached, refuses the email, or answers with
// something other than the email's id.
export async function sendWithResend(
  message: EmailMessage,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<void> {
  let response: Response;
  try {
    response = await fetchFn(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "user-agent": USER_AGENT,
        "idempotency-key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: EMAIL_SENDER,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
  } catch (error) {
    throw new EmailFailure("Resend could not be reached", {
      problem: "retryable",
      cause: error,
    });
  }
  if (!response.ok) {
    throw await refusal(response, message);
  }
  if (!SENT.safeParse(await response.json().catch(() => null)).success) {
    throw new EmailFailure(
      `Resend answered ${response.status} without the email's id`,
      { problem: "our-bug" },
    );
  }
}
