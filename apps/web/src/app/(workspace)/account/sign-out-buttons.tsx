"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { signOutAction, signOutEverywhereAction } from "./actions.ts";

// Sign out, of this browser at once, and Sign out everywhere, once she
// confirms.
export function SignOutButtons(): JSX.Element {
  const everywhereFormRef = useRef<HTMLFormElement>(null);
  const signOutEverywhere = useCallback((): void => {
    everywhereFormRef.current?.requestSubmit();
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          {ACCOUNT_COPY.signOut}
        </Button>
      </form>
      <form action={signOutEverywhereAction} ref={everywhereFormRef}>
        <ConfirmDialog
          cancelLabel={ACCOUNT_COPY.stay}
          confirmLabel={ACCOUNT_COPY.signOutEverywhere}
          description={ACCOUNT_COPY.signOutEverywhereDescription}
          onConfirm={signOutEverywhere}
          title={ACCOUNT_COPY.signOutEverywhereTitle}
          trigger={
            <Button variant="secondary">
              {ACCOUNT_COPY.signOutEverywhere}
            </Button>
          }
        />
      </form>
    </div>
  );
}
