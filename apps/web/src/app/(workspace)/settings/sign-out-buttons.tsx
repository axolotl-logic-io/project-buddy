"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { signOutAction, signOutEverywhereAction } from "./actions.ts";

// Sign out of this browser, or confirm ending every session.
export function SignOutButtons(): JSX.Element {
  const everywhereFormRef = useRef<HTMLFormElement>(null);
  const signOutEverywhere = useCallback((): void => {
    everywhereFormRef.current?.requestSubmit();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          {ACCOUNT_COPY.signOut}
        </Button>
      </form>
      <div className="ornamented-divider" aria-hidden="true">
        <span className="ornament" data-ornament="divider" />
      </div>
      <p className="text-muted">{ACCOUNT_COPY.signOutEverywhereDescription}</p>
      <form action={signOutEverywhereAction} ref={everywhereFormRef}>
        <noscript>
          <Button type="submit" variant="danger">
            {ACCOUNT_COPY.signOutEverywhere}
          </Button>
        </noscript>
        <ConfirmDialog
          cancelLabel={ACCOUNT_COPY.stay}
          confirmLabel={ACCOUNT_COPY.signOutEverywhere}
          description={ACCOUNT_COPY.signOutEverywhereDescription}
          onConfirm={signOutEverywhere}
          title={ACCOUNT_COPY.signOutEverywhereTitle}
          trigger={
            <Button variant="danger">{ACCOUNT_COPY.signOutEverywhere}</Button>
          }
        />
      </form>
    </div>
  );
}
