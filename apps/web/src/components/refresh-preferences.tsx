"use client";

import { usePathname } from "next/navigation";
import { type JSX, useEffect } from "react";
import { refreshPreferencesAction } from "@/accounts/refresh-preferences-action.ts";
import {
  applyHiddenFlags,
  readAppliedHide,
  subscribeToFlags,
} from "@/flags/flag-choice.ts";

function keepApplied(): void {
  // Leave the interface consistent with its last applied preferences.
}

// Navigation and returning to the tab refresh account preferences together.
// Switches read the applied attributes, so they cannot report unapplied extras.
function PreferenceRefresh(): null {
  useEffect(() => {
    let current = true;
    let revision = 0;
    let requested = 0;
    const unsubscribe = subscribeToFlags(() => {
      revision += 1;
    });
    async function refresh(): Promise<void> {
      const before = readAppliedHide();
      const appliedRevision = revision;
      requested += 1;
      const requestNumber = requested;
      try {
        const hidden = await refreshPreferencesAction();
        if (
          current &&
          requestNumber === requested &&
          revision === appliedRevision &&
          hidden !== undefined &&
          before === readAppliedHide()
        ) {
          applyHiddenFlags(hidden);
        }
      } catch {
        // Keep the applied choice if the account cannot be reached.
      }
    }
    function returned(): void {
      if (document.visibilityState === "visible") {
        refresh().catch(keepApplied);
      }
    }
    refresh().catch(keepApplied);
    document.addEventListener("visibilitychange", returned);
    return (): void => {
      current = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", returned);
    };
  }, []);
  return null;
}

function RefreshPreferences(): JSX.Element {
  const pathname = usePathname();
  return <PreferenceRefresh key={pathname} />;
}

export { RefreshPreferences };
