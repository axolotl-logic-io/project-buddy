"use client";

import { type JSX, useActionState, useId } from "react";
import { COPY } from "@/ui/copy.ts";
import { type LoginState, login } from "./actions.ts";

const initialState: LoginState = { kind: "idle" };

export function LoginForm(): JSX.Element {
  const [state, formAction, pending] = useActionState(login, initialState);
  const passphraseId = useId();

  return (
    <form action={formAction} className="flex w-full max-w-xs flex-col gap-3">
      <label htmlFor={passphraseId} className="font-medium text-sm">
        {COPY.login.passphrase}
      </label>
      <input
        id={passphraseId}
        name="passphrase"
        type="password"
        autoComplete="current-password"
        required={true}
        className="rounded border border-line bg-field px-3 py-2"
      />
      {state.kind === "error" && (
        <p role="alert" className="error-text">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="button-primary font-medium"
      >
        {COPY.login.unlock}
      </button>
    </form>
  );
}
