"use client";

import { type JSX, useActionState } from "react";
import { TimeZoneField } from "@/components/time-zone-field.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { type SetTimeZoneState, setTimeZoneAction } from "./actions.ts";

const IDLE: SetTimeZoneState = { kind: "idle" };

// The form that changes the time zone whose midnight starts the user's
// quest days. It opens at the saved time zone, and says when it saved.
export function TimeZoneForm({
  saved,
  choices,
}: {
  readonly saved: string;
  readonly choices: readonly string[];
}): JSX.Element {
  const [state, formAction, pending] = useActionState(setTimeZoneAction, IDLE);
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  let status = "";
  if (state.kind === "saved") {
    status = ACCOUNT_COPY.timeZoneSaved;
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <TimeZoneField choices={choices} saved={saved} error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button aria-busy={pending} disabled={pending} type="submit">
          {ACCOUNT_COPY.saveTimeZone}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
