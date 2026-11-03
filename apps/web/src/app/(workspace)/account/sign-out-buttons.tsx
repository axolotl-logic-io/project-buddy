"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { unsubscribeThisBrowser } from "@/push/push-device.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { signOutAction, signOutEverywhereAction } from "./actions.ts";

// Unsubscribes this browser from push as a sign-out form submits. The
// Server Action deletes the subscription anyway, with or without
// JavaScript, so this need not finish first.
function unsubscribeOnSignOut(): void {
  unsubscribeThisBrowser().catch(() => undefined);
}

// Sign out, of this browser at once, and Sign out everywhere, once she
// confirms. Either stops notifications to this browser.
export function SignOutButtons(): JSX.Element {
  const everywhereFormRef = useRef<HTMLFormElement>(null);
  const signOutEverywhere = useCallback((): void => {
    everywhereFormRef.current?.requestSubmit();
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <form action={signOutAction} onSubmit={unsubscribeOnSignOut}>
        <Button type="submit" variant="secondary">
          {ACCOUNT_COPY.signOut}
        </Button>
      </form>
      <form
        action={signOutEverywhereAction}
        onSubmit={unsubscribeOnSignOut}
        ref={everywhereFormRef}
      >
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
