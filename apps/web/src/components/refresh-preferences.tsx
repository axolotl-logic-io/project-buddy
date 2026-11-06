"use client";

import { usePathname, useRouter } from "next/navigation";
import { type JSX, useEffect } from "react";
import { refreshPreferencesAction } from "@/accounts/refresh-preferences-action.ts";
import { applyHiddenFlags, readAppliedHide } from "@/flags/flag-choice.ts";

function keepApplied(): void {
  // Leave the interface consistent with its last applied preferences.
}

// Navigation and returning to the tab refresh account preferences together.
// Switches read the applied attributes, so they cannot report unapplied extras.
function PreferenceRefresh(): null {
  const router = useRouter();
  useEffect(() => {
    let current = true;
    async function refresh(): Promise<void> {
      const before = readAppliedHide();
      try {
        const hidden = await refreshPreferencesAction();
        if (current && hidden !== undefined && before === readAppliedHide()) {
          applyHiddenFlags(hidden);
          router.refresh();
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
      document.removeEventListener("visibilitychange", returned);
    };
  }, [router]);
  return null;
}

function RefreshPreferences(): JSX.Element {
  const pathname = usePathname();
  return <PreferenceRefresh key={pathname} />;
}

export { RefreshPreferences };
