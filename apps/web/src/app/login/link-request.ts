// What the sign-in and the sign-up forms' actions share: the email field's
// check, and asking for the link, turning a storage failure into an answer
// the form shows.
import { z } from "zod";
import {
  requestSignInLink,
  type SignInLinkRequest,
} from "@/accounts/sign-in-links.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { AppError } from "@/errors/app-error.ts";

// The longest address that mail can be delivered to (RFC 5321).
const MAX_EMAIL_LENGTH = 254;

// An address that looks deliverable, trimmed. Whatever else the form holds
// reads as an empty address, which this refuses.
const EMAIL_FIELD = z
  .string()
  .catch("")
  .transform((email) => email.trim())
  .pipe(z.email().max(MAX_EMAIL_LENGTH));

// The address she typed, as typed, to show again.
function typedEmail(formData: FormData): string {
  const email = formData.get("email");
  if (typeof email === "string") {
    return email;
  }
  return "";
}

// Takes the request for a sign-in link, and answers sent, or with the
// failure's case message if the request couldn't be counted.
async function answerLinkRequest(
  request: SignInLinkRequest,
  sentMessage: string,
): Promise<LinkRequestState> {
  try {
    await requestSignInLink(request);
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "error", message: error.message, email: request.email };
    }
    throw error;
  }
  return { kind: "sent", message: sentMessage, email: request.email };
}

export { answerLinkRequest, EMAIL_FIELD, typedEmail };
