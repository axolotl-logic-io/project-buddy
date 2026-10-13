"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  answerLinkRequest,
  EMAIL_FIELD,
  typedEmail,
} from "@/app/login/link-request.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import {
  checkSignUpInviteCode,
  type InviteCodeCheck,
} from "@/app/signup/invite-code.ts";
import { AppError } from "@/errors/app-error.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

// A missing or non-text invite code reads as an empty one, which never
// matches, so a malformed form counts as a wrong invite code.
const INVITE_CODE_FIELD = z.string().catch("");

// The invite code check's answer, or the AppError that stopped it.
async function tryInviteCode(
  inviteCode: string,
  requestHeaders: Headers,
): Promise<InviteCodeCheck | AppError> {
  try {
    return await checkSignUpInviteCode(inviteCode, requestHeaders);
  } catch (error) {
    if (error instanceof AppError) {
      return error;
    }
    throw error;
  }
}

// With the invite code, makes an account for the address unless it
// has one, then emails it a sign-in link, within the rate limits; answers
// "check your email" either way, so the answer reveals neither. Or says the
// address is not one, the invite code is wrong, the client is locked out,
// or why the request couldn't be taken. Checks the address first, so a
// mistyped address costs no attempt.
export async function signUpAction(
  _state: LinkRequestState,
  formData: FormData,
): Promise<LinkRequestState> {
  const typed = typedEmail(formData);
  const email = EMAIL_FIELD.safeParse(typed);
  if (!email.success) {
    return {
      kind: "invalid",
      field: "email",
      message: SIGNUP_COPY.needsEmail,
      email: typed,
    };
  }
  const requestHeaders = await headers();
  const check = await tryInviteCode(
    INVITE_CODE_FIELD.parse(formData.get("inviteCode")),
    requestHeaders,
  );
  if (check instanceof AppError) {
    return { kind: "error", message: check.message, email: typed };
  }
  switch (check) {
    case "right":
      return answerLinkRequest(
        { email: email.data, createAccount: true, requestHeaders },
        SIGNUP_COPY.checkEmail,
      );
    case "wrong":
      return {
        kind: "invalid",
        field: "inviteCode",
        message: SIGNUP_COPY.wrongInviteCode,
        email: typed,
      };
    case "locked-out":
      return { kind: "error", message: SIGNUP_COPY.lockedOut, email: typed };
    default:
      return check satisfies never;
  }
}
