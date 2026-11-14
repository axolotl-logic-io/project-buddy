"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useState,
} from "react";
import { USER_NAME_MAX_LENGTH } from "@/accounts/user-name.ts";
import {
  type ContinueSignInState,
  continueSignInAction,
} from "@/app/login/link/actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { SIGN_IN_DESTINATION_PARAMETER } from "@/routes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";

const IDLE: ContinueSignInState = { kind: "idle" };
function continueSignIn(
  _previous: ContinueSignInState,
  form: FormData,
): Promise<ContinueSignInState> {
  return continueSignInAction(form);
}
function ContinueForm({
  token,
  destination,
  signup,
}: {
  readonly token: string;
  readonly destination: string | undefined;
  readonly signup: boolean;
}): JSX.Element {
  const [name, setName] = useState("");
  const changeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setName(event.currentTarget.value);
    },
    [],
  );
  const [state, action, pending] = useActionState(continueSignIn, IDLE);
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="token" type="hidden" value={token} />
      {destination !== undefined && (
        <input
          name={SIGN_IN_DESTINATION_PARAMETER}
          type="hidden"
          value={destination}
        />
      )}
      {signup === true && (
        <TextField
          label={ACCOUNT_COPY.nameLabel}
          name="name"
          value={name}
          onChange={changeName}
          autoComplete="name"
          required={true}
          maxLength={USER_NAME_MAX_LENGTH}
          error={error}
        />
      )}
      <Button type="submit" disabled={pending}>
        {LINK_PAGE_COPY.continue}
      </Button>
    </form>
  );
}

export { ContinueForm };
