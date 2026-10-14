"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useState,
} from "react";
import { USER_NAME_MAX_LENGTH } from "@/accounts/user-name.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { type SetNameState, setNameAction } from "./actions.ts";

const IDLE: SetNameState = { kind: "idle" };

const NAME_HEADING_ID = "name-heading";

// Her form to give the tutor her name, which a buddy's {{name}} stands
// for. Her text stays in the field whatever the action answers, so a refused
// name can be fixed; an empty field clears her name. When the page brings a
// new name, a field she hasn't changed shows it.
export function NameForm({
  name,
}: {
  readonly name: string | undefined;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(setNameAction, IDLE);
  const [shown, setShown] = useState(name);
  const [draft, setDraft] = useState(name ?? "");
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );

  if (name !== shown) {
    setShown(name);
    if (draft === (shown ?? "")) {
      setDraft(name ?? "");
    }
  }

  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  let status = "";
  if (state.kind === "saved") {
    status = ACCOUNT_COPY.nameSaved;
  }

  return (
    <section aria-labelledby={NAME_HEADING_ID} className="panel">
      <h2 className="section-heading" id={NAME_HEADING_ID}>
        {ACCOUNT_COPY.nameHeading}
      </h2>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <TextField
          error={error}
          hint={ACCOUNT_COPY.nameHint}
          label={ACCOUNT_COPY.nameLabel}
          maxLength={USER_NAME_MAX_LENGTH}
          name="name"
          onChange={updateDraft}
          type="text"
          value={draft}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} type="submit">
            {ACCOUNT_COPY.saveName}
          </Button>
          <FormStatus>{status}</FormStatus>
        </div>
      </form>
    </section>
  );
}
