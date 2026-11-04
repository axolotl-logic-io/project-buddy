"use client";

import { type JSX, type ReactNode, useActionState } from "react";
import { IDLE, type LinkRequestState } from "@/app/login/link-request-state.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";

interface LinkRequestFormWords {
  readonly emailLabel: string;
  readonly send: string;
  readonly sending: string;
}

// The error the form's last answer found in field, if any.
function fieldError(state: LinkRequestState): string | undefined {
  if (state.kind === "invalid") {
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

// An email-only request form, for public sign-in, admin invitations or
// project invitations. children are what else the request carries, such as
// hidden inputs.
export function LinkRequestForm({
  action,
  words,
  children,
  clearOnSent,
}: {
  readonly action: (
    state: LinkRequestState,
    formData: FormData,
  ) => Promise<LinkRequestState>;
  readonly words: LinkRequestFormWords;
  readonly children?: ReactNode;
  readonly clearOnSent?: boolean;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(action, IDLE);
  let email = emailToShow(state);
  if (clearOnSent === true && state.kind === "sent") {
    email = "";
  }
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {children}
      <TextField
        autoComplete="email"
        defaultValue={email}
        error={fieldError(state)}
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
