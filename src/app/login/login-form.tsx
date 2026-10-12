"use client";

import { type JSX, useActionState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { type LoginState, login } from "./actions.ts";

const initialState: LoginState = { kind: "idle" };

export function LoginForm(): JSX.Element {
  const [state, formAction, pending] = useActionState(login, initialState);
  let error: string | undefined;
  if (state.kind === "error") {
    error = state.message;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextField
        autoComplete="current-password"
        error={error}
        label={LOGIN_COPY.passphrase}
        name="passphrase"
        required={true}
        type="password"
      />
      <Button disabled={pending} type="submit">
        {LOGIN_COPY.unlock}
      </Button>
    </form>
  );
}
