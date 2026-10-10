"use client";

import { type JSX, useActionState, useId } from "react";
import { COPY } from "@/ui/copy.ts";
import { type LoginState, login } from "./actions.ts";

const initialState: LoginState = {};

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
      {state.error !== undefined && (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-primary px-3 py-2 font-medium text-on-primary disabled:opacity-50"
      >
        {COPY.login.unlock}
      </button>
    </form>
  );
}
