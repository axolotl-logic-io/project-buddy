"use client";

import { type JSX, useActionState } from "react";
import { IDLE, type LinkRequestState } from "@/app/login/link-request-state.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";

interface LinkRequestFormWords {
  readonly emailLabel: string;
  readonly send: string;
  readonly sending: string;
  // The invite code field's label, on the sign-up form only.
  readonly inviteCodeLabel?: string;
}

// The error the form's last answer found in field, if any.
function fieldError(
  state: LinkRequestState,
  field: "email" | "inviteCode",
): string | undefined {
  if (state.kind === "invalid" && state.field === field) {
    return state.message;
  }
  return undefined;
}

// The address to show again: React clears the form once the action ends.
function emailToShow(state: LinkRequestState): string {
  if (state.kind === "idle") {
    return "";
  }
  return state.email;
}

// What the status line says: that the request is on its way, then, once
// taken, to check her email.
function statusOf(
  state: LinkRequestState,
  pending: boolean,
  sending: string,
): string {
  if (pending) {
    return sending;
  }
  if (state.kind === "sent") {
    return state.message;
  }
  return "";
}

// The form that asks for a sign-in link, by email address alone on the
// sign-in page, and with the invite code on the sign-up page.
export function LinkRequestForm({
  action,
  words,
}: {
  readonly action: (
    state: LinkRequestState,
    formData: FormData,
  ) => Promise<LinkRequestState>;
  readonly words: LinkRequestFormWords;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {words.inviteCodeLabel !== undefined && (
        <TextField
          autoComplete="off"
          error={fieldError(state, "inviteCode")}
          label={words.inviteCodeLabel}
          name="inviteCode"
          required={true}
          type="password"
        />
      )}
      <TextField
        autoComplete="email"
        defaultValue={emailToShow(state)}
        error={fieldError(state, "email")}
        label={words.emailLabel}
        name="email"
        required={true}
        type="email"
      />
      {state.kind === "error" && <Alert>{state.message}</Alert>}
      <Button disabled={pending} type="submit">
        {words.send}
      </Button>
      <FormStatus>{statusOf(state, pending, words.sending)}</FormStatus>
    </form>
  );
}
