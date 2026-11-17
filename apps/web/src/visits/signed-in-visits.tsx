"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { recordVisitAction } from "@/visits/record-visit-action.ts";

// Mounted only in the signed-in header, keyed by account. A visible page
// entry, navigation, tab return or foreground interaction qualifies. There
// is no timer: leaving an idle page open cannot manufacture visiting days.
// The date here only suppresses duplicate traffic; the server dates and
// deduplicates every report. Failed reports can retry on the next event.
function SignedInVisits(): null {
  const pathname = usePathname();
  const { refresh } = useRouter();
  const reportedRef = useRef<string | undefined>(undefined);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/login/link"
    ) {
      return;
    }
    async function report(): Promise<void> {
      const date = new Date().toISOString().slice(0, 10);
      if (
        document.visibilityState !== "visible" ||
        pendingRef.current ||
        reportedRef.current === date
      ) {
        return;
      }
      pendingRef.current = true;
      try {
        const result = await recordVisitAction();
        if (result !== "unavailable") {
          reportedRef.current = date;
        }
        if (result === "added") {
          refresh();
        }
      } finally {
        pendingRef.current = false;
      }
    }
    function visit(): void {
      report().catch(() => undefined);
    }
    visit();
    document.addEventListener("visibilitychange", visit);
    document.addEventListener("pointerdown", visit);
    document.addEventListener("keydown", visit);
    window.addEventListener("focus", visit);
    window.addEventListener("pageshow", visit);
    return (): void => {
      document.removeEventListener("visibilitychange", visit);
      document.removeEventListener("pointerdown", visit);
      document.removeEventListener("keydown", visit);
      window.removeEventListener("focus", visit);
      window.removeEventListener("pageshow", visit);
    };
  }, [pathname, refresh]);

  return null;
}

export { SignedInVisits };
