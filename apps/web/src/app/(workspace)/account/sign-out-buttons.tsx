"use client";

import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import {
  readThisBrowserEndpoint,
  unsubscribeThisBrowser,
} from "@/push/push-device.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { signOutAction, signOutEverywhereAction } from "./actions.ts";
import { PUSH_ENDPOINT_FIELD } from "./sign-out-form.ts";

// Unsubscribes this browser from push as a sign-out form submits. The
// Server Action deletes the subscription anyway, with or without
// JavaScript, so this need not finish first.
function unsubscribeOnSignOut(): void {
  unsubscribeThisBrowser().catch(() => undefined);
}

// Sign out, of this browser at once, and Sign out everywhere, once she
// confirms. Either stops notifications to this browser. Sign out also
// sends this browser's push endpoint, once the page has read it, so the
// server can find the subscription without the browser's cookie.
export function SignOutButtons(): JSX.Element {
  const everywhereFormRef = useRef<HTMLFormElement>(null);
  const [endpoint, setEndpoint] = useState("");
  useEffect(() => {
    let current = true;
    readThisBrowserEndpoint().then(
      (read) => {
        if (current && read !== undefined) {
          setEndpoint(read);
        }
      },
      () => undefined,
    );
    return (): void => {
      current = false;
    };
  }, []);
  const signOutEverywhere = useCallback((): void => {
    everywhereFormRef.current?.requestSubmit();
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <form action={signOutAction} onSubmit={unsubscribeOnSignOut}>
        <input name={PUSH_ENDPOINT_FIELD} type="hidden" value={endpoint} />
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
